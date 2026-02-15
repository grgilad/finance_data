# Financial Data Dashboard — Implementation Plan

## Context
Building a personal financial data web application from scratch. The app fetches data daily from FRED (Federal Reserve Economic Data) and Yahoo Finance, stores it locally in SQLite, and presents it as interactive time-series charts across a multi-page React frontend. Goal: decision-making support via macroeconomic and market data visualization.

---

## Architecture Overview

```
trade_data/
├── package.json              # Root monorepo (npm workspaces)
├── .env                      # API keys (gitignored)
├── .gitignore
├── config/
│   └── series.json           # User-defined FRED series & Yahoo tickers
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          # Express server entrypoint
│       ├── db/
│       │   ├── client.ts     # better-sqlite3 setup
│       │   └── schema.ts     # Table definitions + migrations
│       ├── services/
│       │   ├── fred.ts       # FRED API fetcher
│       │   └── yahoo.ts      # Yahoo Finance fetcher (yahoo-finance2)
│       ├── scheduler/
│       │   └── index.ts      # node-cron daily job
│       ├── routes/
│       │   ├── series.ts     # GET /api/series
│       │   └── data.ts       # GET /api/data/:id?from=&to=
│       └── scripts/
│           └── backfill.ts   # One-time historical data load
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx           # React Router root
        ├── pages/
        │   ├── Dashboard.tsx      # Overview: sparklines for all series
        │   ├── Category.tsx       # All series in one category
        │   └── SeriesDetail.tsx   # Full chart + date range picker
        ├── components/
        │   ├── Chart.tsx     # Recharts wrapper for time-series
        │   └── Navbar.tsx
        └── api/
            └── client.ts    # Typed fetch() wrappers for backend routes
```

---

## Technology Stack

| Layer | Package | Reason |
|---|---|---|
| Frontend framework | React 18 + TypeScript | Standard |
| Frontend build | Vite | Fast dev server, easy proxy config |
| Routing | React Router v6 | Multi-page SPA |
| Charts | **Recharts** | Best TypeScript support, composable, great for time series |
| Backend | Express + TypeScript | Simple REST API |
| Database | **better-sqlite3** | Zero-config, local, single file, perfect for single-user |
| FRED client | native `fetch` | FRED REST API is simple; no wrapper needed |
| Yahoo Finance | **yahoo-finance2** | TypeScript-native npm package |
| Scheduler | **node-cron** | Lightweight cron for Node.js |
| Dev runner | **tsx** | Run TypeScript files directly |
| Packager | pnpm | Always use pnpm |

---

## Database Schema

```sql
-- Tracks applied migrations; the one DDL statement that always runs on startup
CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);

-- One row per configured series/ticker
CREATE TABLE series (
  id TEXT PRIMARY KEY,          -- e.g. "FRED:DFF" or "YAHOO:SPY"
  source TEXT NOT NULL,         -- "fred" | "yahoo"
  symbol TEXT NOT NULL,         -- e.g. "DFF" or "SPY"
  label TEXT NOT NULL,          -- human-readable name
  category TEXT,                -- e.g. "macro", "equities", "rates"
  last_fetched_at TEXT          -- ISO timestamp of last successful fetch
);

-- Time-series data points
CREATE TABLE data_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_id TEXT NOT NULL REFERENCES series(id),
  date TEXT NOT NULL,           -- ISO date "YYYY-MM-DD"
  value REAL,                   -- for FRED single-value series
  open REAL,                    -- for Yahoo OHLCV
  high REAL,
  low REAL,
  close REAL,
  volume REAL,
  UNIQUE(series_id, date)       -- upsert-safe
);
```

### Migration Strategy

`src/db/schema.ts` maintains an ordered list of migration SQL statements, each associated with a version number. On startup `client.ts`:

1. Ensures `schema_version` exists (the only always-run DDL)
2. Reads the current version (defaults to 0 if table is empty)
3. Runs only migrations with version > current, in order
4. Updates `schema_version` to the latest applied version

On a normal restart no migrations run. Future schema changes (e.g. `ALTER TABLE series ADD COLUMN ...`) are added as a new versioned entry and run exactly once.

---

## Configuration File (`config/series.json`)

Edit this file to add or remove any FRED series or Yahoo Finance tickers.

