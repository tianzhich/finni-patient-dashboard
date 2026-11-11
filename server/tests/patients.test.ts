import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import request from 'supertest';
import { createApp } from '@server/app';
import { openDatabase } from '@server/db/database';
import { createTestApp } from '@server/tests/test-helpers';
import { createPatientInput as patientFixture } from '@test/fixtures/patients';

test('REST create, read, update, transitions and durable persistence', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'finni-patients-'));
  let db = openDatabase(join(directory, 'test.db'));

  try {
    let app = createApp(db, join(directory, 'no-client'));
    const created = await request(app).post('/api/patients').send(patientFixture()).expect(201);
    const patient = created.body.data;

    assert.match(created.headers.location, new RegExp(`/api/patients/${patient.id}$`));

    assert.equal(
      (await request(app).get(`/api/patients/${patient.id}`).expect(200)).body.data.id,
      patient.id,
    );

    for (const status of ['Onboarding', 'Active', 'Churned', 'Inquiry']) {
      const response = await request(app)
        .put(`/api/patients/${patient.id}`)
        .send({ ...patientFixture(), status })
        .expect(200);

      assert.equal(response.body.data.status, status);
      assert.equal(response.body.data.createdAt, patient.createdAt);
    }

    // Same names are not unique identities; each record has its own ID.
    const second = await request(app).post('/api/patients').send(patientFixture()).expect(201);

    assert.notEqual(second.body.data.id, patient.id);
    db.close();
    db = openDatabase(join(directory, 'test.db'));
    app = createApp(db, join(directory, 'no-client'));

    const roster = await request(app).get('/api/patients').expect(200);

    assert.equal(roster.body.data.length, 2);
    // Persistence and row mapping must preserve ZIP strings across a reopened database.
    assert.equal(
      roster.body.data.find((record: { id: string }) => record.id === patient.id).address
        .postalCode,
      '02108',
    );
    assert.equal(roster.headers['cache-control'], 'no-store');

    const updated = {
      ...patientFixture(),
      status: 'Active',
      address: { ...patientFixture().address, city: 'Austin' },
    };

    await request(app).put(`/api/patients/${patient.id}`).send(updated).expect(200);

    assert.deepEqual((await request(app).get('/api/patients/metadata').expect(200)).body, {
      counts: { All: 2, Inquiry: 1, Onboarding: 0, Active: 1, Churned: 0 },
      cities: ['Austin', 'Boston'],
    });

    await request(app).delete(`/api/patients/${patient.id}`).expect(404);
    assert.equal((await request(app).get('/api/patients')).body.data.length, 2);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('invalid requests are structured and do not modify stored records', async (context) => {
  const { app } = createTestApp(context);

  const invalid = await request(app)
    .post('/api/patients')
    .send({ ...patientFixture(), firstName: ' ' })
    .expect(400);

  assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
  assert.ok(invalid.body.error.fieldErrors.firstName);

  await request(app)
    .post('/api/patients')
    .set('Content-Type', 'application/json')
    .send('{invalid')
    .expect(400);

  await request(app)
    .post('/api/patients')
    .send({ ...patientFixture(), firstName: 'x'.repeat(40_000) })
    .expect(413);

  await request(app).get('/api/patients/missing').expect(404);
  await request(app).put('/api/patients/missing').send(patientFixture()).expect(404);
  await request(app).put('/api/patients/missing').send({ status: 'Active' }).expect(400);

  const injection = "Robert'); DROP TABLE patients;--";

  await request(app)
    .post('/api/patients')
    .send({ ...patientFixture(), firstName: injection })
    .expect(201);

  const roster = await request(app).get('/api/patients').expect(200);

  assert.equal(roster.body.data.length, 1);
  assert.equal(roster.body.data[0].firstName, injection);
});

test('list pagination, combined filters and stable sorting run in the database', async (context) => {
  const { app, db } = createTestApp(context);

  const inputs = [
    {
      firstName: 'Zoe',
      middleName: 'Rose',
      lastName: 'Bennett',
      dateOfBirth: '2010-01-01',
      status: 'Active',
      city: 'Boston',
    },
    {
      firstName: 'Avery',
      middleName: 'Rose',
      lastName: 'Bennett',
      dateOfBirth: '2020-01-01',
      status: 'Active',
      city: 'Boston',
    },
    {
      firstName: 'Noah',
      middleName: null,
      lastName: 'Adams',
      dateOfBirth: '2015-01-01',
      status: 'Churned',
      city: 'Austin',
    },
    {
      firstName: 'ÉLODIE',
      middleName: null,
      lastName: 'O’Neill',
      dateOfBirth: '2015-01-01',
      status: 'Inquiry',
      city: 'Boston',
    },
    {
      firstName: '100%_Real',
      middleName: null,
      lastName: 'Test',
      dateOfBirth: '2019-01-01',
      status: 'Active',
      city: 'Austin',
    },
  ];

  for (const input of inputs) {
    await request(app)
      .post('/api/patients')
      .send({
        ...patientFixture(),
        ...input,
        address: { ...patientFixture().address, city: input.city },
        city: undefined,
      })
      .expect(201);
  }

  // Deliberately differ from name order and include a timestamp tie.
  const addedDates = [
    '2026-03-01T12:00:00.000Z',
    '2026-01-01T12:00:00.000Z',
    '2026-02-01T12:00:00.000Z',
    '2026-02-01T12:00:00.000Z',
    '2026-04-01T12:00:00.000Z',
  ];
  inputs.forEach((input, index) => {
    db.prepare('UPDATE patients SET created_at = ? WHERE first_name = ?').run(
      addedDates[index],
      input.firstName,
    );
  });

  const records = db.prepare('SELECT id, created_at FROM patients').all() as {
    id: string;
    created_at: string;
  }[];

  for (const sortOrder of ['asc', 'desc'] as const) {
    const expected = [...records].sort((a, b) => {
      const byDate = a.created_at.localeCompare(b.created_at);
      return (sortOrder === 'asc' ? byDate : -byDate) || a.id.localeCompare(b.id);
    });
    const ids: string[] = [];

    for (const page of [1, 2, 3]) {
      const response = await request(app)
        .get('/api/patients')
        .query({ sortBy: 'createdAt', sortOrder, pageSize: 2, page })
        .expect(200);

      assert.equal(response.body.pagination.total, 5);
      ids.push(...response.body.data.map((p: { id: string }) => p.id));
    }

    assert.deepEqual(
      ids,
      expected.map((p) => p.id),
    );
  }

  const first = (await request(app).get('/api/patients?pageSize=2').expect(200)).body;
  const second = (await request(app).get('/api/patients?pageSize=2&page=2').expect(200)).body;
  const third = (await request(app).get('/api/patients?pageSize=2&page=3').expect(200)).body;

  assert.deepEqual(
    first.data.map((p: { firstName: string }) => p.firstName),
    ['Noah', 'Avery'],
  );

  assert.deepEqual(first.pagination, { page: 1, pageSize: 2, total: 5 });
  assert.equal(new Set([...first.data, ...second.data, ...third.data].map((p) => p.id)).size, 5);
  assert.deepEqual(Object.keys(first).sort(), ['data', 'pagination']);

  const metadata = await request(app).get('/api/patients/metadata').expect(200);

  assert.equal(metadata.headers['cache-control'], 'no-store');

  assert.deepEqual(metadata.body, {
    counts: { All: 5, Active: 3, Inquiry: 1, Onboarding: 0, Churned: 1 },
    cities: ['Austin', 'Boston'],
  });

  const filtered = (
    await request(app)
      .get('/api/patients')
      .query({
        q: 'bEnNeTt',
        status: 'Active',
        city: 'Boston',
        pageSize: 1,
        sortBy: 'dateOfBirth',
        sortOrder: 'desc',
      })
      .expect(200)
  ).body;

  assert.equal(filtered.data[0].firstName, 'Avery');
  assert.equal(filtered.pagination.total, 2);

  assert.deepEqual(
    (await request(app).get('/api/patients/metadata').expect(200)).body,
    metadata.body,
  );

  assert.equal(
    (await request(app).get('/api/patients').query({ q: 'avery bennett' }).expect(200)).body.data[0]
      .firstName,
    'Avery',
  );

  assert.equal(
    (await request(app).get('/api/patients').query({ q: 'avery rose bennett' }).expect(200)).body
      .pagination.total,
    1,
  );

  assert.equal(
    (await request(app).get('/api/patients').query({ q: 'élodie' }).expect(200)).body.data[0]
      .firstName,
    'ÉLODIE',
  );

  assert.equal(
    (await request(app).get('/api/patients').query({ q: '%_' }).expect(200)).body.pagination.total,
    1,
  );

  assert.equal(
    (await request(app).get('/api/patients').query({ q: "' OR 1=1 --" }).expect(200)).body
      .pagination.total,
    0,
  );

  assert.equal(
    (await request(app).get('/api/patients').query({ city: "Boston' OR 1=1 --" }).expect(200)).body
      .pagination.total,
    0,
  );

  const ascending = (await request(app).get('/api/patients?sortBy=dateOfBirth').expect(200)).body
    .data;

  const descending = (
    await request(app).get('/api/patients?sortBy=dateOfBirth&sortOrder=desc').expect(200)
  ).body.data;

  assert.deepEqual(
    ascending.map((p: { dateOfBirth: string }) => p.dateOfBirth),
    inputs.map((p) => p.dateOfBirth).sort(),
  );

  assert.deepEqual(
    descending.map((p: { dateOfBirth: string }) => p.dateOfBirth),
    inputs
      .map((p) => p.dateOfBirth)
      .sort()
      .reverse(),
  );

  assert.deepEqual(
    ascending
      .filter((p: { dateOfBirth: string }) => p.dateOfBirth === '2015-01-01')
      .map((p: { id: string }) => p.id),
    ascending
      .filter((p: { dateOfBirth: string }) => p.dateOfBirth === '2015-01-01')
      .map((p: { id: string }) => p.id)
      .sort(),
  );

  assert.deepEqual(
    (await request(app).get('/api/patients?sortOrder=desc').expect(200)).body.data.map(
      (p: { firstName: string }) => p.firstName,
    ),
    ['100%_Real', 'ÉLODIE', 'Zoe', 'Avery', 'Noah'],
  );

  const outOfRange = (await request(app).get('/api/patients?page=100').expect(200)).body;
  const empty = (await request(app).get('/api/patients?city=Missing').expect(200)).body;

  assert.deepEqual(outOfRange.data, []);
  assert.equal(outOfRange.pagination.total, 5);
  assert.deepEqual(empty.data, []);
  assert.equal(empty.pagination.total, 0);
});

test('list route maps query errors and returns empty-database metadata', async (context) => {
  const { app } = createTestApp(context);

  // One schema-wiring check plus one HTTP-specific repeated-parameter check.
  // The full query validation matrix belongs to shared/tests/api-schema.test.ts.
  for (const query of ['page=0', 'page=1&page=2']) {
    const response = await request(app).get(`/api/patients?${query}`).expect(400);

    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    assert.ok(response.body.error.fieldErrors.page);
  }

  assert.deepEqual((await request(app).get('/api/patients/metadata').expect(200)).body, {
    counts: { All: 0, Inquiry: 0, Onboarding: 0, Active: 0, Churned: 0 },
    cities: [],
  });
});
