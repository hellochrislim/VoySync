import { Router } from 'express';
import { resourceController, resources } from '../controllers/resources.js';
import { reportsController } from '../controllers/reports.js';

export function apiRouter(db) {
  const router = Router();
  router.get('/health', (req, res) => res.json({ status: 'ok' }));
  router.get('/places', async (req, res) => {
    res.json(await db.all('SELECT * FROM PLACE WHERE destination_id = ? ORDER BY name', [req.query.destination_id || 0]));
  });
  const reports = reportsController(db);
  router.get('/dashboard', reports.dashboard);
  router.get('/reports/:name', reports.report);

  for (const resource of Object.keys(resources)) {
    const controller = resourceController(db, resource);
    router.route(`/${resource}`).get(controller.list).post(controller.create);
    router.route(`/${resource}/:id`).get(controller.get).put(controller.update).delete(controller.remove);
  }
  return router;
}
