import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createPatient } from '@test/fixtures/patients';
import { createQueryClient } from '@/tests/test-utils';
import type { Patient } from '@shared/patient-schema';
import { PatientsPage } from '@/pages/patients-page';

const patient = createPatient();

test('search waits for a typing pause, while clearing and filtering apply immediately', async () => {
  const requests: URLSearchParams[] = [];
  globalThis.fetch = async (url) => {
    const parsed = new URL(String(url), 'http://localhost');
    if (parsed.pathname === '/api/patients/metadata') {
      return Response.json({
        counts: { All: 1, Active: 1, Churned: 0, Inquiry: 0, Onboarding: 0 },
        cities: ['Boston'],
      });
    }
    requests.push(parsed.searchParams);
    return Response.json({
      data: [patient],
      pagination: { page: 1, pageSize: 20, total: 1 },
    });
  };

  const queryClient = createQueryClient();
  const ui = render(
    <QueryClientProvider client={queryClient}>
      <PatientsPage />
    </QueryClientProvider>,
  );
  await ui.findByRole('button', { name: 'Avery Rose Bennett' });
  const input = ui.getByLabelText('Search patients by name') as HTMLInputElement;

  vi.useFakeTimers();
  try {
    fireEvent.change(input, { target: { value: 'ave' } });
    assert.equal(input.value, 'ave');
    await act(() => vi.advanceTimersByTimeAsync(200));
    fireEvent.change(input, { target: { value: 'avery' } });
    await act(() => vi.advanceTimersByTimeAsync(299));
    assert.equal(requests.length, 1);
    assert.equal(new URLSearchParams(window.location.search).get('q'), null);
    await act(() => vi.advanceTimersByTimeAsync(1));
    assert.equal(requests.length, 2);
    assert.equal(requests.at(-1)!.get('q'), 'avery');
    assert.equal(new URLSearchParams(window.location.search).get('q'), 'avery');

    fireEvent.change(input, { target: { value: 'avery b' } });
    fireEvent.click(ui.getByRole('button', { name: /^Active/ }));
    assert.equal(requests.at(-1)!.get('q'), 'avery');
    assert.equal(requests.at(-1)!.get('status'), 'Active');
    const afterFilter = requests.length;
    await act(() => vi.advanceTimersByTimeAsync(300));
    assert.equal(requests.length, afterFilter + 1);
    assert.equal(requests.at(-1)!.get('q'), 'avery b');
    assert.equal(requests.at(-1)!.get('status'), 'Active');

    fireEvent.change(input, { target: { value: 'pending' } });
    fireEvent.click(ui.getByRole('button', { name: 'Clear search' }));
    assert.equal(input.value, '');
    assert.equal(requests.at(-1)!.get('q'), null);
    const afterClear = requests.length;
    await act(() => vi.advanceTimersByTimeAsync(300));
    assert.equal(requests.length, afterClear);

    fireEvent.change(input, { target: { value: 'unmounted' } });
    ui.unmount();
    await act(() => vi.advanceTimersByTimeAsync(300));
    assert.equal(requests.length, afterClear);
  } finally {
    vi.useRealTimers();
    queryClient.clear();
  }
});

