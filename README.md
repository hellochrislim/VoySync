# VoySync Travel Planner

I worked on VoySync with Kyaw Swar Myo Thant and Xu Di for our TIC2601 Database and Web Applications group project. I use it to plan a trip in stages: save places I might visit, decide which day to go, then check how much of my budget is left after booking flights, hotels or tours.

## Running VoySync locally

I use Node.js 22.12 or newer. From the project root, I install the dependencies and start the React app and Express API together:

```sh
npm ci
npm run dev
```

I open [VoySync in my browser](http://localhost:5173). The API runs on [port 3001](http://127.0.0.1:3001/api/health). On the first launch, the server creates `server/db/voysync.db` with fictional sample records. My changes persist when I close the app and return. To stop both processes, I press **Ctrl+C** in the terminal.

## How I plan a trip

1. **Choose a destination.** In **Travelers**, I create a profile or use an existing one. In **Explore**, I compare destinations by estimated cost, filter by region and select **Plan a trip here**. I enter my dates and set my own budget in SGD.
2. **Save places before choosing a day.** I open the trip from **My trips** and select **Save place**. A landmark stays under **Places to visit** until I schedule it. I can also add a custom activity, such as meeting a friend in the hotel lobby.
3. **Build the daily itinerary.** I select **Add to day** for a saved place or **Add stop** beside a date. I can leave the time open or enter a destination-local time. If plans change, **Edit / move** reschedules the same stop and keeps its notes.
4. **Check the map.** A scheduled landmark has the same color and number on the map as it does in the list. The landmark map works offline. I can turn on **Streets** when I have internet access or switch between **List** and **Map** on my phone.
5. **Track reservations and spending.** In **Reservations**, I record the provider, booking reference, status and cost. **Budget** shows the planned amount, recorded booking costs and remaining balance. Cancelling a booking excludes its cost from the total. Changes in VoySync only update my local record.

For example, I can plan a Kyoto trip for 10–12 December 2026, save Nishiki Market and Pontocho Alley, then put both on Friday afternoon. With a planned budget of SGD 1,200 and a hotel booking of SGD 360, I have **SGD 840 remaining**. Moving the market visit to Saturday changes my schedule and keeps the hotel cost the same.

## Reports

I can use the shared trip records to answer four questions:

| Report | What I can find |
| --- | --- |
| Promotion audience | Travelers with a planning or confirmed trip to a selected region or country whose trip ends on or after the reporting date. |
| Frequent travelers | Travelers with at least two noncancelled trips or at least two noncancelled bookings on noncancelled trips. |
| Undiscovered destinations | Catalog destinations with no retained trip records. A cancelled trip still counts until it is purged. |
| High-budget journeys | Trips whose planned budget is higher than every destination’s estimated base cost. |

## How the app stores a plan

The frontend uses React, Vite and React Router, with Leaflet for the map. Express handles requests from the browser, and SQLite stores the data in seven tables. A catalog place holds reusable details such as coordinates. An itinerary item holds the date, time and notes for that particular visit. This lets two travelers visit the same place on different days.

Money is stored in integer SGD cents and displayed in dollars. A scheduled activity must fall within its trip dates. If I shorten a trip, I first move any activities that would fall outside the new dates. Cancelling a trip keeps its history. If I then confirm a permanent purge, VoySync removes its bookings and itinerary items while retaining the traveler and destination.

The frontend is in `client/`, the API is in `server/`, and the schema and sample data are in `server/db/`. For the table relationships and request formats, see the [database notes](docs/DATABASE.md) and [API guide](docs/API.md).

## Project team

| Team member | Student ID |
| --- | --- |
| Chris Lim | A0287601A |
| KYAW SWAR MYO THANT | A0287623W |
| Xu Di | A0245429A |
