-- Fictional classroom data only. Loaded once when a database is first created.
INSERT INTO USER_PROFILE (user_id, name, email, gender, date_of_birth, preferred_travel_style) VALUES
    (1, 'Alex Tan', 'alex@example.com', NULL, '1998-06-15', 'Culture and food'),
    (2, 'Jamie Lee', 'jamie@example.com', NULL, '1999-09-02', 'Adventure'),
    (3, 'Sam Chen', 'sam@example.com', NULL, NULL, 'Relaxation');

INSERT INTO COUNTRY (country_code, country_name, region) VALUES
    ('JP', 'Japan', 'Asia'), ('TH', 'Thailand', 'Asia'),
    ('FR', 'France', 'Europe'), ('AU', 'Australia', 'Oceania');

INSERT INTO DESTINATION (destination_id, name, country_code, estimated_base_cost_cents, popularity_rating) VALUES
    (1, 'Tokyo', 'JP', 180000, 4.9),
    (2, 'Bangkok', 'TH', 65000, 4.6),
    (3, 'Paris', 'FR', 240000, 4.8),
    (4, 'Melbourne', 'AU', 150000, 4.5),
    (5, 'Kyoto', 'JP', 140000, 4.8);

INSERT INTO TRIP (trip_id, user_id, destination_id, start_date, end_date, planned_budget_cents, status) VALUES
    (1, 1, 1, '2026-12-10', '2026-12-16', 280000, 'planning'),
    (2, 1, 2, '2027-01-08', '2027-01-12', 120000, 'confirmed'),
    (3, 2, 3, '2026-12-20', '2026-12-27', 420000, 'confirmed'),
    (4, 3, 4, '2026-10-01', '2026-10-05', 170000, 'completed');

INSERT INTO BOOKING (booking_id, trip_id, provider, booking_type, reference_code, cost_cents, status) VALUES
    (1, 1, 'Demo Airways', 'flight', 'DEMO-TYO-01', 65000, 'confirmed'),
    (2, 1, 'Sakura Stay', 'hotel', 'DEMO-HOTEL-01', 84000, 'pending'),
    (3, 2, 'Demo Airways', 'flight', 'DEMO-BKK-01', 25000, 'confirmed'),
    (4, 3, 'Paris City Stay', 'hotel', 'DEMO-PAR-01', 150000, 'confirmed'),
    (5, 4, 'Laneway Walks', 'tour', 'DEMO-MEL-01', 12550, 'completed');

INSERT INTO ITINERARY_ITEM (item_id, trip_id, activity_name, scheduled_datetime, location, notes) VALUES
    (1, 1, 'Explore Asakusa', '2026-12-11 09:30:00', 'Senso-ji, Tokyo', 'Leave time for the market.'),
    (2, 1, 'Shibuya food walk', '2026-12-12 18:00:00', 'Shibuya, Tokyo', 'Try a local ramen shop.'),
    (3, 2, 'Visit the Grand Palace', '2027-01-09 10:00:00', 'Bangkok', 'Check the dress code.'),
    (4, 3, 'Museum afternoon', '2026-12-22 14:00:00', 'Paris', NULL);
