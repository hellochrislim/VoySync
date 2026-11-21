import sqlite3 from 'sqlite3';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';

export const defaultDatabasePath = fileURLToPath(new URL('./voysync.db', import.meta.url));

// Promise wrappers keep SQL examples readable while using the requested sqlite3 driver.
export async function openDatabase(filename = defaultDatabasePath, { seed = true } = {}) {
  if (filename !== ':memory:') await mkdir(dirname(resolve(filename)), { recursive: true });
  const connection = await new Promise((resolveOpen, reject) => {
    const handle = new sqlite3.Database(filename, error => error ? reject(error) : resolveOpen(handle));
  });
  const raw = {
    run(sql, params = []) {
      return new Promise((resolveRun, reject) => connection.run(sql, params, function (error) {
        if (error) reject(error);
        else resolveRun({ lastID: this.lastID, changes: this.changes });
      }));
    },
    get(sql, params = []) {
      return new Promise((resolveGet, reject) => connection.get(sql, params, (error, row) => error ? reject(error) : resolveGet(row)));
    },
    all(sql, params = []) {
      return new Promise((resolveAll, reject) => connection.all(sql, params, (error, rows) => error ? reject(error) : resolveAll(rows)));
    },
    exec(sql) {
      return new Promise((resolveExec, reject) => connection.exec(sql, error => error ? reject(error) : resolveExec()));
    },
    close() {
      return new Promise((resolveClose, reject) => connection.close(error => error ? reject(error) : resolveClose()));
    },
  };

  // Queue every outside operation. Reads must also wait: they share this SQLite
  // connection and would otherwise see another request's uncommitted changes.
  const context = new AsyncLocalStorage();
  const transactionToken = {};
  let pending = Promise.resolve();
  const schedule = action => {
    if (context.getStore() === transactionToken) return action();
    const result = pending.then(action);
    pending = result.catch(() => {});
    return result;
  };
  const db = Object.fromEntries(Object.entries(raw).map(([name, operation]) => [
    name, (...args) => schedule(() => operation(...args)),
  ]));
  db.transaction = action => schedule(() => context.run(transactionToken, async () => {
      await raw.exec('BEGIN IMMEDIATE');
      try {
        const value = await action();
        await raw.exec('COMMIT');
        return value;
      } catch (error) {
        await raw.exec('ROLLBACK');
        throw error;
      }
    }));

  try {
    await db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

    const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
    await db.transaction(async () => {
      const columns = await db.all('PRAGMA table_info(ITINERARY_ITEM)');
      const existing = columns.length > 0;
      const migrate = existing && !columns.some(column => column.name === 'place_id');
      if (migrate) {
        // Rebuild inside this transaction so existing IDs and activities survive the nullable-date change.
        await db.exec(`DROP TRIGGER IF EXISTS itinerary_dates_insert;
          DROP TRIGGER IF EXISTS itinerary_dates_update; DROP TRIGGER IF EXISTS trip_dates_update;
          DROP INDEX IF EXISTS idx_itinerary_trip_schedule;
          ALTER TABLE ITINERARY_ITEM RENAME TO legacy_itinerary;`);
      }
      await db.exec(schema);
      if (migrate) await db.exec(`INSERT INTO ITINERARY_ITEM
        (item_id,trip_id,activity_name,scheduled_datetime,location,notes)
        SELECT item_id,trip_id,activity_name,scheduled_datetime,location,notes FROM legacy_itinerary;
        DROP TABLE legacy_itinerary;`);
      if (!existing && seed) await db.exec(await readFile(new URL('./seed.sql', import.meta.url), 'utf8'));
      if (migrate || (!existing && seed)) await db.exec(await readFile(new URL('./places.sql', import.meta.url), 'utf8'));
    });
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}
