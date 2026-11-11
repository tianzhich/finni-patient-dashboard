import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  patientListQuerySchema,
  patientListResponseSchema,
  patientMetadataResponseSchema,
} from '@shared/api-schema';

test('list query schema owns defaults, coercion, and the invalid-parameter matrix', () => {
  assert.deepEqual(patientListQuerySchema.parse({}), {
    q: '',
    page: 1,
    pageSize: 20,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const invalidQueries = [
    { page: '0' },
    { page: '-1' },
    { page: '1.5' },
    { page: 'NaN' },
    { page: '1000001' },
    { pageSize: '0' },
    { pageSize: '101' },
    { pageSize: 'abc' },
    { pageSize: '1.5' },
    { sortBy: 'status' },
    { sortBy: 'name;DROP TABLE patients' },
    { sortOrder: 'random' },
    { status: 'Unknown' },
    { city: '' },
    { q: 'a'.repeat(301) },
    { city: 'a'.repeat(101) },
    { q: ['one', 'two'] },
    { page: ['1', '2'] },
    { unexpected: 'true' },
  ];

  for (const query of invalidQueries) {
    assert.equal(patientListQuerySchema.safeParse(query).success, false, JSON.stringify(query));
  }

  assert.equal(patientListQuerySchema.parse({ page: '2' }).page, 2);
});

test('response schemas require pagination and a complete metadata count object', () => {
  assert.equal(patientListResponseSchema.safeParse({ data: [] }).success, false);
  assert.equal(patientMetadataResponseSchema.safeParse({ counts: {}, cities: [] }).success, false);
});
