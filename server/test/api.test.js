import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../app.js';
import { openDatabase } from '../db/database.js';

async function setup(t, { seed = true } = {}) {
  const db = await openDatabase(':memory:', { seed });
  const server = createApp(db).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await db.close();
  });
  const request = async (method, path, body) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
  return { db, request };
}

const tripInput = { user_id: 1, destination_id: 1, start_date: '2026-12-10', end_date: '2026-12-16', planned_budget_cents: 125050 };

test('seeded resources, health, filtering and integer-cent CRUD', async t => {
  const { request } = await setup(t);
  assert.deepEqual(await request('GET', '/health'), { status: 200, body: { status: 'ok' } });
  const trips = await request('GET', '/trips?user_id=1');
  assert.equal(trips.body.length, 2);
  assert.ok(trips.body.every(row => row.user_id === 1));
  const created = await request('POST', '/trips', tripInput);
  assert.equal(created.status, 201);
  assert.equal(created.body.planned_budget_cents, 125050);
  assert.equal(created.body.status, 'planning');
  assert.equal(created.body.destination_name, 'Tokyo');
  const updated = await request('PUT', `/trips/${created.body.trip_id}`, { planned_budget_cents: 125051 });
  assert.equal(updated.body.planned_budget_cents, 125051);
  const fractional = await request('PUT', `/trips/${created.body.trip_id}`, { planned_budget_cents: 12.5 });
  assert.equal(fractional.status, 400);
  const user = await request('POST', '/users', { name: 'Test Traveler', email: 'traveler@example.com' });
  assert.equal(user.status, 201);
  assert.equal((await request('DELETE', `/users/${user.body.user_id}`)).status, 204);
  assert.equal((await request('GET', `/users/${user.body.user_id}`)).status, 404);
});

test('validates email, birth dates, real calendar dates and links', async t => {
  const { request } = await setup(t);
  assert.equal((await request('POST', '/users', { name: 'Test', email: 'not-an-email' })).status, 400);
  assert.equal((await request('POST', '/users', { name: 'Test', email: 'future@example.com', date_of_birth: '2999-01-01' })).status, 400);
  assert.equal((await request('POST', '/users', { name: 'Duplicate', email: 'ALEX@EXAMPLE.COM' })).status, 409);
  assert.equal((await request('POST', '/trips', { ...tripInput, start_date: '2026-02-30' })).status, 400);
  assert.equal((await request('POST', '/trips', { ...tripInput, user_id: 99999 })).status, 409);
  assert.equal((await request('DELETE', '/users/1')).status, 409);
  assert.equal((await request('DELETE', '/countries/JP')).status, 409);
  assert.equal((await request('GET', '/trips?user_id=1%20OR%201=1')).status, 400);
});

test('database itself enforces strict money, foreign keys and impossible dates', async t => {
  const { db } = await setup(t);
  assert.equal((await db.get('PRAGMA foreign_keys')).foreign_keys, 1);
  assert.ok((await db.all("SELECT name FROM pragma_table_list WHERE schema = 'main' AND strict = 1")).length >= 6);
  await assert.rejects(db.run("UPDATE TRIP SET planned_budget_cents = 10.5 WHERE trip_id = 1"));
  await assert.rejects(db.run("UPDATE TRIP SET start_date = '2026-02-30' WHERE trip_id = 1"));
  await assert.rejects(db.run("DELETE FROM DESTINATION WHERE destination_id = 1"));
});

test('itinerary triggers reject out-of-trip activities and excluding trip edits', async t => {
  const { request } = await setup(t);
  const activity = { trip_id: 1, activity_name: 'Walk', scheduled_datetime: '2026-12-17 10:00:00', location: 'Tokyo' };
  assert.equal((await request('POST', '/itinerary', activity)).status, 409);
  assert.equal((await request('PUT', '/itinerary/1', { scheduled_datetime: '2026-12-09 10:00:00' })).status, 409);
  assert.equal((await request('PUT', '/trips/1', { end_date: '2026-12-11' })).status, 409);
  const valid = await request('POST', '/itinerary', { ...activity, scheduled_datetime: '2026-12-16 23:59:59' });
  assert.equal(valid.status, 201);
  assert.equal(valid.body.scheduled_datetime, '2026-12-16 23:59:59');
  assert.equal((await request('POST', '/itinerary', { ...activity, scheduled_datetime: '2026-12-12 24:00:00' })).status, 400);
});

test('trip plus initial itinerary creation rolls back entirely on failure', async t => {
  const { db, request } = await setup(t);
  const before = await db.get('SELECT COUNT(*) AS count FROM TRIP');
  const result = await request('POST', '/trips', {
    ...tripInput,
    itinerary_items: [
      { activity_name: 'Valid activity', scheduled_datetime: '2026-12-12 09:00:00', location: 'Tokyo' },
      { activity_name: 'Invalid activity', scheduled_datetime: '2026-12-20 09:00:00', location: 'Tokyo' },
    ],
  });
  assert.equal(result.status, 409);
  assert.deepEqual(await db.get('SELECT COUNT(*) AS count FROM TRIP'), before);
  assert.equal((await db.get("SELECT COUNT(*) AS count FROM ITINERARY_ITEM WHERE activity_name = 'Valid activity'")).count, 0);
  const valid = await request('POST', '/trips', {
    ...tripInput,
    itinerary_items: [{ activity_name: 'Atomic activity', scheduled_datetime: '2026-12-10 09:00:00', location: 'Tokyo' }],
  });
  assert.equal(valid.status, 201);
  assert.equal((await request('GET', `/itinerary?trip_id=${valid.body.trip_id}`)).body.length, 1);
});

