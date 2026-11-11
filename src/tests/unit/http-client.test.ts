// @vitest-environment node

import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { ApiError, NetworkError, requestJson } from '@/api/http-client';
import { savePatient } from '@/api/patient-api';
import { createPatientInput } from '@test/fixtures/patients';

test('HTTP client returns the full JSON body without assuming a data envelope', async () => {
  const body = { counts: { All: 0 }, cities: [] };

  vi.stubGlobal('fetch', async () => Response.json(body));
  assert.deepEqual(await requestJson('/api/patients/metadata'), body);
});

test('HTTP client preserves structured server field errors', async () => {
  const fieldErrors = { firstName: 'First name is required.' };

  vi.stubGlobal('fetch', async () =>
    Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Check your entries.', fieldErrors } },
      { status: 400 },
    ),
  );

  await assert.rejects(requestJson('/api/patients'), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.message, 'Check your entries.');
    assert.deepEqual(error.fieldErrors, fieldErrors);

    return true;
  });
});

test('HTTP client rejects a non-JSON response', async () => {
  vi.stubGlobal('fetch', async () => new Response('<html>Unexpected page</html>'));
  await assert.rejects(requestJson('/api/patients'), /unexpected response/);
});

test('HTTP client distinguishes network failures from cancelled requests', async () => {
  const failure = new TypeError('Failed to fetch');
  const controller = new AbortController();

  vi.stubGlobal('fetch', async () => {
    throw failure;
  });

  await assert.rejects(requestJson('/api/patients'), NetworkError);
  controller.abort();

  await assert.rejects(
    requestJson('/api/patients', { signal: controller.signal }),
    (error) => error === failure,
  );
});

test('patient API explains uncertain saves while the HTTP client stays generic', async () => {
  const input = createPatientInput();

  vi.stubGlobal('fetch', async () => {
    throw new TypeError('Failed to fetch');
  });

  await assert.rejects(savePatient({ input }), /couldn’t confirm the save/);
});
