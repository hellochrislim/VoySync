# API guide

During local development, React calls `/api` through Vite. The API itself listens on `http://127.0.0.1:3001`. Bodies and responses use JSON, and monetary fields are integer SGD cents. These routes are for a shared local classroom demo without authentication or access restrictions.

## Resources

| Resource | Primary key | Writable fields |
| --- | --- | --- |
| `/api/users` | `user_id` | `name`, `email`, `gender`, `date_of_birth`, `preferred_travel_style` |
| `/api/countries` | `country_code` | `country_code`, `country_name`, `region` |
| `/api/destinations` | `destination_id` | `name`, `country_code`, `estimated_base_cost_cents`, `popularity_rating` |
| `/api/trips` | `trip_id` | `user_id`, `destination_id`, `start_date`, `end_date`, `planned_budget_cents`, `status` |
| `/api/bookings` | `booking_id` | `trip_id`, `provider`, `booking_type`, `reference_code`, `cost_cents`, `status` |
| `/api/itinerary` | `item_id` | `trip_id`, `activity_name`, `scheduled_datetime`, `location`, `notes` |

Use `GET /api/<resource>` for a JSON array, `GET /api/<resource>/<id>` for a record, `POST` on the collection to create, `PUT` on a record to edit, and `DELETE` on a record to remove. Send all form fields on update. Calculated display columns and joined labels are not writable. Referenced parent deletion is rejected, and trip deletion is allowed only after cancellation.

Filters include `/api/trips?user_id=1`, `/api/bookings?trip_id=1` and `/api/itinerary?trip_id=1`. Joined display fields include `destination_name` and `user_name` on trips. Trip list rows include `booking_cost_cents`, excluding cancelled booking costs.

Example trip creation:

```json
{
  "user_id": 1,
  "destination_id": 1,
  "start_date": "2026-12-10",
  "end_date": "2026-12-15",
  "planned_budget_cents": 250000,
  "status": "planning"
}
```

Optional empty profile fields can be sent as null. An itinerary time is a local string such as `2026-12-11 10:30:00`. Money must be an integer, not a formatted string or dollar amount. Foreign-key IDs must refer to existing records.

`POST /api/trips` also accepts an optional `itinerary_items` array containing initial activities without `trip_id`; the generated trip ID is assigned to them. The trip and all supplied activities are created in one transaction. If any activity fails validation, none of those records is saved. The frontend currently offers separate trip and activity forms.

## Summary and reports

| Route | Result |
| --- | --- |
| `GET /api/health` | API health status. |
| `GET /api/dashboard` | Counts and planned/recorded booking totals in cents. |
| `GET /api/reports/promotions?region=Asia&as_of=2026-11-06` | Eligible user ID, name and email. At least one geographic filter is required. |
| `GET /api/reports/promotions?country_code=JP&as_of=2026-11-06` | Eligible users for the selected country. Combining country and region uses OR. |
| `GET /api/reports/rewards` | Eligible users with separate trip and booking counts. |
| `GET /api/reports/undiscovered` | Destinations with no retained trip records. |
| `GET /api/reports/high-budget` | Trips with budgets strictly above every catalog base cost. |

## Errors and deletion

Forms show the API's error message when validation, uniqueness, relationship or date rules reject an operation. A failed write should leave the existing record intact. To purge a trip, first update its status to cancelled, then issue `DELETE /api/trips/<id>`. Cancellation does not alter external reservations or automatically cancel booking records.

Before exposing these APIs outside a local demonstration, add authentication, owner checks, protected administrator routes and appropriate deployment configuration. Do not treat a supplied `user_id` as proof of identity.

## Place catalog and itinerary scheduling

GET /api/places?destination_id=5 returns curated names, categories and coordinates. An itinerary item accepts optional place_id and scheduled_datetime. Use null for an idea, YYYY-MM-DD for an untimed day, or YYYY-MM-DD HH:MM:SS for a local appointment. PUT /api/itinerary/:id moves the existing stop.
