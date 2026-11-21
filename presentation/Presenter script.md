# VoySync presenter script

Target time: 6:47, including pauses for the annotated screens.

## Slide 1 · 0:00–0:20

**On screen**  Introduce the team and project.

VoySync is our lightweight travel itinerary planner. We’ll follow Riley on a three-day trip to Kyoto and show how a place moves from an idea to a scheduled stop. Along the way, we’ll explain the database decisions that keep the itinerary and booking budget consistent.

## Slide 2 · 0:20–0:50

**On screen**  Read the scenario from left to right.

A map can tell Riley where the market is. A calendar can tell Riley when Friday is free. Neither one alone answers whether the market fits into Friday’s plan or what the trip will cost. The problem is the work of reconciling those records after something changes. We designed one trip workspace where Riley can decide on places first, schedule them later and keep track of recorded commitments.

## Slide 3 · 0:50–1:35

**On screen**  Trace the update across the three layers.

Lecture seven introduced the client–server model. Lectures eight and eleven covered browser interaction and React rendering. Lecture nine showed how to implement REST services in Express. In VoySync, selecting a day changes form state. Pressing Save sends an HTTP PUT with the itinerary item ID. Express validates the fields and uses parameterized SQL to update SQLite. After success, React reloads the itinerary and redraws the list and pins. Lecture ten introduced Sequelize as an ORM. For this project we chose direct SQL so we could show the constraints and report queries explicitly.

## Slide 4 · 1:35–2:10

**On screen**  Point first to Riley, then to the budget.

Riley’s profile can be reused across trips. In Explore, the destination directory is sorted by estimated cost. Choosing Kyoto opens the trip form with that destination selected. The trip runs from December tenth to twelfth. Riley enters a personal budget of twelve hundred dollars. The database stores the two parent IDs and the amount in integer cents. Later, Riley can open this trip directly from My trips.

## Slide 5 · 2:10–2:45

**On screen**  Follow the saved place across its row to the action.

Riley saves Nishiki Market and Pontocho Alley because both look promising. There is no need to guess a date to keep them. Each saved idea already has a trip ID and an itinerary item ID. Its schedule is empty. Selecting Add to day updates that item. A custom activity can also be saved if there is no matching catalog place.

## Slide 6 · 2:45–3:25

**On screen**  Point to the market time and the edit action.

On Friday Riley visits Nishiki Market at two, then Pontocho Alley at five. The stop numbers follow their order in the list and on the map. To change the plan, Riley edits the same stop and selects another day. If Riley chooses December thirteenth, the date falls outside the trip. The form limits the dates, and a SQLite trigger independently enforces that rule. There is also a reverse check when someone shortens a trip that already has activities.

## Slide 7 · 3:25–3:50

**On screen**  Follow pins one and two across the river corridor.

Here is the map from that same Friday itinerary. One identifies Nishiki Market and two identifies Pontocho Alley. Riley can see the places are close before committing an afternoon to them. The catalog supplies the geographic coordinates, while the trip supplies the schedule. Selecting a stop highlights the corresponding pin. On a smaller phone screen, Riley can switch between the list and the map.

## Slide 8 · 3:50–4:22

**On screen**  Read the center total and then the balance.

The hotel booking has its own provider, external reference and cost. Changing it from pending to confirmed updates that record. The budget view includes it once. Two afternoon stops do not create two hotel charges because the cost query sums booking rows independently of activities. The balance is a planning figure based on recorded reservations. It excludes cancelled bookings and any expense Riley has not entered.

## Slide 9 · 4:22–4:52

**On screen**  Point to Cancelled, then to Purge.

Cancellation and deletion serve different needs. A cancelled trip remains part of the history. Once it is cancelled, Riley can confirm a purge. Foreign-key cascades remove its bookings and itinerary items. The traveler, destination and place catalog are shared records, so they remain available. That distinction also changes one of the reporting results.

## Slide 10 · 4:52–5:32

**On screen**  Read the question and result across each row.

The promotion preview finds Alex for Asia on our fixed reporting date. The frequent-traveler query counts two trips and three bookings for Alex, counting each collection independently. The unused-destination query includes Kyoto after Riley’s trip is purged. Cancellation by itself would still leave a matching trip. Finally, Paris and Tokyo exceed every destination base cost. The SQL asks whether any counterexample exists. If no base cost is at least the trip budget, the trip qualifies.

## Slide 11 · 5:32–6:12

**On screen**  Trace DESTINATION to PLACE, then PLACE to ITINERARY_ITEM.

Lecture five introduced entities, relationships and cardinality, and lecture six covered normalization. A country has destinations. A traveler and a destination can each appear on many trips, while each trip has exactly one of each. Bookings and itinerary items belong to the trip. The seventh table, Place, stores reusable geographic facts. A stop can point to a catalog place or leave that reference empty for a custom activity. This separation lets different travelers visit the same market on different days without repeating its coordinates.

## Slide 12 · 6:12–6:47

**On screen**  Close by returning to Riley’s original problem.

The most useful lesson was that an incomplete plan is still valid data. A place can belong to a trip before it has a date. We also learned why user-interface checks and database constraints serve different purposes, and how an innocent join can double a cost. Together, those decisions let Riley go from two ideas to a workable Friday afternoon and a clear budget. Thank you.
