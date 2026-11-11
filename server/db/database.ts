import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function openDatabase(filename = process.env.DATABASE_PATH || './data/patients.db') {
  if (filename !== ':memory:') {
    mkdirSync(dirname(resolve(filename)), { recursive: true });
  }

  const db = new Database(filename);

  db.function('casefold', { deterministic: true }, (value) =>
    String(value).toLocaleLowerCase('en-US'),
  );

  db.exec(`CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL CHECK(length(trim(first_name)) > 0),
    middle_name TEXT CHECK(middle_name IS NULL OR length(trim(middle_name)) > 0),
    last_name TEXT NOT NULL CHECK(length(trim(last_name)) > 0),
    date_of_birth TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Inquiry','Onboarding','Active','Churned')),
    address_line1 TEXT NOT NULL CHECK(length(trim(address_line1)) > 0),
    address_line2 TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL CHECK(length(trim(city)) > 0),
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT;`);

  return db;
}
