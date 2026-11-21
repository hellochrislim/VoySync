import { openDatabase, defaultDatabasePath } from './database.js';

const db = await openDatabase(process.env.DB_PATH || defaultDatabasePath);
await db.close();
console.log('VoySync database ready. Existing data was preserved.');
