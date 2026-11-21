import { useState } from "react";
import { Link } from "react-router-dom";
import useApi from "../hooks/useApi.js";
import { today } from "../lib/format.js";
export default function Dashboard() {
  const trips = useApi("/trips");
  const [past, setPast] = useState(false);
  const ended = (t) =>
    ["cancelled", "completed"].includes(t.status) || t.end_date < today();
  const rows = (trips.data || [])
    .filter((t) => ended(t) === past)
    .sort((a, b) =>
      past
        ? b.start_date.localeCompare(a.start_date)
        : a.start_date.localeCompare(b.start_date),
    );
  return (
    <>
      <div className="section-head">
        <div>
          <h1>My trips</h1>
          <p>Your itineraries and reservations.</p>
        </div>
        <Link className="button primary" to="/trips">
          + Plan a trip
        </Link>
      </div>
      <div className="flat-tabs">
        {["Upcoming", "Past trips"].map((name, i) => (
          <button
            key={name}
            aria-pressed={past === Boolean(i)}
            onClick={() => setPast(Boolean(i))}
          >
            {name}
          </button>
        ))}
      </div>
      {trips.error ? (
        <p role="alert">
          {trips.error} <button onClick={trips.reload}>Retry</button>
        </p>
      ) : trips.loading ? (
        <p>Loading trips…</p>
      ) : !rows.length ? (
        <p>No trips in this view.</p>
      ) : (
        <div className="trip-cards">
          {rows.map((t) => (
            <Link
              to={"/trips/" + t.trip_id}
              className="flat-card"
              key={t.trip_id}
            >
              <div className={"poster tone-" + (t.destination_id % 3)}>
                <div className="poster-sun" />
                <div className="poster-hill" />
                <span>{t.country_name}</span>
              </div>
              <section>
                <small>
                  {t.start_date} → {t.end_date}
                </small>
                <h2>{t.destination_name}</h2>
                <p>
                  {t.user_name} · {t.status}
                </p>
                <div className="card-bottom">
                  {t.first_stop || "Start your itinerary"} <b>↗</b>
                </div>
              </section>
            </Link>
          ))}
        </div>
      )}
      <Link className="sub-link" to="/trips">
        Manage trip details →
      </Link>
    </>
  );
}