```json
{
  "fred": [
    { "symbol": "DFF",      "label": "Fed Funds Rate",     "category": "rates"  },
    { "symbol": "CPIAUCSL", "label": "CPI (Inflation)",    "category": "macro"  },
    { "symbol": "UNRATE",   "label": "Unemployment Rate",  "category": "macro"  },
    { "symbol": "T10Y2Y",   "label": "Yield Curve (10Y-2Y)", "category": "rates" }
  ],
  "yahoo": [
    { "symbol": "SPY",  "label": "S&P 500 ETF",    "category": "equities"    },
    { "symbol": "QQQ",  "label": "Nasdaq 100 ETF",  "category": "equities"    },
    { "symbol": "GLD",  "label": "Gold ETF",         "category": "commodities" },
    { "symbol": "TLT",  "label": "20yr Treasury ETF","category": "bonds"       }
  ]
}
```

---

## Environment Variables (`.env`)

```
FRED_API_KEY=your_fred_api_key_here
PORT=3001
```

Get a free FRED API key at: https://fred.stlouisfed.org/docs/api/api_key.html

---

## Implementation Steps

### Step 1 — Repo Bootstrap
- `git init`
- Create root `package.json` with npm workspaces: `["frontend", "backend"]`
- Create `.gitignore` (node_modules, .env, `data/*.db`)
- Create `.env` placeholder
- Create `config/series.json` with defaults above

### Step 2 — Backend
**Install deps:**
```bash
cd backend
pnpm install express better-sqlite3 node-cron yahoo-finance2 dotenv cors
pnpm install -D typescript @types/express @types/better-sqlite3 @types/node @types/cors tsx
```

**Files to build:**
1. `src/db/client.ts` — open/create `../../data/trade.db` with `better-sqlite3`, run schema migrations on startup
2. `src/services/fred.ts` — `fetchFredSeries(symbol, startDate)` using the FRED observations endpoint
3. `src/services/yahoo.ts` — `fetchYahooHistory(symbol, startDate)` using `yahoo-finance2.historical()`
4. `src/scheduler/index.ts` — `node-cron` schedule `"0 6 * * *"` (daily at 6 AM) that reads `config/series.json`, calls fetchers, upserts into DB
5. `src/routes/series.ts` — `GET /api/series` → all rows from `series` table
6. `src/routes/data.ts` — `GET /api/data/:id?from=YYYY-MM-DD&to=YYYY-MM-DD` → data_points rows
7. `src/index.ts` — Express app, register routes, start scheduler, listen on PORT
8. `src/scripts/backfill.ts` — one-time script to fetch 5 years of history for all configured series

### Step 3 — Frontend
**Scaffold:**
```bash
pnpm create vite@latest frontend -- --template react-ts
cd frontend
pnpm install recharts react-router-dom
```

**Files to build:**
1. `vite.config.ts` — add proxy: `"/api" → "http://localhost:3001"`
2. `src/App.tsx` — React Router routes:
   - `/` → `Dashboard`
   - `/category/:name` → `Category`
   - `/series/:id` → `SeriesDetail`
3. `src/api/client.ts` — typed `getSeries()` and `getSeriesData(id, from, to)` helpers
4. `src/components/Navbar.tsx` — links to Dashboard + each category
5. `src/components/Chart.tsx` — Recharts `<LineChart>` or `<ComposedChart>` wrapper
6. `src/pages/Dashboard.tsx` — fetch all series, render grid of sparklines, each links to `/series/:id`
7. `src/pages/Category.tsx` — filter by `category` param, render full charts
8. `src/pages/SeriesDetail.tsx` — full chart with `<input type="date">` range picker

### Step 4 — First Run
```bash
# From repo root
pnpm install               # installs all workspaces
cd backend
npx tsx src/scripts/backfill.ts   # loads 5 years of history
npx tsx src/index.ts              # start backend on :3001

# In another terminal
cd frontend
pnpm run dev               # Vite on :5173
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/series` | List all configured series with metadata |
| GET | `/api/data/:id` | Get data points for a series; optional `?from=` and `?to=` |

---

## Frontend Routes

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Sparkline grid for all series |
| `/category/:name` | Category | All series in a category (rates, macro, equities…) |
| `/series/:id` | SeriesDetail | Full chart + date range picker for one series |

---

## Verification Checklist

- [ ] `curl http://localhost:3001/api/series` returns JSON array
- [ ] `curl "http://localhost:3001/api/data/FRED:DFF?from=2020-01-01"` returns data points
- [ ] `http://localhost:5173` shows dashboard with sparklines
- [ ] Clicking a sparkline navigates to `/series/FRED:DFF` with full chart
- [ ] Changing the date range on SeriesDetail re-fetches and re-renders
- [ ] Cron scheduler logs a fetch at 6 AM (or test by changing schedule to `"* * * * *"` temporarily)
- [ ] Adding a new entry to `config/series.json` and re-running backfill makes it appear
