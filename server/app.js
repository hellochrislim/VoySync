import express from 'express';
import cors from 'cors';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, defaultDatabasePath } from './db/database.js';
import { apiRouter } from './routes/api.js';

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', apiRouter(db));
  app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use((error, req, res, next) => {
    if (error.status) return res.status(error.status).json({ error: error.status === 413 ? 'Request body is too large.' : error.message });
    if (error.code?.startsWith('SQLITE_CONSTRAINT')) {
      let message = 'The record violates a database constraint. Check required fields and values.';
      if (error.message.includes('UNIQUE')) message = 'That email, country name, or identifier already exists.';
      if (error.message.includes('FOREIGN KEY')) message = 'A linked record is missing, or this record is still used by another record.';
      if (error.message.includes('Activity date must be within trip dates')) message = 'Activity date must be within trip dates.';
      if (error.message.includes('New trip dates would exclude an activity')) message = 'New trip dates would exclude an activity. Reschedule its activities first.';
      for (const rule of ['Place belongs to a different destination', 'Remove mapped stops before changing destination']) {
        if (error.message.includes(rule)) message = rule;
      }
      return res.status(409).json({ error: message });
    }
    console.error(error);
    res.status(500).json({ error: 'The server could not complete the request.' });
  });
  return app;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = await openDatabase(process.env.DB_PATH || defaultDatabasePath);
  const port = Number(process.env.PORT || 3001);
  const server = createApp(db).listen(port, '127.0.0.1', () => {
    console.log(`VoySync API: http://localhost:${port}/api/health`);
    console.log('Classroom demo: fictional data; no sign-in or access control is configured.');
  });
  const shutdown = () => server.close(async () => { await db.close(); process.exit(0); });
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
