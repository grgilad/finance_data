import { Router } from 'express';
import db from '../db/client';

const router = Router();

router.get('/series', (_req, res) => {
  const rows = db.prepare('SELECT * FROM series ORDER BY category, id').all();
  res.json(rows);
});

export default router;
