import { Router } from 'express';
import db from '../db/client';

const router = Router();

router.get('/data/:id', (req, res) => {
  const { id } = req.params;
  const { from, to } = req.query as { from?: string; to?: string };

  let sql =
    'SELECT date, value, open, high, low, close, volume FROM data_points WHERE series_id = ?';
  const params: unknown[] = [id];

  if (from) {
    sql += ' AND date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND date <= ?';
    params.push(to);
  }

  sql += ' ORDER BY date ASC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

export default router;
