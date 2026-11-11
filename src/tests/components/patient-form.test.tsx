import { expect, test } from 'vitest';
import assert from 'node:assert/strict';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createPatient } from '@test/fixtures/patients';
import { createQueryClient } from '@/tests/test-utils';
import type { Patient } from '@shared/patient-schema';
import { PatientForm } from '@/components/patients/patient-form';

const patient = createPatient();

test('invalid submission blocks the request and valid submission maps form-only fields', async () => {
  const queryClient = createQueryClient();
  const payloads: Record<string, unknown>[] = [];
  let saved: Patient | undefined;

  globalThis.fetch = async (_url, options) => {
    const payload = JSON.parse(String(options?.body));

    payloads.push(payload);

    return Response.json({ data: { ...patient, ...payload } }, { status: 201 });
  };

  const user = userEvent.setup();

  const ui = render(
    <QueryClientProvider client={queryClient}>
      <PatientForm
        onSaved={(p) => {
          saved = p;
        }}
        onCancel={() => {}}
        onDirtyChange={() => {}}
        onPendingChange={() => {}}
      />
    </QueryClientProvider>,
  );

  await user.click(ui.getByRole('button', { name: 'Add patient' }));
  expect(await ui.findByText('First name is required.')).toBeVisible();
  assert.equal(payloads.length, 0);
  await user.type(ui.getByLabelText('First name'), 'Avery');
  await user.type(ui.getByLabelText('Last name'), 'Bennett');
  await user.click(ui.getByLabelText('No middle name'));
  fireEvent.change(ui.getByLabelText('Date of birth'), { target: { value: '2018-04-12' } });
  await user.type(ui.getByLabelText('Street address'), '120 Example Lane');
  await user.type(ui.getByLabelText('City'), 'Boston');
  await user.selectOptions(ui.getByLabelText('State or territory'), 'MA');
  await user.type(ui.getByLabelText('ZIP code'), '02108');
  await user.click(ui.getByRole('button', { name: 'Add patient' }));
  await waitFor(() => assert.ok(saved));

  const payload = payloads[0];

  assert.equal(payload.middleName, null);
  assert.equal(payload.status, 'Inquiry');
  assert.equal('noMiddleName' in payload, false);
});

test('failed edit keeps user input and does not announce success', async () => {
  const queryClient = createQueryClient();
  let saved = false;

  globalThis.fetch = async () =>
    Response.json({ error: { message: 'Unable to save right now.' } }, { status: 500 });

  const user = userEvent.setup();

  const ui = render(
    <QueryClientProvider client={queryClient}>
      <PatientForm
        patient={patient}
        onSaved={() => {
          saved = true;
        }}
        onCancel={() => {}}
        onDirtyChange={() => {}}
        onPendingChange={() => {}}
      />
    </QueryClientProvider>,
  );

  await user.clear(ui.getByLabelText('First name'));
  await user.type(ui.getByLabelText('First name'), 'Updated');
  await user.click(ui.getByRole('button', { name: 'Save changes' }));
  expect(await ui.findByRole('alert')).toBeVisible();
  expect(ui.getByLabelText('First name')).toHaveValue('Updated');
  assert.equal(saved, false);
});

test('server validation errors map to form fields', async () => {
  const queryClient = createQueryClient();
  const user = userEvent.setup();
  let saved = false;

  globalThis.fetch = async () =>
    Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the highlighted fields.',
          fieldErrors: { firstName: 'The server rejected this first name.' },
        },
      },
      { status: 400 },
    );

  const ui = render(
    <QueryClientProvider client={queryClient}>
      <PatientForm
        patient={patient}
        onSaved={() => {
          saved = true;
        }}
        onCancel={() => {}}
        onDirtyChange={() => {}}
        onPendingChange={() => {}}
      />
    </QueryClientProvider>,
  );

  await user.click(ui.getByRole('button', { name: 'Save changes' }));
  expect(await ui.findByText('The server rejected this first name.')).toBeVisible();
  expect(ui.getByLabelText('First name')).toHaveAttribute('aria-invalid', 'true');
  assert.equal(saved, false);
});
