import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import path from 'path';
import { migrations } from './schema';

const dbPath = path.resolve(__dirname, '../../../data/trade.db');
mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Bootstrap: the one DDL statement that always runs
db.prepare('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)').run();

const versionRow = db.prepare('SELECT version FROM schema_version').get() as
  | { version: number }
  | undefined;
const currentVersion = versionRow?.version ?? 0;

const pending = migrations.filter((m) => m.version > currentVersion);

if (pending.length > 0) {
  if (!versionRow) {
    db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
  }

  db.transaction(() => {
    for (const m of pending) {
      db.prepare(m.sql).run();
      db.prepare('UPDATE schema_version SET version = ?').run(m.version);
    }
  })();

  console.log(
    `[db] Applied ${pending.length} migration(s), schema now at v${pending[pending.length - 1].version}`
  );
}

export default db;
