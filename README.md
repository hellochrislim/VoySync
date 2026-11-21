# VoySync Travel Planner

TIC2601 group project using React (Vite), React Router, Express and SQLite. 

## Start the project

Install Node.js 22.12 or newer. Open **this folder** in VS Code, open its terminal, then run:

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. The API runs at **http://127.0.0.1:3001/api**. Keep the terminal running; press **Ctrl+C** to stop both applications. Run these commands from the project root, rather than from `client` or `server`.

The server creates `server/db/voysync.db` and sample records automatically on the first start. Changes persist in that file across restarts. Sample traveler names and `example.com` email addresses are fictional. Keep a backup of your database before experimenting with permanent deletion.

Frontend edits refresh automatically. After editing backend files, stop and restart `npm run dev` to load the server changes.

## Plan a trip

Open **My trips** and choose a city. The Plan tab shows a saved-place list, a section for each travel day, and a map. Select **Save place** to keep an idea, or **Add stop** beside a day to schedule it directly. **Edit / move** changes a stop without duplicating it. Custom activities can be saved without coordinates.

The offline landmark map uses coordinates from the curated catalog. The optional **Streets** layer requires internet access. The Kyoto offline view includes approximate reference streets and the Kamo River. Use the List / Map switch on a phone. In **Reservations**, create and update a booking for the current trip. **Budget** shows its planned amount, recorded bookings and remaining balance in SGD.

To reproduce the slide example, add Riley in Travelers. Under Explore, choose Kyoto, select **Plan a trip here**, and enter 10–12 December 2026 and SGD 1,200. Save Nishiki Market and Pontocho Alley, then schedule both for Friday. A SGD 360 hotel booking leaves SGD 840.

The React frontend uses React Router and Leaflet. The Express API persists seven SQLite tables. Four reports cover promotion audiences, frequent travelers, unused destinations and high-budget trips. This local classroom workspace has shared access to fictional records.

## Folder structure

```text
voysync-travel-planner/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── controllers/
│   ├── db/
│   │   ├── voysync.db       # Created on first start; ignored by Git
│   │   └── schema.sql
│   ├── routes/
│   ├── app.js
│   └── package.json
├── docs/
├── scripts/dev.mjs
├── .gitignore
├── package.json
└── README.md
```

The root `package.json` joins the client and server as npm workspaces, so one installation and one development command are enough. Commit `package-lock.json` so teammates install the same versions. Installed dependencies and the generated database are excluded from Git.

## How this follows the tutorial

`client/index.html` provides the root element. `src/main.jsx` renders `BrowserRouter`, `App.jsx` declares nested routes, and `pages/Layout.jsx` renders the common navigation and `Outlet`. Routed pages manage state and pass values and callbacks to reusable components. This is the Week 12 pattern with VoySync pages replacing the tutorial's bookstore pages.

Week 12 focuses on React structure and routing. The Express API and SQLite connection included here extend that tutorial to your project; they are not part of its Week 12 exercise. Your proposed `sqlite3` stack is used instead of adding Sequelize.

Read [the tutorial walkthrough](docs/TUTORIAL_GUIDE.md), [database notes](docs/DATABASE.md), and [API guide](docs/API.md) for the next steps. The current framework references are [Vite's guide](https://vite.dev/guide/) and [React Router's routing guide](https://reactrouter.com/start/declarative/routing).

## Useful commands

```sh
npm run dev       # Start client and API together
npm run build     # Build the frontend into client/dist
npm run lint      # Check frontend source
npm test          # Run backend checks using isolated test databases
```

To use separate terminals:

```sh
npm run dev --workspace server
npm run dev --workspace client
```

`npm start` runs the API only. `npm run preview --workspace client` previews a frontend build. A production deployment and its hosting configuration are not included.

Verified 21 November 2026: ten backend tests, frontend lint and production build passed. Browser checks covered creating a traveler and trip, saving and scheduling places, reservations, budget, mobile list/map switching, cancellation, purge and the four reports.

## Database rules to remember

All money is stored as integer **SGD cents**, displayed as dollars in the interface. Dates use `YYYY-MM-DD`. Activities use destination-local `YYYY-MM-DD HH:MM:SS`, without time zone conversion. The planned budget is a planning amount; recorded bookings may exceed it. Remaining booking budget excludes cancelled bookings and does not include unrecorded expenses or refunds.

An activity must fall within its trip dates. A trip's dates cannot be shortened to exclude existing activities. User profiles, destinations and countries that are still referenced cannot be deleted. Only cancelled trips can be purged; that purge removes their bookings and itinerary items together.

## Team Members

| Team member | Student ID |
| --- | --- |
| Chris Lim | A0287601A |
| KYAW SWAR MYO THANT | A0287623W |
| Xu Di | A0245429A |

## If something does not start

- Confirm that your terminal is inside `voysync-travel-planner` and run `npm ci` once before starting.
- If port 5173 or 3001 is occupied, stop the older development server. The client proxy expects the API on port 3001.
- If SQLite installation fails, use a supported Node.js LTS release and try again; some computers need local compiler tools for the `sqlite3` package.
- The application upgrades the original six-table database transactionally on startup. Other future schema changes require their own migrations. Keep a backup and implement a migration, or create a fresh development database deliberately.
