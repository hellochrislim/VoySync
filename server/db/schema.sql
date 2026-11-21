-- VoySync schema from the group report, Sections 3.1-3.7.
-- All money is INTEGER Singapore-dollar cents; datetime values are destination-local.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS USER_PROFILE (
    user_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    email TEXT NOT NULL COLLATE NOCASE UNIQUE
        CHECK (length(email) > 0 AND email = trim(email)),
    gender TEXT,
    date_of_birth TEXT CHECK (
        date_of_birth IS NULL OR (
            length(date_of_birth) = 10
            AND date(date_of_birth, '+0 days') IS NOT NULL
            AND date(date_of_birth, '+0 days') = date_of_birth
        )
    ),
    preferred_travel_style TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS COUNTRY (
    country_code TEXT PRIMARY KEY NOT NULL
        CHECK (country_code GLOB '[A-Z][A-Z]'),
    country_name TEXT NOT NULL COLLATE NOCASE UNIQUE
        CHECK (length(trim(country_name)) > 0),
    region TEXT NOT NULL CHECK (length(trim(region)) > 0)
) STRICT;

CREATE TABLE IF NOT EXISTS DESTINATION (
    destination_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    country_code TEXT NOT NULL,
    estimated_base_cost_cents INTEGER NOT NULL
        CHECK (estimated_base_cost_cents >= 0),
    popularity_rating REAL NOT NULL
        CHECK (popularity_rating BETWEEN 0 AND 5),
    FOREIGN KEY (country_code) REFERENCES COUNTRY(country_code)
        ON DELETE RESTRICT
) STRICT;

CREATE TABLE IF NOT EXISTS TRIP (
    trip_id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    destination_id INTEGER NOT NULL,
    start_date TEXT NOT NULL CHECK (
        length(start_date) = 10
        AND date(start_date, '+0 days') IS NOT NULL
        AND date(start_date, '+0 days') = start_date
    ),
    end_date TEXT NOT NULL CHECK (
        length(end_date) = 10
        AND date(end_date, '+0 days') IS NOT NULL
        AND date(end_date, '+0 days') = end_date
    ),
    planned_budget_cents INTEGER NOT NULL CHECK (planned_budget_cents >= 0),
    status TEXT NOT NULL DEFAULT 'planning'
        CHECK (status IN ('planning', 'confirmed', 'completed', 'cancelled')),
    CHECK (end_date >= start_date),
    FOREIGN KEY (user_id) REFERENCES USER_PROFILE(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (destination_id) REFERENCES DESTINATION(destination_id) ON DELETE RESTRICT
) STRICT;

CREATE TABLE IF NOT EXISTS BOOKING (
    booking_id INTEGER PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    provider TEXT NOT NULL CHECK (length(trim(provider)) > 0),
    booking_type TEXT NOT NULL CHECK (booking_type IN ('flight', 'hotel', 'tour')),
    reference_code TEXT NOT NULL CHECK (length(trim(reference_code)) > 0),
    cost_cents INTEGER NOT NULL CHECK (cost_cents >= 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    FOREIGN KEY (trip_id) REFERENCES TRIP(trip_id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS PLACE (
    place_id INTEGER PRIMARY KEY,
    destination_id INTEGER NOT NULL REFERENCES DESTINATION(destination_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90),
    longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),
    UNIQUE(destination_id, name)
) STRICT;

CREATE TABLE IF NOT EXISTS ITINERARY_ITEM (
    item_id INTEGER PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    activity_name TEXT NOT NULL CHECK (length(trim(activity_name)) > 0),
    place_id INTEGER REFERENCES PLACE(place_id) ON DELETE RESTRICT,
    scheduled_datetime TEXT CHECK (scheduled_datetime IS NULL OR
        (length(scheduled_datetime) = 10 AND date(scheduled_datetime,'+0 days') IS NOT NULL AND date(scheduled_datetime,'+0 days') = scheduled_datetime) OR
        length(scheduled_datetime) = 19
        AND datetime(scheduled_datetime, '+0 seconds') IS NOT NULL
        AND datetime(scheduled_datetime, '+0 seconds') = scheduled_datetime
    ),
    location TEXT NOT NULL CHECK (length(trim(location)) > 0),
    notes TEXT,
    FOREIGN KEY (trip_id) REFERENCES TRIP(trip_id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS idx_destination_country ON DESTINATION(country_code);
CREATE INDEX IF NOT EXISTS idx_trip_user ON TRIP(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_destination ON TRIP(destination_id);
CREATE INDEX IF NOT EXISTS idx_booking_trip ON BOOKING(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_trip_schedule ON ITINERARY_ITEM(trip_id, scheduled_datetime);

CREATE TRIGGER IF NOT EXISTS itinerary_dates_insert
BEFORE INSERT ON ITINERARY_ITEM
WHEN EXISTS (
    SELECT 1 FROM TRIP t WHERE t.trip_id = NEW.trip_id
      AND substr(NEW.scheduled_datetime, 1, 10) NOT BETWEEN t.start_date AND t.end_date
)
BEGIN
    SELECT RAISE(ABORT, 'Activity date must be within trip dates');
END;

CREATE TRIGGER IF NOT EXISTS itinerary_dates_update
BEFORE UPDATE OF trip_id, scheduled_datetime ON ITINERARY_ITEM
WHEN EXISTS (
    SELECT 1 FROM TRIP t WHERE t.trip_id = NEW.trip_id
      AND substr(NEW.scheduled_datetime, 1, 10) NOT BETWEEN t.start_date AND t.end_date
)
BEGIN
    SELECT RAISE(ABORT, 'Activity date must be within trip dates');
END;

CREATE TRIGGER IF NOT EXISTS trip_dates_update
BEFORE UPDATE OF start_date, end_date ON TRIP
WHEN EXISTS (
    SELECT 1 FROM ITINERARY_ITEM i WHERE i.trip_id = OLD.trip_id
      AND substr(i.scheduled_datetime, 1, 10) NOT BETWEEN NEW.start_date AND NEW.end_date
)
BEGIN
    SELECT RAISE(ABORT, 'New trip dates would exclude an activity');
END;

CREATE TRIGGER IF NOT EXISTS place_matches_trip_insert
BEFORE INSERT ON ITINERARY_ITEM
WHEN NEW.place_id IS NOT NULL AND
 (SELECT destination_id FROM PLACE WHERE place_id=NEW.place_id) <>
 (SELECT destination_id FROM TRIP WHERE trip_id=NEW.trip_id)
BEGIN SELECT RAISE(ABORT, 'Place belongs to a different destination'); END;

CREATE TRIGGER IF NOT EXISTS place_matches_trip_update
BEFORE UPDATE OF trip_id, place_id ON ITINERARY_ITEM
WHEN NEW.place_id IS NOT NULL AND
 (SELECT destination_id FROM PLACE WHERE place_id=NEW.place_id) <>
 (SELECT destination_id FROM TRIP WHERE trip_id=NEW.trip_id)
BEGIN SELECT RAISE(ABORT, 'Place belongs to a different destination'); END;

CREATE TRIGGER IF NOT EXISTS trip_destination_update BEFORE UPDATE OF destination_id ON TRIP
WHEN EXISTS (SELECT 1 FROM ITINERARY_ITEM i JOIN PLACE p USING(place_id)
 WHERE i.trip_id=OLD.trip_id AND p.destination_id<>NEW.destination_id)
BEGIN SELECT RAISE(ABORT, 'Remove mapped stops before changing destination'); END;
