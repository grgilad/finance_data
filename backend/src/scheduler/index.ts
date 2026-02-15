import cron from 'node-cron';
import { readFileSync } from 'fs';
import path from 'path';
import db from '../db/client';
import { fetchFredSeries } from '../services/fred';
import { fetchYahooHistory } from '../services/yahoo';

interface SeriesConfig {
  symbol: string;
  label: string;
  category: string;
}

interface Config {
  fred: SeriesConfig[];
  yahoo: SeriesConfig[];
}

function loadConfig(): Config {
  const raw = readFileSync(
    path.resolve(__dirname, '../../../config/series.json'),
    'utf-8'
  );
  return JSON.parse(raw);
}

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

const upsertSeries = db.prepare(`
  INSERT INTO series (id, source, symbol, label, category)
  VALUES (@id, @source, @symbol, @label, @category)
  ON CONFLICT(id) DO UPDATE SET label = excluded.label, category = excluded.category
`);

const upsertDataPoint = db.prepare(`
  INSERT INTO data_points (series_id, date, value, open, high, low, close, volume)
  VALUES (@series_id, @date, @value, @open, @high, @low, @close, @volume)
  ON CONFLICT(series_id, date) DO UPDATE SET
    value = excluded.value,
    open  = excluded.open,
    high  = excluded.high,
    low   = excluded.low,
    close = excluded.close,
    volume = excluded.volume
`);

const updateFetched = db.prepare(
  'UPDATE series SET last_fetched_at = ? WHERE id = ?'
);

export async function runFetch() {
  const config = loadConfig();

  for (const s of config.fred) {
    const id = `FRED:${s.symbol}`;
    upsertSeries.run({ id, source: 'fred', symbol: s.symbol, label: s.label, category: s.category });

    const row = db
      .prepare('SELECT last_fetched_at FROM series WHERE id = ?')
      .get(id) as { last_fetched_at: string | null } | undefined;
    const startDate = row?.last_fetched_at?.split('T')[0] ?? thirtyDaysAgo();

    try {
      const obs = await fetchFredSeries(s.symbol, startDate);
      db.transaction(() => {
        for (const o of obs) {
          upsertDataPoint.run({
            series_id: id, date: o.date, value: o.value,
            open: null, high: null, low: null, close: null, volume: null,
          });
        }
      })();
      updateFetched.run(new Date().toISOString(), id);
      console.log(`[scheduler] FRED:${s.symbol} — ${obs.length} observations`);
    } catch (err) {
      console.error(`[scheduler] Failed FRED:${s.symbol}:`, err);
    }
  }

  for (const s of config.yahoo) {
    const id = `YAHOO:${s.symbol}`;
    upsertSeries.run({ id, source: 'yahoo', symbol: s.symbol, label: s.label, category: s.category });

    const row = db
      .prepare('SELECT last_fetched_at FROM series WHERE id = ?')
      .get(id) as { last_fetched_at: string | null } | undefined;
    const startDate = row?.last_fetched_at?.split('T')[0] ?? thirtyDaysAgo();

    try {
      const bars = await fetchYahooHistory(s.symbol, startDate);
      db.transaction(() => {
        for (const b of bars) {
          upsertDataPoint.run({
            series_id: id, date: b.date, value: null,
            open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
          });
        }
      })();
      updateFetched.run(new Date().toISOString(), id);
      console.log(`[scheduler] YAHOO:${s.symbol} — ${bars.length} bars`);
    } catch (err) {
      console.error(`[scheduler] Failed YAHOO:${s.symbol}:`, err);
    }
  }
}

export function startScheduler() {
  cron.schedule('0 6 * * *', () => {
    console.log('[scheduler] Daily fetch starting...');
    runFetch().catch((err) => console.error('[scheduler] Fatal error:', err));
  });
  console.log('[scheduler] Scheduled daily fetch at 06:00');
}
