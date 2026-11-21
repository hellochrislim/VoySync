-- The curated catalogue is joined by city and country so migrations do not depend on seed IDs.
WITH landmarks(city, country, name, category, lat, lon) AS (VALUES
 ('Kyoto','JP','Nishiki Market','Food market',35.0050,135.7648),
 ('Kyoto','JP','Pontocho Alley','Riverside walk',35.0069,135.7710),
 ('Kyoto','JP','Yasaka Shrine','Shrine',35.0036,135.7785),
 ('Kyoto','JP','Fushimi Inari','Shrine',34.9671,135.7727),
 ('Tokyo','JP','Senso-ji','Temple',35.7148,139.7967),
 ('Tokyo','JP','Shibuya Crossing','City landmark',35.6595,139.7005),
 ('Tokyo','JP','Meiji Jingu','Shrine',35.6764,139.6993),
 ('Tokyo','JP','Ueno Park','Park',35.7154,139.7730),
 ('Bangkok','TH','Grand Palace','Palace',13.7500,100.4913),
 ('Bangkok','TH','Wat Pho','Temple',13.7465,100.4933),
 ('Paris','FR','Louvre Museum','Museum',48.8606,2.3376),
 ('Paris','FR','Tuileries Garden','Garden',48.8635,2.3275),
 ('Melbourne','AU','Federation Square','Square',-37.818,144.9691),
 ('Melbourne','AU','Hosier Lane','Street art',-37.8168,144.9692))
INSERT OR IGNORE INTO PLACE(destination_id,name,category,latitude,longitude)
 SELECT d.destination_id,l.name,l.category,l.lat,l.lon FROM landmarks l
 JOIN DESTINATION d ON d.name=l.city AND d.country_code=l.country;

UPDATE ITINERARY_ITEM SET place_id=(
 SELECT p.place_id FROM PLACE p JOIN TRIP t USING(destination_id)
 WHERE t.trip_id=ITINERARY_ITEM.trip_id AND
 ((p.name='Senso-ji' AND location='Senso-ji, Tokyo') OR
 (p.name='Grand Palace' AND activity_name='Visit the Grand Palace')))
WHERE place_id IS NULL;
