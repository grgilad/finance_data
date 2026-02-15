export const migrations: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `CREATE TABLE series (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      symbol TEXT NOT NULL,
      label TEXT NOT NULL,
      category TEXT,
      last_fetched_at TEXT
    )`,
  },
  {
    version: 2,
    sql: `CREATE TABLE data_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      series_id TEXT NOT NULL REFERENCES series(id),
      date TEXT NOT NULL,
      value REAL,
      open REAL,
      high REAL,
      low REAL,
      close REAL,
      volume REAL,
      UNIQUE(series_id, date)
    )`,
  },
];
