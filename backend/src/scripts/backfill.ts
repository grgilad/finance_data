import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import { readFileSync } from 'fs';
import db from '../db/client';
import { fetchFredSeries } from '../services/fred';
import { fetchYahooHistory } from '../services/yahoo';

const FIVE_YEARS_AGO = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return d.toISOString().split('T')[0];
})();

interface SeriesConfig {
  symbol: string;
  label: string;
  category: string;
}

interface Config {
  fred: SeriesConfig[];
  yahoo: SeriesConfig[];
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
    value  = excluded.value,
    open   = excluded.open,
    high   = excluded.high,
    low    = excluded.low,
    close  = excluded.close,
    volume = excluded.volume
`);

const updateFetched = db.prepare('UPDATE series SET last_fetched_at = ? WHERE id = ?');

async function main() {
  const raw = readFileSync(
    path.resolve(__dirname, '../../../config/series.json'),
    'utf-8'
  );
  const config: Config = JSON.parse(raw);

  for (const s of config.fred) {
    const id = `FRED:${s.symbol}`;
    upsertSeries.run({ id, source: 'fred', symbol: s.symbol, label: s.label, category: s.category });
    console.log(`Backfilling FRED:${s.symbol} from ${FIVE_YEARS_AGO}...`);
    try {
      const obs = await fetchFredSeries(s.symbol, FIVE_YEARS_AGO);
      db.transaction(() => {
        for (const o of obs) {
          upsertDataPoint.run({
            series_id: id, date: o.date, value: o.value,
            open: null, high: null, low: null, close: null, volume: null,
          });
        }
      })();
      updateFetched.run(new Date().toISOString(), id);
      console.log(`  ✓ ${obs.length} observations`);
    } catch (err) {
      console.error(`  ✗ Failed:`, err);
    }
  }

  for (const s of config.yahoo) {
    const id = `YAHOO:${s.symbol}`;
    upsertSeries.run({ id, source: 'yahoo', symbol: s.symbol, label: s.label, category: s.category });
    console.log(`Backfilling YAHOO:${s.symbol} from ${FIVE_YEARS_AGO}...`);
    try {
      const bars = await fetchYahooHistory(s.symbol, FIVE_YEARS_AGO);
      db.transaction(() => {
        for (const b of bars) {
          upsertDataPoint.run({
            series_id: id, date: b.date, value: null,
            open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume,
          });
        }
      })();
      updateFetched.run(new Date().toISOString(), id);
      console.log(`  ✓ ${bars.length} bars`);
    } catch (err) {
      console.error(`  ✗ Failed:`, err);
    }
  }

  console.log('Backfill complete.');
  process.exit(0);
}

main();
