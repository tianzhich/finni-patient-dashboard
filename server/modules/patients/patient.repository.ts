import type { PatientListQuery } from '@shared/api-schema';
import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { Patient, PatientInput } from '@shared/patient-schema';

type Row = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: string;
  status: Patient['status'];
  address_line1: string;
  address_line2: string;
  city: string;
  state: Patient['address']['state'];
  postal_code: string;
  created_at: string;
  updated_at: string;
};

function fromRow(row: Row): Patient {
  return {
    id: row.id,
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    status: row.status,
    address: {
      line1: row.address_line1,
      line2: row.address_line2,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function values(input: PatientInput) {
  return [
    input.firstName,
    input.middleName,
    input.lastName,
    input.dateOfBirth,
    input.status,
    input.address.line1,
    input.address.line2,
    input.address.city,
    input.address.state,
    input.address.postalCode,
  ];
}

export function patientRepository(db: Database.Database) {
  const select = db.prepare('SELECT * FROM patients WHERE id = ?');

  const get = (id: string) => {
    const row = select.get(id) as Row | undefined;

    return row ? fromRow(row) : undefined;
  };

  return {
    get,

    list: (query: PatientListQuery) =>
      db.transaction(() => {
        const conditions: string[] = [];
        const parameters: string[] = [];

        if (query.q) {
          conditions.push(`(instr(casefold(first_name || ' ' || coalesce(middle_name || ' ', '') || last_name), casefold(?)) > 0
          OR instr(casefold(first_name || ' ' || last_name), casefold(?)) > 0)`);

          parameters.push(query.q, query.q);
        }

        if (query.status) {
          conditions.push('status = ?');
          parameters.push(query.status);
        }

        if (query.city) {
          conditions.push('city = ?');
          parameters.push(query.city);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const { total } = db
          .prepare(`SELECT count(*) AS total FROM patients ${where}`)
          .get(...parameters) as { total: number };

        const direction = query.sortOrder === 'desc' ? 'DESC' : 'ASC';

        const order =
          query.sortBy === 'dateOfBirth'
            ? `date_of_birth ${direction}, id ASC`
            : query.sortBy === 'createdAt'
              ? `created_at ${direction}, id ASC`
              : `casefold(last_name) ${direction}, casefold(first_name) ${direction}, id ASC`;

        const data = (
          db
            .prepare(`SELECT * FROM patients ${where} ORDER BY ${order} LIMIT ? OFFSET ?`)
            .all(...parameters, query.pageSize, (query.page - 1) * query.pageSize) as Row[]
        ).map(fromRow);

        return {
          data,
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total,
          },
        };
      })(),

    metadata: () =>
      db.transaction(() => {
        const counts = { All: 0, Inquiry: 0, Onboarding: 0, Active: 0, Churned: 0 };

        const groups = db
          .prepare('SELECT status, count(*) AS count FROM patients GROUP BY status')
          .all() as { status: Patient['status']; count: number }[];

        for (const group of groups) {
          counts[group.status] = group.count;
          counts.All += group.count;
        }

        const cities = (
          db.prepare('SELECT DISTINCT city FROM patients ORDER BY casefold(city), city').all() as {
            city: string;
          }[]
        ).map((row) => row.city);

        return { counts, cities };
      })(),

    create(input: PatientInput) {
      const id = randomUUID();
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO patients (id, first_name, middle_name, last_name, date_of_birth, status,
        address_line1, address_line2, city, state, postal_code, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, ...values(input), now, now);

      return get(id)!;
    },

    update(id: string, input: PatientInput) {
      const result = db
        .prepare(
          `UPDATE patients SET first_name=?, middle_name=?, last_name=?, date_of_birth=?, status=?,
        address_line1=?, address_line2=?, city=?, state=?, postal_code=?, updated_at=? WHERE id=?`,
        )
        .run(...values(input), new Date().toISOString(), id);

      return result.changes ? get(id) : undefined;
    },
  };
}
