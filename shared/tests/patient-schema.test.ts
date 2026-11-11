import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  patientInputSchema,
  isCalendarDate,
  practiceToday,
  STATUSES,
} from '@shared/patient-schema';

import { createPatientInput as fixture } from '@test/fixtures/patients';

test('validation respects real dates, required fields and explicit absence of a middle name', () => {
  const result = patientInputSchema.parse(fixture());

  assert.equal(result.firstName, 'Élodie');
  assert.equal(result.address.postalCode, '02108');
  assert.equal(result.middleName, null);
  assert.equal(patientInputSchema.safeParse({ ...fixture(), firstName: ' ' }).success, false);

  for (const middleName of ['', '   ', undefined]) {
    assert.equal(patientInputSchema.safeParse({ ...fixture(), middleName }).success, false);
  }

  for (const dateOfBirth of [
    '2021-02-29',
    '2020-02-30',
    '2020-13-01',
    '2999-01-01',
    '2020-2-01',
    '',
  ]) {
    assert.equal(
      patientInputSchema.safeParse({ ...fixture(), dateOfBirth }).success,
      false,
      dateOfBirth,
    );
  }

  assert.equal(isCalendarDate('2000-02-29'), true);
  assert.equal(isCalendarDate('1900-02-29'), false);
  assert.equal(practiceToday(new Date('2026-01-01T02:00:00Z')), '2025-12-31');

  for (const status of STATUSES) {
    assert.equal(
      patientInputSchema.safeParse({
        ...fixture(),
        status,
        address: { ...fixture().address, line1: '' },
      }).success,
      false,
    );
  }

  for (const postalCode of ['1234', '123456', 'ABCDE']) {
    assert.equal(
      patientInputSchema.safeParse({ ...fixture(), address: { ...fixture().address, postalCode } })
        .success,
      false,
    );
  }

  assert.equal(
    patientInputSchema.safeParse({
      ...fixture(),
      address: { ...fixture().address, postalCode: '02108-1234' },
    }).success,
    true,
  );

  assert.equal(patientInputSchema.safeParse({ ...fixture(), status: 'Unknown' }).success, false);
  assert.equal(patientInputSchema.safeParse({ ...fixture(), id: 'injected' }).success, false);
});
