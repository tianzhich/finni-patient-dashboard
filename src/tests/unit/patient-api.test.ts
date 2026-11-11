// @vitest-environment node

import { expect, test, vi } from 'vitest';
import { getPatients } from '@/api/patient-api';
import type { PatientListQuery } from '@shared/api-schema';

test('list requests preserve reserved characters and forward the cancellation signal', async () => {
  const fetch = vi.fn().mockResolvedValue(
    Response.json({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0 },
    }),
  );
  vi.stubGlobal('fetch', fetch);
  const controller = new AbortController();
  const query: PatientListQuery = {
    q: 'Élodie & Noah',
    city: 'Boston & Cambridge',
    page: 1,
    pageSize: 20,
    sortBy: 'name',
    sortOrder: 'asc',
  };

  await getPatients(query, controller.signal);

  const [url, options] = fetch.mock.calls[0];
  const params = new URL(url, 'http://localhost').searchParams;
  expect(params.get('q')).toBe('Élodie & Noah');
  expect(params.get('city')).toBe('Boston & Cambridge');
  expect(options.signal).toBe(controller.signal);
});

test('the client applies response validation before returning a successful HTTP response', async () => {
  // A single wiring check; response-shape rules belong to the shared schema suite.
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: [] })));
  await expect(
    getPatients({ q: '', page: 1, pageSize: 20, sortBy: 'name', sortOrder: 'asc' }),
  ).rejects.toThrow();
});
