import { calendarDate, HttpError, todayInSingapore } from './validation.js';

// The report's required SQL techniques are kept visible for study and demonstration.
export const reportQueries = {
  promotions: `SELECT u.user_id, u.name, u.email FROM USER_PROFILE u
    WHERE u.user_id IN (
      SELECT t.user_id FROM TRIP t
      WHERE t.status IN ('planning', 'confirmed') AND t.end_date >= ?
        AND t.destination_id IN (
          SELECT d.destination_id FROM DESTINATION d
          WHERE d.country_code IN (
            SELECT c.country_code FROM COUNTRY c WHERE c.region = ? OR c.country_code = ?
          )
        )
    ) ORDER BY u.name, u.user_id`,
  rewards: `SELECT u.user_id, u.name, u.email,
    (SELECT COUNT(*) FROM TRIP t WHERE t.user_id = u.user_id AND t.status <> 'cancelled') AS trip_count,
    (SELECT COUNT(*) FROM BOOKING b JOIN TRIP t ON t.trip_id = b.trip_id
      WHERE t.user_id = u.user_id AND t.status <> 'cancelled' AND b.status <> 'cancelled') AS booking_count
    FROM USER_PROFILE u WHERE
      (SELECT COUNT(*) FROM TRIP t WHERE t.user_id = u.user_id AND t.status <> 'cancelled') >= 2
      OR (SELECT COUNT(*) FROM BOOKING b JOIN TRIP t ON t.trip_id = b.trip_id
        WHERE t.user_id = u.user_id AND t.status <> 'cancelled' AND b.status <> 'cancelled') >= 2
    ORDER BY u.name, u.user_id`,
  undiscovered: `SELECT d.*, c.country_name, c.region FROM DESTINATION d
    JOIN COUNTRY c ON c.country_code = d.country_code
    WHERE NOT EXISTS (SELECT 1 FROM TRIP t WHERE t.destination_id = d.destination_id)
    ORDER BY d.name, d.destination_id`,
  'high-budget': `SELECT t.*, u.name AS user_name, d.name AS destination_name FROM TRIP t
    JOIN USER_PROFILE u ON u.user_id = t.user_id
    JOIN DESTINATION d ON d.destination_id = t.destination_id
    WHERE NOT EXISTS (SELECT 1 FROM DESTINATION catalog
      WHERE catalog.estimated_base_cost_cents >= t.planned_budget_cents)
    ORDER BY t.planned_budget_cents DESC, t.trip_id`,
};

export function reportsController(db) {
  return {
    async dashboard(req, res) {
      res.json(await db.get(`SELECT
        (SELECT COUNT(*) FROM USER_PROFILE) AS users,
        (SELECT COUNT(*) FROM TRIP) AS trips,
        (SELECT COUNT(*) FROM TRIP WHERE status IN ('planning', 'confirmed') AND end_date >= ?) AS active_trips,
        (SELECT COUNT(*) FROM BOOKING) AS bookings,
        (SELECT COALESCE(SUM(planned_budget_cents), 0) FROM TRIP WHERE status <> 'cancelled') AS planned_budget_cents,
        (SELECT COALESCE(SUM(b.cost_cents), 0) FROM BOOKING b JOIN TRIP t ON t.trip_id = b.trip_id
          WHERE b.status <> 'cancelled' AND t.status <> 'cancelled') AS booking_cost_cents`, [todayInSingapore()]));
    },
    async report(req, res) {
      const { name } = req.params;
      if (!Object.hasOwn(reportQueries, name)) throw new HttpError(404, 'Report not found.');
      let params = [];
      if (name === 'promotions') {
        const region = typeof req.query.region === 'string' ? req.query.region.trim() : '';
        const country = typeof req.query.country_code === 'string' ? req.query.country_code.trim() : '';
        const asOf = req.query.as_of === undefined ? todayInSingapore() : req.query.as_of;
        calendarDate(asOf, 'Reporting date');
        if (!region && !country) return res.json([]);
        if (country && !/^[A-Z]{2}$/.test(country)) throw new HttpError(400, 'Country code must be two uppercase letters.');
        params = [asOf, region, country];
      }
      res.json(await db.all(reportQueries[name], params));
    },
  };
}
