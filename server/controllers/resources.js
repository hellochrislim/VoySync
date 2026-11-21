import { HttpError, validateRecord } from './validation.js';

const tripSelect = `SELECT t.*, u.name AS user_name, d.name AS destination_name,
  c.country_name, c.region,
  (SELECT activity_name FROM ITINERARY_ITEM i WHERE i.trip_id=t.trip_id AND i.scheduled_datetime IS NOT NULL ORDER BY scheduled_datetime,item_id LIMIT 1) AS first_stop,
  COALESCE((SELECT SUM(b.cost_cents) FROM BOOKING b
    WHERE b.trip_id = t.trip_id AND b.status <> 'cancelled'), 0) AS booking_cost_cents
  FROM TRIP t JOIN USER_PROFILE u ON u.user_id = t.user_id
  JOIN DESTINATION d ON d.destination_id = t.destination_id
  JOIN COUNTRY c ON c.country_code = d.country_code`;

// Only these hard-coded identifiers are ever interpolated into SQL.
export const resources = {
  users: {
    table: 'USER_PROFILE', id: 'user_id', alias: 'u',
    fields: ['name', 'email', 'gender', 'date_of_birth', 'preferred_travel_style'],
    defaults: { gender: null, date_of_birth: null, preferred_travel_style: null },
    select: 'SELECT u.* FROM USER_PROFILE u', order: 'u.name, u.user_id',
  },
  countries: {
    table: 'COUNTRY', id: 'country_code', alias: 'c',
    fields: ['country_code', 'country_name', 'region'], defaults: {},
    select: 'SELECT c.* FROM COUNTRY c', order: 'c.country_name',
  },
  destinations: {
    table: 'DESTINATION', id: 'destination_id', alias: 'd',
    fields: ['name', 'country_code', 'estimated_base_cost_cents', 'popularity_rating'], defaults: {},
    select: `SELECT d.*, c.country_name, c.region FROM DESTINATION d
      JOIN COUNTRY c ON c.country_code = d.country_code`,
    order: 'd.estimated_base_cost_cents ASC, c.region ASC, d.popularity_rating DESC, d.destination_id ASC',
  },
  trips: {
    table: 'TRIP', id: 'trip_id', alias: 't',
    fields: ['user_id', 'destination_id', 'start_date', 'end_date', 'planned_budget_cents', 'status'],
    defaults: { status: 'planning' }, select: tripSelect, order: 't.start_date DESC, t.trip_id DESC', filter: 'user_id',
  },
  bookings: {
    table: 'BOOKING', id: 'booking_id', alias: 'b',
    fields: ['trip_id', 'provider', 'booking_type', 'reference_code', 'cost_cents', 'status'],
    defaults: { status: 'pending' },
    select: `SELECT b.*, d.name AS destination_name FROM BOOKING b
      JOIN TRIP t ON t.trip_id = b.trip_id JOIN DESTINATION d ON d.destination_id = t.destination_id`,
    order: 'b.booking_id DESC', filter: 'trip_id',
  },
  itinerary: {
    table: 'ITINERARY_ITEM', id: 'item_id', alias: 'i',
    fields: ['trip_id', 'activity_name', 'scheduled_datetime', 'location', 'notes', 'place_id'], defaults: { notes: null, scheduled_datetime: null, place_id: null },
    select: `SELECT i.*, d.name AS destination_name FROM ITINERARY_ITEM i
      JOIN TRIP t ON t.trip_id = i.trip_id JOIN DESTINATION d ON d.destination_id = t.destination_id`,
    order: 'i.scheduled_datetime, i.item_id', filter: 'trip_id',
  },
};

function parseId(value, config) {
  if (config.id === 'country_code') {
    if (!/^[A-Z]{2}$/.test(value)) throw new HttpError(400, 'Country code must be two uppercase letters.');
    return value;
  }
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new HttpError(400, 'ID must be a positive whole number.');
  return Number(value);
}

function baseRecord(config, body, previous = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Send a JSON object.');
  return Object.fromEntries(config.fields.map(field => [field,
    Object.hasOwn(body, field) ? body[field] : (previous[field] ?? config.defaults[field]),
  ]));
}

export function resourceController(db, resource) {
  const config = resources[resource];
  const find = id => db.get(`${config.select} WHERE ${config.alias}.${config.id} = ?`, [id]);
  const load = async id => {
    const row = await find(id);
    if (!row) throw new HttpError(404, 'Record not found.');
    return row;
  };
  const insert = async data => {
    const result = await db.run(`INSERT INTO ${config.table} (${config.fields.join(', ')})
      VALUES (${config.fields.map(() => '?').join(', ')})`, config.fields.map(field => data[field] ?? null));
    return config.id === 'country_code' ? data.country_code : result.lastID;
  };
  return {
    async list(req, res) {
      const params = [];
      let where = '';
      if (config.filter && req.query[config.filter] !== undefined && req.query[config.filter] !== '') {
        params.push(parseId(String(req.query[config.filter]), { id: config.filter }));
        where = ` WHERE ${config.alias}.${config.filter} = ?`;
      }
      res.json(await db.all(`${config.select}${where} ORDER BY ${config.order}`, params));
    },
    async get(req, res) {
      res.json(await load(parseId(req.params.id, config)));
    },
    async create(req, res) {
      const data = baseRecord(config, req.body);
      validateRecord(resource, data);
      const created = await db.transaction(async () => {
        const newId = await insert(data);
        // Optional initial itinerary demonstrates the report's atomic trip creation.
        if (resource === 'trips' && req.body.itinerary_items !== undefined) {
          if (!Array.isArray(req.body.itinerary_items)) throw new HttpError(400, 'itinerary_items must be an array.');
          for (const initial of req.body.itinerary_items) {
            const item = baseRecord(resources.itinerary, { ...initial, trip_id: newId });
            validateRecord('itinerary', item);
            const fields = resources.itinerary.fields;
            await db.run(`INSERT INTO ITINERARY_ITEM (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`, fields.map(field => item[field] ?? null));
          }
        }
        return find(newId);
      });
      res.status(201).json(created);
    },
    async update(req, res) {
      const id = parseId(req.params.id, config);
      const updated = await db.transaction(async () => {
        const previous = await load(id);
        const data = baseRecord(config, req.body, previous);
        if (resource === 'countries' && data.country_code !== id) throw new HttpError(400, 'Country codes cannot be renamed.');
        validateRecord(resource, data, previous);
        await db.run(`UPDATE ${config.table} SET ${config.fields.map(field => `${field} = ?`).join(', ')} WHERE ${config.id} = ?`, [...config.fields.map(field => data[field] ?? null), id]);
        return find(id);
      });
      res.json(updated);
    },
    async remove(req, res) {
      const id = parseId(req.params.id, config);
      await db.transaction(async () => {
        const previous = await load(id);
        if (resource === 'trips' && previous.status !== 'cancelled') throw new HttpError(409, 'Cancel the trip before permanently purging it.');
        await db.run(`DELETE FROM ${config.table} WHERE ${config.id} = ?`, [id]);
      });
      res.status(204).end();
    },
  };
}