test('roster search, status filtering, details and dirty-close confirmation work together', async () => {
  window.history.replaceState(null, '', '/');

  const queryClient = createQueryClient();

  const former: Patient = {
    ...patient,
    id: '8b25e878-6957-4b34-ac5a-71328d880a02',
    firstName: 'Noah',
    middleName: null,
    status: 'Churned',
  };

  const requests: URLSearchParams[] = [];

  globalThis.fetch = async (url) => {
    const parsedUrl = new URL(String(url), 'http://localhost');

    if (parsedUrl.pathname === '/api/patients/metadata') {
      return Response.json({
        counts: { All: 2, Active: 1, Churned: 1, Inquiry: 0, Onboarding: 0 },
        cities: ['Boston'],
      });
    }

    const params = parsedUrl.searchParams;

    requests.push(params);

    const data = [patient, former].filter(
      (record) =>
        (!params.get('q') || record.firstName === 'Avery') &&
        (!params.get('status') || record.status === params.get('status')),
    );

    return Response.json({
      data,
      pagination: { page: 1, pageSize: 20, total: data.length },
    });
  };

  const user = userEvent.setup();

  const ui = render(
    <QueryClientProvider client={queryClient}>
      <PatientsPage />
    </QueryClientProvider>,
  );

  await ui.findByRole('button', { name: 'Avery Rose Bennett' });
  await user.type(ui.getByLabelText('Search patients by name'), 'avery bennett');
  await waitFor(() =>
    assert.equal(ui.queryByRole('button', { name: 'Noah Bennett' }) === null, true),
  );
  await waitFor(() => assert.equal(requests.at(-1)!.get('q'), 'avery bennett'));
  assert.ok(ui.getByRole('button', { name: 'Avery Rose Bennett' }));
  await user.click(ui.getByRole('button', { name: /Churned/ }));
  assert.ok(await ui.findByText('No matching patients'));
  assert.equal(requests.at(-1)!.get('status'), 'Churned');
  await user.click(ui.getByRole('button', { name: 'Clear filters' }));
  const viewButton = await ui.findByRole('button', { name: 'View Avery Rose Bennett' });
  viewButton.focus();
  await user.keyboard('{Enter}');
  await ui.findByRole('heading', { name: 'Avery Rose Bennett' });
  await user.keyboard('{Escape}');
  await waitFor(() => assert.equal(document.activeElement, viewButton));

  await user.click(await ui.findByRole('button', { name: 'Avery Rose Bennett' }));
  assert.ok(await ui.findByRole('heading', { name: 'Avery Rose Bennett' }));
  await user.click(ui.getByRole('button', { name: 'Edit patient' }));
  await user.type(ui.getByLabelText('First name'), ' changed');
  await user.click(ui.getByRole('button', { name: 'Close panel' }));
  assert.ok(await ui.findByRole('heading', { name: 'Discard your changes?' }));
  await user.click(ui.getByRole('button', { name: 'Keep editing' }));
  assert.equal((ui.getByLabelText('First name') as HTMLInputElement).value, 'Avery changed');
  await user.click(ui.getByRole('button', { name: 'Close panel' }));
  await user.click(ui.getByRole('button', { name: 'Discard changes' }));
  await waitFor(() => assert.equal(ui.queryByRole('heading', { name: 'Edit patient' }), null));

  await waitFor(() =>
    assert.equal(document.activeElement, ui.getByRole('button', { name: 'Avery Rose Bennett' })),
  );
});

test('an untouched or reverted create form closes without confirmation and restores focus', async () => {
  window.history.replaceState(null, '', '/');
  const queryClient = createQueryClient();
  const user = userEvent.setup();

  globalThis.fetch = async (url) =>
    Response.json(
      String(url) === '/api/patients/metadata'
        ? { counts: { All: 0, Active: 0, Churned: 0, Inquiry: 0, Onboarding: 0 }, cities: [] }
        : { data: [], pagination: { page: 1, pageSize: 20, total: 0 } },
    );

  const ui = render(
    <QueryClientProvider client={queryClient}>
      <PatientsPage />
    </QueryClientProvider>,
  );

  async function expectClosed(opener = ui.getAllByRole('button', { name: 'Add patient' })[0]) {
    await waitFor(() => assert.equal(ui.queryByRole('dialog'), null));
    assert.equal(ui.queryByRole('heading', { name: 'Discard your changes?' }), null);
    await waitFor(() => assert.equal(document.activeElement, opener));
  }

  await ui.findByText('Your patient roster starts here');
  const emptyStateButton = ui.getAllByRole('button', { name: 'Add patient' })[1];
  await user.click(emptyStateButton);
  await user.keyboard('{Escape}');
  await expectClosed(emptyStateButton);

  await user.click(ui.getAllByRole('button', { name: 'Add patient' })[0]);
  await user.click(ui.getByRole('button', { name: 'Close panel' }));
  await expectClosed();

  await user.click(ui.getAllByRole('button', { name: 'Add patient' })[0]);
  await user.click(ui.getByRole('button', { name: 'Cancel' }));
  await expectClosed();

  await user.click(ui.getAllByRole('button', { name: 'Add patient' })[0]);
  await user.keyboard('{Escape}');
  await expectClosed();

  await user.click(ui.getAllByRole('button', { name: 'Add patient' })[0]);
  await user.type(ui.getByLabelText('First name'), 'Avery');
  await user.click(ui.getByRole('button', { name: 'Close panel' }));
  await ui.findByRole('heading', { name: 'Discard your changes?' });
  await user.click(ui.getByRole('button', { name: 'Keep editing' }));
  await user.clear(ui.getByLabelText('First name'));
  await user.click(ui.getByRole('button', { name: 'Close panel' }));
  await expectClosed();
});

