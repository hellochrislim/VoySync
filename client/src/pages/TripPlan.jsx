import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useApi from "../hooks/useApi.js";
import { api, errorMessage } from "../lib/api.js";
import { money } from "../lib/format.js";
import PlaceMap from "../components/PlaceMap.jsx";
import Bookings from "./Bookings.jsx";

const colors = ["#6136bd", "#af480e", "#166f70", "#974670", "#315d9e"];
const dayMs = 86400000;
const dateLabel = (iso) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
const dayNumber = (start, date) =>
  Math.round((Date.parse(date) - Date.parse(start)) / dayMs);
const empty = [];
export default function TripPlan() {
  const { id } = useParams();
  const trip = useApi("/trips/" + id);
  if (trip.error)
    return (
      <p role="alert">
        {trip.error} <Link to="/">My trips</Link>
      </p>
    );
  if (!trip.data || String(trip.data.trip_id) !== id)
    return <p>Loading trip…</p>;
  return <Planner key={id} trip={trip.data} refreshTrip={trip.reload} />;
}
function Planner({ trip, refreshTrip }) {
  const places = useApi("/places?destination_id=" + trip.destination_id),
    items = useApi("/itinerary?trip_id=" + trip.trip_id);
  const catalog = places.data || empty;
  const [tab, setTab] = useState("Plan"),
    [mobileMap, setMobileMap] = useState(false),
    [selected, select] = useState(null),
    [editor, edit] = useState(null),
    [failure, fail] = useState(""),
    [saving, busy] = useState(false),
    [week, setWeek] = useState(0);
  const dialog = useRef(null);
  const isEditing = Boolean(editor);
  useEffect(() => {
    if (isEditing) dialog.current?.showModal();
  }, [isEditing]);
  const count = dayNumber(trip.start_date, trip.end_date) + 1;
  const days = Array.from({ length: Math.min(7, count - week * 7) }, (_, i) =>
    new Date(Date.parse(trip.start_date) + (week * 7 + i) * dayMs)
      .toISOString()
      .slice(0, 10),
  );
  const stops = useMemo(() => {
    const numbers = {};
    return (items.data || []).map((s) => {
      const day = s.scheduled_datetime?.slice(0, 10) || "";
      numbers[day] = (numbers[day] || 0) + 1;
      return {
        ...s,
        day,
        number: day ? numbers[day] : null,
        color: day
          ? colors[dayNumber(trip.start_date, day) % colors.length]
          : "#778092",
      };
    });
  }, [items.data, trip.start_date]);
  function open(day = "", place = null, stop = null) {
    edit({
      id: stop?.item_id,
      place: stop?.place_id || place?.place_id || "",
      name: stop?.activity_name || place?.name || "",
      location: stop?.location || place?.name || "",
      notes: stop?.notes || "",
      date: stop?.day || day,
      time: stop?.scheduled_datetime?.slice(11, 16) || "",
    });
    fail("");
  }
  const onPin = useCallback(
    (p, s) => {
      if (s) {
        select(s.item_id);
        if (s.day) setWeek(Math.floor(dayNumber(trip.start_date, s.day) / 7));
        document
          .getElementById("stop-" + s.item_id)
          ?.scrollIntoView({ block: "nearest" });
      } else open("", p);
    },
    [trip.start_date],
  );
  const set = (key, value) => edit((prev) => ({ ...prev, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    busy(true);
    fail("");
    const payload = {
      trip_id: trip.trip_id,
      place_id: Number(editor.place) || null,
      activity_name: editor.name,
      location: editor.location,
      notes: editor.notes || null,
      scheduled_datetime: editor.date
        ? editor.date + (editor.time ? " " + editor.time + ":00" : "")
        : null,
    };
    try {
      const res = editor.id
        ? await api.put("/itinerary/" + editor.id, payload)
        : await api.post("/itinerary", payload);
      select(res.data.item_id);
      if (editor.date)
        setWeek(Math.floor(dayNumber(trip.start_date, editor.date) / 7));
      edit(null);
      items.reload();
    } catch (e) {
      fail(errorMessage(e));
    } finally {
      busy(false);
    }
  }
  async function remove() {
    if (!window.confirm("Remove this stop from your trip?")) return;
    busy(true);
    try {
      await api.delete("/itinerary/" + editor.id);
      edit(null);
      items.reload();
    } catch (e) {
      fail(errorMessage(e));
    } finally {
      busy(false);
    }
  }
  function group(day) {
    const entries = stops.filter((s) => s.day === day);
    return (
      <section className="day-block" key={day}>
        <div className="day-heading">
          <h3>{day ? dateLabel(day) : "Places to visit"}</h3>
          <button className="add-stop" onClick={() => open(day)}>
            {day ? "+ Add stop" : "+ Save place"}
          </button>
        </div>
        {entries.length ? (
          entries.map((s) => (
            <div
              id={"stop-" + s.item_id}
              key={s.item_id}
              className={"stop-row " + (selected === s.item_id ? "chosen" : "")}
            >
              <button className="stop-name" onClick={() => select(s.item_id)}>
                <span className="stop-num" style={{ background: s.color }}>
                  {s.number || "•"}
                </span>
                <span>
                  <strong>{s.activity_name}</strong>
                  <small>
                    {[s.scheduled_datetime?.slice(11, 16), s.location]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                  {s.notes && <small>{s.notes}</small>}
                </span>
              </button>
              <button className="edit-stop" onClick={() => open("", null, s)}>
                {day ? "Edit / move" : "Add to day"}
              </button>
            </div>
          ))
        ) : (
          <p className="empty-day">
            {day
              ? "Nothing scheduled."
              : "Save ideas here before choosing a day."}
          </p>
        )}
      </section>
    );
  }
  return (
    <>
      <Link className="back-link" to="/">
        ← My trips
      </Link>
      <header className="trip-title">
        <div>
          <small>
            {trip.country_name} · {trip.user_name}
          </small>
          <h1>{trip.destination_name}</h1>
          <p>
            {dateLabel(trip.start_date)} – {dateLabel(trip.end_date)} ·{" "}
            {trip.start_date.slice(0, 4)}
          </p>
        </div>
        <span className="trip-status">{trip.status}</span>
      </header>
      <div className="flat-tabs">
        {["Plan", "Reservations", "Budget"].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            onClick={() => {
              setTab(t);
              if (t === "Budget") refreshTrip();
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Reservations" ? (
        <Bookings trip={trip} onSaved={refreshTrip} />
      ) : tab === "Budget" ? (
        <section className="panel">
          <h2>Trip budget</h2>
          <div className="budget-grid">
            {[
              ["Planned", trip.planned_budget_cents],
              ["Recorded bookings", trip.booking_cost_cents],
              [
                trip.planned_budget_cents < trip.booking_cost_cents
                  ? "Over budget"
                  : "Remaining",
                Math.abs(trip.planned_budget_cents - trip.booking_cost_cents),
              ],
            ].map(([name, cents]) => (
              <div key={name}>
                <small>{name}</small>
                <h2>{money(cents)}</h2>
              </div>
            ))}
          </div>
          <p>Amounts in SGD. Cancelled reservations are excluded.</p>
        </section>
      ) : (
        <>
          {(items.error || places.error) && (
            <p role="alert">
              {items.error || places.error}{" "}
              <button
                onClick={() => {
                  items.reload();
                  places.reload();
                }}
              >
                Retry
              </button>
            </p>
          )}
          <button
            className="mobile-toggle"
            onClick={() => setMobileMap(!mobileMap)}
          >
            {mobileMap ? "Show list" : "Show map"}
          </button>
          <div className={"planner-grid " + (mobileMap ? "map-mode" : "")}>
            <div className="schedule">
              {group("")}
              {days.map(group)}
              {count > 7 && (
                <div className="week-nav">
                  <button disabled={!week} onClick={() => setWeek(week - 1)}>
                    Earlier days
                  </button>
                  <button
                    disabled={(week + 1) * 7 >= count}
                    onClick={() => setWeek(week + 1)}
                  >
                    Later days
                  </button>
                </div>
              )}
            </div>
            <PlaceMap
              places={catalog}
              stops={stops}
              selected={selected}
              onSelect={onPin}
              city={trip.destination_name}
            />
          </div>
        </>
      )}
      {editor && (
        <dialog
          ref={dialog}
          onCancel={(e) => {
            e.preventDefault();
            if (!saving) edit(null);
          }}
          className="stop-dialog"
          aria-labelledby="editor-title"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !saving) edit(null);
          }}
        >
          <form onSubmit={submit}>
            <h2 id="editor-title">{editor.id ? "Edit stop" : "Add a place"}</h2>
            <fieldset disabled={saving}>
              <label>
                Place
                <select
                  autoFocus
                  value={editor.place}
                  onChange={(e) => {
                    const p = catalog.find(
                      (p) => p.place_id === Number(e.target.value),
                    );
                    edit({
                      ...editor,
                      place: e.target.value,
                      name: p?.name || "",
                      location: p?.name || "",
                    });
                  }}
                >
                  <option value="">Custom activity</option>
                  {catalog.map((p) => (
                    <option key={p.place_id} value={p.place_id}>
                      {p.name} · {p.category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Activity
                <input
                  required
                  value={editor.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </label>
              <label>
                Location
                <input
                  required
                  value={editor.location}
                  onChange={(e) => set("location", e.target.value)}
                />
              </label>
              <div className="form-pair">
                <label>
                  Day (optional)
                  <input
                    type="date"
                    min={trip.start_date}
                    max={trip.end_date}
                    value={editor.date}
                    onChange={(e) => set("date", e.target.value)}
                  />
                </label>
                <label>
                  Local time (optional)
                  <input
                    type="time"
                    disabled={!editor.date}
                    value={editor.date ? editor.time : ""}
                    onChange={(e) => set("time", e.target.value)}
                  />
                </label>
              </div>
              <label>
                Notes
                <textarea
                  value={editor.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </label>
              {failure && <p role="alert">{failure}</p>}
              <div className="form-actions">
                <button className="button primary">Save stop</button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => edit(null)}
                >
                  Close
                </button>
                {editor.id && (
                  <button
                    type="button"
                    className="text-button danger"
                    onClick={remove}
                  >
                    Remove
                  </button>
                )}
              </div>
            </fieldset>
          </form>
        </dialog>
      )}
    </>
  );
}
