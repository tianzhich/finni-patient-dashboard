import type { Patient, PatientInput } from '@shared/patient-schema';

// Factories return fresh objects, including nested addresses, for each test.
export function createPatientInput(overrides: Partial<PatientInput> = {}): PatientInput {
  return {
    firstName: '  Élodie ',
    middleName: null,
    lastName: 'O’Neill',
    dateOfBirth: '2020-02-29',
    status: 'Inquiry',
    ...overrides,
    address: {
      line1: '12 Example Street',
      line2: '',
      city: 'Boston',
      state: 'MA',
      postalCode: '02108',
      ...overrides.address,
    },
  };
}

export function createPatient(overrides: Partial<Patient> = {}): Patient {
  const input = createPatientInput({
    firstName: 'Avery',
    middleName: 'Rose',
    lastName: 'Bennett',
    dateOfBirth: '2018-04-12',
    status: 'Active',
  });

  return {
    ...input,
    id: '8b25e878-6957-4b34-ac5a-71328d880a01',
    createdAt: '2026-01-01T12:00:00Z',
    updatedAt: '2026-01-01T12:00:00Z',
    ...overrides,
    address: { ...input.address, line1: '120 Example Lane', ...overrides.address },
  };
}