test('pagination, sorting and city filtering request server results and preserve URL state', async () => {
  window.history.replaceState(
    null,
    '',
    '/?page=2&pageSize=10&sortBy=dateOfBirth&sortOrder=desc&city=Boston',
  );

  const queryClient = createQueryClient();
  const requests: URLSearchParams[] = [];
  let metadataRequests = 0;
  const user = userEvent.setup();

  globalThis.fetch = async (url) => {
    const parsedUrl = new URL(String(url), 'http://localhost');

    if (parsedUrl.pathname === '/api/patients/metadata') {
      metadataRequests += 1;

      return Response.json({
        counts: { All: 42, Inquiry: 0, Onboarding: 0, Active: 42, Churned: 0 },
        cities: ['Austin', 'Boston'],
      });
    }

    const params = parsedUrl.searchParams;

    requests.push(params);

    return Response.json({
      data: [patient],
      pagination: {
        page: Number(params.get('page')),
        pageSize: Number(params.get('pageSize')),
        total: 35,
      },
    });
  };

  const ui = render(
    <QueryClientProvider client={queryClient}>
      <PatientsPage />
    </QueryClientProvider>,
  );

  await ui.findByRole('button', { name: 'Avery Rose Bennett' });
  assert.equal(requests[0].get('page'), '2');
  assert.equal(requests[0].get('city'), 'Boston');
  assert.equal(requests[0].get('sortBy'), 'dateOfBirth');
  assert.equal(requests[0].get('sortOrder'), 'desc');
  assert.ok(ui.getByText('Page 2 of 4'));
  await user.click(ui.getByRole('button', { name: 'Next' }));
  await ui.findByText('Page 3 of 4');
  assert.equal(requests.at(-1)!.get('page'), '3');
  assert.equal(ui.queryByLabelText('Sort patients'), null);
  await user.click(ui.getByRole('button', { name: 'Sort by patient name' }));
  await waitFor(() => assert.equal(requests.at(-1)!.get('sortOrder'), 'asc'));
  await user.click(ui.getByRole('button', { name: 'Sort by patient name' }));
  await ui.findByText('Page 1 of 4');
  assert.equal(requests.at(-1)!.get('sortBy'), 'name');
  await waitFor(() => assert.equal(requests.at(-1)!.get('sortOrder'), 'desc'));

  assert.equal(
    ui
      .getByRole('button', { name: 'Sort by patient name' })
      .closest('th')!
      .getAttribute('aria-sort'),
    'descending',
  );

  ui.getByRole('button', { name: 'Sort by date of birth' }).focus();
  await user.keyboard('{Enter}');
  await waitFor(() => assert.equal(requests.at(-1)!.get('sortBy'), 'dateOfBirth'));
  assert.equal(requests.at(-1)!.get('sortOrder'), 'asc');
  await user.keyboard(' ');
  await waitFor(() => assert.equal(requests.at(-1)!.get('sortOrder'), 'desc'));

  assert.equal(
    ui
      .getByRole('button', { name: 'Sort by date of birth' })
      .closest('th')!
      .getAttribute('aria-sort'),
    'descending',
  );

  await user.click(ui.getByRole('button', { name: 'Sort by date added' }));
  await waitFor(() => assert.equal(requests.at(-1)!.get('sortBy'), 'createdAt'));
  assert.equal(requests.at(-1)!.get('sortOrder'), 'desc');
  assert.equal(new URLSearchParams(window.location.search).get('sortBy'), 'createdAt');
  assert.equal(
    ui.getByRole('button', { name: 'Sort by date added' }).closest('th')!.getAttribute('aria-sort'),
    'descending',
  );
  await user.click(ui.getByRole('button', { name: 'Sort by date added' }));
  await waitFor(() => assert.equal(requests.at(-1)!.get('sortOrder'), 'asc'));
  assert.equal(
    ui.getByRole('button', { name: 'Sort by date added' }).closest('th')!.getAttribute('aria-sort'),
    'ascending',
  );

  await user.selectOptions(ui.getByLabelText('Filter by city'), 'Austin');
  await waitFor(() => assert.equal(requests.at(-1)!.get('city'), 'Austin'));
  await ui.findByRole('button', { name: 'Avery Rose Bennett' });
  await user.selectOptions(ui.getByLabelText('Patients per page'), '50');
  await ui.findByText('Page 1 of 1');
  assert.equal(requests.at(-1)!.get('pageSize'), '50');
  assert.equal(new URLSearchParams(window.location.search).get('city'), 'Austin');
  assert.equal((ui.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled, true);

  assert.equal((ui.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled, true);

  assert.equal(metadataRequests, 1);
});

test('an out-of-range URL page is corrected after the server returns the total', async () => {
  window.history.replaceState(null, '', '/?page=100');

  const queryClient = createQueryClient();
  const requestedPages: number[] = [];

  globalThis.fetch = async (url) => {
    const parsed = new URL(String(url), 'http://localhost');

    if (parsed.pathname === '/api/patients/metadata') {
      return Response.json({
        counts: { All: 1, Active: 1, Churned: 0, Inquiry: 0, Onboarding: 0 },
        cities: ['Boston'],
      });
    }

    const page = Number(parsed.searchParams.get('page'));

    requestedPages.push(page);

    return Response.json({
      data: page === 1 ? [patient] : [],
      pagination: { page, pageSize: 20, total: 1 },
    });
  };

  const ui = render(
    <QueryClientProvider client={queryClient}>
      <PatientsPage />
    </QueryClientProvider>,
  );

  await ui.findByRole('button', { name: 'Avery Rose Bennett' });
  assert.ok(ui.getByText('Page 1 of 1'));
  assert.deepEqual(requestedPages, [100, 1]);
  assert.equal(new URLSearchParams(window.location.search).get('page'), '1');
});

test('saving invalidates lists and metadata and removes patients that no longer match', async () => {
  window.history.replaceState(null, '', '/?status=Active');

  const queryClient = createQueryClient();
  const user = userEvent.setup();
  let saved = false;
  let listRequests = 0;
  let metadataRequests = 0;

  globalThis.fetch = async (url, options) => {
    if (options?.method === 'PUT') {
      saved = true;

      return Response.json({ data: { ...patient, ...JSON.parse(String(options.body)) } });
    }

    if (String(url) === '/api/patients/metadata') {
      metadataRequests += 1;

      return Response.json({
        counts: {
          All: 1,
          Active: saved ? 0 : 1,
          Churned: saved ? 1 : 0,
          Inquiry: 0,
          Onboarding: 0,
        },
        cities: ['Boston'],
      });
    }

    listRequests += 1;

    return Response.json({
      data: saved ? [] : [patient],
      pagination: { page: 1, pageSize: 20, total: saved ? 0 : 1 },
    });
  };

  const ui = render(
    <QueryClientProvider client={queryClient}>
      <PatientsPage />
    </QueryClientProvider>,
  );

  await user.click(await ui.findByRole('button', { name: 'Avery Rose Bennett' }));
  await user.click(ui.getByRole('button', { name: 'Edit patient' }));
  await user.selectOptions(ui.getByLabelText('Status'), 'Churned');
  await user.click(ui.getByRole('button', { name: 'Save changes' }));
  await ui.findByRole('heading', { name: 'Avery Rose Bennett' });
  await ui.findByText('No matching patients');
  assert.ok(listRequests >= 2);
  await waitFor(() => assert.equal(metadataRequests, 2));
  await user.click(ui.getByRole('button', { name: 'Close panel' }));

  await waitFor(() =>
    assert.equal(document.activeElement, ui.getByRole('button', { name: 'Add patient' })),
  );

  await waitFor(() =>
    assert.match(ui.getByRole('button', { name: /Churned/ }).textContent || '', /Churned\s*1/),
  );

  assert.ok(ui.getByText('Patient information updated.'));
});

test('metadata failure preserves the roster and can be retried independently', async () => {
  window.history.replaceState(null, '', '/');

  const queryClient = createQueryClient();
  const user = userEvent.setup();
  let metadataRequests = 0;
  let listRequests = 0;

  globalThis.fetch = async (url) => {
    if (String(url) === '/api/patients/metadata') {
      metadataRequests += 1;

      return metadataRequests === 1
        ? Response.json({ error: { code: 'SERVER_ERROR', message: 'Try again.' } }, { status: 500 })
        : Response.json({
            counts: { All: 1, Active: 1, Churned: 0, Inquiry: 0, Onboarding: 0 },
            cities: ['Boston'],
          });
    }

    listRequests += 1;

    return Response.json({
      data: [patient],
      pagination: { page: 1, pageSize: 20, total: 1 },
    });
  };

  const ui = render(
    <QueryClientProvider client={queryClient}>
      <PatientsPage />
    </QueryClientProvider>,
  );

  await ui.findByRole('button', { name: 'Avery Rose Bennett' });
  assert.ok(await ui.findByRole('alert'));
  assert.match(ui.getByRole('button', { name: /^Active/ }).textContent || '', /Active\s*—/);
  await user.click(ui.getByRole('button', { name: 'Retry patient metadata' }));

  await waitFor(() =>
    assert.match(ui.getByRole('button', { name: /^Active/ }).textContent || '', /Active\s*1/),
  );

  assert.equal(ui.queryByRole('alert'), null);
  assert.equal(metadataRequests, 2);
  assert.equal(listRequests, 1);
  assert.ok(ui.getByRole('option', { name: 'Boston' }));
});