test('cancellation retains children, purge cascades, and terminal states cannot reopen', async t => {
  const { request } = await setup(t);
  assert.equal((await request('DELETE', '/trips/1')).status, 409);
  assert.equal((await request('PUT', '/trips/1', { status: 'completed' })).status, 409);
  assert.equal((await request('PUT', '/trips/1', { status: 'cancelled' })).status, 200);
  assert.equal((await request('GET', '/bookings?trip_id=1')).body.length, 2);
  assert.equal((await request('PUT', '/trips/1', { status: 'planning' })).status, 409);
  assert.equal((await request('DELETE', '/trips/1')).status, 204);
  assert.deepEqual((await request('GET', '/bookings?trip_id=1')).body, []);
  assert.deepEqual((await request('GET', '/itinerary?trip_id=1')).body, []);
  assert.equal((await request('GET', '/users/1')).status, 200);
  assert.equal((await request('GET', '/destinations/1')).status, 200);
  assert.equal((await request('PUT', '/bookings/5', { status: 'pending' })).status, 409);
});

test('reports implement filtering, independent counts, retained-history coverage and strict ALL comparison', async t => {
  const { request, db } = await setup(t);
  const destinations = (await request('GET', '/destinations')).body;
  assert.deepEqual(destinations.map(row => row.destination_id), [2, 5, 4, 1, 3]);
  const promotions = (await request('GET', '/reports/promotions?region=Asia&country_code=FR&as_of=2026-11-06')).body;
  assert.deepEqual(promotions.map(row => row.user_id), [1, 2]);
  assert.deepEqual((await request('GET', '/reports/promotions?region=Asia&as_of=2028-01-01')).body, []);
  assert.deepEqual((await request('GET', '/reports/promotions')).body, []);
  const rewards = (await request('GET', '/reports/rewards')).body;
  assert.equal(rewards.length, 1);
  assert.equal(rewards[0].trip_count, 2);
  assert.equal(rewards[0].booking_count, 3);
  assert.deepEqual((await request('GET', '/reports/undiscovered')).body.map(row => row.destination_id), [5]);
  await request('PUT', '/trips/1', { status: 'cancelled' });
  assert.ok(!(await request('GET', '/reports/undiscovered')).body.some(row => row.destination_id === 1));
  await request('DELETE', '/trips/1');
  assert.ok((await request('GET', '/reports/undiscovered')).body.some(row => row.destination_id === 1));
  const equality = await request('POST', '/trips', { ...tripInput, planned_budget_cents: 240000 });
  const audit = (await request('GET', '/reports/high-budget')).body;
  assert.ok(audit.some(row => row.trip_id === 3));
  assert.ok(!audit.some(row => row.trip_id === equality.body.trip_id));
  const dashboard = (await request('GET', '/dashboard')).body;
  const sums = await db.get("SELECT SUM(b.cost_cents) AS total FROM BOOKING b JOIN TRIP t ON t.trip_id = b.trip_id WHERE b.status <> 'cancelled' AND t.status <> 'cancelled'");
  assert.equal(dashboard.booking_cost_cents, sums.total);
});

test('file database initialization preserves edits and does not duplicate seeds', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'voysync-test-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const filename = join(folder, 'database.db');
  let db = await openDatabase(filename);
  await db.run("UPDATE USER_PROFILE SET name = 'Persisted Name' WHERE user_id = 1");
  await db.close();
  db = await openDatabase(filename);
  assert.equal((await db.get('SELECT name FROM USER_PROFILE WHERE user_id = 1')).name, 'Persisted Name');
  assert.equal((await db.get('SELECT COUNT(*) AS count FROM USER_PROFILE')).count, 3);
  await db.close();
});

test('concurrent readers never observe a transaction that later rolls back', async t => {
  const { db } = await setup(t);
  let markInserted;
  let release;
  const inserted = new Promise(resolve => { markInserted = resolve; });
  const hold = new Promise(resolve => { release = resolve; });
  const failedWrite = db.transaction(async () => {
    await db.run("INSERT INTO USER_PROFILE (name, email) VALUES ('Uncommitted', 'uncommitted@example.com')");
    markInserted();
    await hold;
    throw new Error('Deliberate rollback');
  });
  // Register the rejection immediately so the deliberate failure is handled.
  const rollback = assert.rejects(failedWrite, /Deliberate rollback/);
  await inserted;
  let readFinished = false;
  const read = db.get("SELECT COUNT(*) AS count FROM USER_PROFILE WHERE email = 'uncommitted@example.com'");
  read.then(() => { readFinished = true; });
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(readFinished, false);
  } finally {
    release();
  }
  await rollback;
  assert.equal((await read).count, 0);
});

test('saved places keep their identity when scheduled and enforce destination and date rules', async t => {
  const {request}=await setup(t);
  const places=(await request('GET','/places?destination_id=1')).body;
  const saved=await request('POST','/itinerary',{trip_id:1,place_id:places[0].place_id,activity_name:places[0].name,location:'Tokyo'});
  assert.equal(saved.status,201);
  const url='/itinerary/'+saved.body.item_id;
  assert.equal((await request('PUT',url,{scheduled_datetime:'2026-12-11'})).body.item_id,saved.body.item_id);
  assert.equal((await request('PUT',url,{scheduled_datetime:'2026-12-25'})).status,409);
  assert.equal((await request('PUT',url,{trip_id:2})).status,409);
  assert.equal((await request('PUT',url,{scheduled_datetime:null})).body.scheduled_datetime,null);
});
