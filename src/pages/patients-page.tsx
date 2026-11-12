import { useEffect, useRef, useState } from 'react';
import { useDebounce } from 'react-use';
import {
  CheckCircle2,
  ChevronRight,
  FileHeart,
  Plus,
  Search,
  Users,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { patientListQuerySchema, type PatientListQuery } from '@shared/api-schema';
import { STATUSES, fullName, type Patient, type PatientStatus } from '@shared/patient-schema';
import {
  Button,
  cn,
  Input,
  Dialog,
  DialogTitle,
  DialogDescription,
  SheetContent,
  ConfirmContent,
} from '@/components/ui/primitives';
import { usePatients, usePatientMetadata } from '@/hooks/use-patients';
import { PatientForm } from '@/components/patients/patient-form';
import { PatientDetails } from '@/components/patients/patient-details';
import { PatientTable } from '@/components/patients/patient-table';
import { ThemeControl } from '@/components/theme-control';

type Panel = { mode: 'create' } | { mode: 'view' | 'edit'; patient: Patient } | null;
type Filter = PatientStatus | 'All';

function initialQuery() {
  const params = new URLSearchParams(window.location.search);
  const fields = ['q', 'status', 'city', 'page', 'pageSize', 'sortBy', 'sortOrder'];

  const parsed = patientListQuerySchema.safeParse(
    Object.fromEntries([...params].filter(([key]) => fields.includes(key))),
  );

  return parsed.success ? parsed.data : patientListQuerySchema.parse({});
}

export function PatientsPage() {
  const addPatientButton = useRef<HTMLButtonElement>(null);
  const panelOpener = useRef<HTMLButtonElement>(null);

  const [listQuery, setListQuery] = useState(initialQuery);
  const [search, setSearchInput] = useState(listQuery.q);
  const query = usePatients(listQuery);
  const metadata = usePatientMetadata();
  const filter: Filter = listQuery.status || 'All';

  function updateQuery(change: Partial<PatientListQuery>) {
    setListQuery((previous) => ({ ...previous, ...change, page: change.page ?? 1 }));
  }

  useDebounce(
    () => {
      if (search !== listQuery.q) {
        updateQuery({ q: search });
      }
    },
    300,
    [search],
  );

  function setSearch(q: string) {
    setSearchInput(q);

    if (!q) {
      updateQuery({ q });
    }
  }

  function setFilter(status: Filter) {
    updateQuery({ status: status === 'All' ? undefined : status });
  }

  const [panel, setPanel] = useState<Panel>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [notice, setNotice] = useState('');

  const patients = query.data?.data || [];
  const counts = metadata.data?.counts;
  const total = query.data?.pagination.total ?? 0;
  const totalPages = query.data ? Math.ceil(total / query.data.pagination.pageSize) : 0;
  const hasFilters = Boolean(listQuery.q || listQuery.status || listQuery.city);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    for (const key of ['q', 'status', 'city', 'page', 'pageSize', 'sortBy', 'sortOrder'] as const) {
      const value = listQuery[key];

      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    }

    const suffix = params.toString();

    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${suffix ? `?${suffix}` : ''}${window.location.hash}`,
    );
  }, [listQuery]);

  // Correct an out-of-range page before committing children with stale page state.
  if (query.data && !query.isPlaceholderData && listQuery.page > Math.max(1, totalPages)) {
    setListQuery({ ...listQuery, page: Math.max(1, totalPages) });
  }

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = setTimeout(() => setNotice(''), 6000);

    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!dirty) {
      return;
    }

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener('beforeunload', handler);

    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function open(next: Panel, opener?: HTMLButtonElement) {
    if (opener) {
      panelOpener.current = opener;
    }
    setDirty(false);
    setPending(false);
    setPanel(next);
  }

  function requestClose() {
    if (pending) {
      return;
    }

    if (dirty) {
      setDiscard(true);
    } else {
      open(null);
    }
  }

  const selected = panel && panel.mode !== 'create' ? panel.patient : undefined;

  const displayed = selected;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center gap-3 border-b border-border bg-surface px-4 sm:gap-4 sm:px-6 md:h-20 md:gap-6 md:px-8">
        <a
          href="/"
          className="flex shrink-0 items-center rounded-sm"
          aria-label="Finni Health patient workspace home"
        >
          <img
            src="/finni-logo.svg"
            alt="Finni Health"
            width="86"
            height="32"
            className="h-6 w-auto sm:h-7"
          />
        </a>
        <span className="hidden h-6 w-px bg-border sm:block" />
        <span className="hidden text-sm text-secondary lg:inline">Patient workspace</span>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="ml-auto hidden rounded-md border border-demo-border bg-demo-bg px-2 py-1 text-xs font-medium text-demo-fg sm:inline sm:px-2.5 sm:py-1.5">
            <span className="hidden xl:inline">Demo · fictional patient data</span>
            <span className="xl:hidden">Fictional data</span>
          </span>
          <ThemeControl />
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-3 pt-8 pb-6 lg:flex lg:px-4">
          <div className="flex items-center gap-2 px-1 pb-8 lg:gap-2.5 lg:px-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-surface-inset text-secondary lg:size-9">
              <FileHeart className="size-5" />
            </span>
            <div>
              <strong className="block text-sm font-semibold">Independent practice</strong>
              <span className="mt-1 block text-xs text-muted">Care team workspace</span>
            </div>
          </div>
          <span className="mx-3 mt-2 mb-3 text-xs font-bold tracking-wider text-secondary">
            WORKSPACE
          </span>
          <a
            href="/"
            className="flex min-h-12 items-center gap-3 rounded-lg border border-accent-border bg-accent-surface p-3 text-base font-semibold text-accent"
            aria-current="page"
          >
            <Users className="size-5" />
            Patients
            <span className="ml-auto min-w-6 rounded bg-accent-count-bg px-1.5 py-0.5 text-center text-xs">
              {counts?.All ?? '—'}
            </span>
          </a>
          <div className="mt-auto flex items-center gap-1.5 px-2.5 pt-4 text-xs text-secondary">
            <span className="size-1 rounded-full bg-brand-orange" />
            Single practice workspace
          </div>
        </aside>
        <main
          className="mx-auto w-full max-w-7xl min-w-0 px-4 py-6 sm:px-6 sm:py-7 lg:px-10 lg:pt-8 lg:pb-10"
          id="main-content"
        >
          <div className="flex items-center gap-2.5 text-sm text-secondary">
            Workspace
            <ChevronRight className="size-5" />
            <span>Patients</span>
          </div>
          <div className="mt-6 mb-7 flex flex-col items-start justify-between gap-5 sm:mt-7 sm:mb-8 sm:flex-row sm:items-center">
            <div>
              <h1 className="mb-2 flex items-center gap-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                Patients
                <span className="grid h-7 min-w-8 place-items-center rounded-md border border-border bg-surface-inset px-1.5 text-sm font-medium tracking-normal text-secondary">
                  {counts?.All ?? '—'}
                </span>
              </h1>
              <p className="max-w-sm text-base text-secondary sm:max-w-none">
                Manage patient records for your practice.
              </p>
            </div>
            <Button
              ref={addPatientButton}
              onClick={(event) => open({ mode: 'create' }, event.currentTarget)}
            >
              <Plus className="size-5" />
              Add patient
            </Button>
          </div>
          <section aria-label="Patient roster">
            <div
              className="mb-5 flex flex-wrap gap-2 md:flex-nowrap md:gap-6 md:overflow-x-auto md:overflow-y-hidden md:border-b md:border-border"
              aria-label="Filter patients by status"
            >
              {(['All', ...STATUSES] as const).map((s) => (
                <button
                  key={s}
                  className={cn(
                    'group flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium whitespace-nowrap text-secondary md:min-h-12 md:shrink-0 md:rounded-none md:border-0 md:border-b-2 md:border-transparent md:bg-transparent md:px-0.5 md:pt-0 md:pb-3.5 md:text-base',
                    'aria-pressed:border-accent aria-pressed:bg-accent-surface aria-pressed:font-semibold aria-pressed:text-accent md:aria-pressed:bg-transparent',
                  )}
                  onClick={() => setFilter(s)}
                  aria-pressed={filter === s}
                >
                  {s === 'All' ? 'All patients' : s}
                  <span className="min-w-6 rounded bg-surface-inset px-1.5 py-0.5 text-xs text-secondary group-aria-pressed:bg-accent-count-bg group-aria-pressed:text-accent-count-fg">
                    {counts?.[s] ?? '—'}
                  </span>
                </button>
              ))}
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6 sm:py-5 lg:gap-5">
                <div className="relative flex w-full max-w-full items-center lg:w-96">
                  <Search className="absolute left-3 size-5 text-secondary" />
                  <Input
                    className="h-11 pr-11 pl-10.5"
                    aria-label="Search patients by name"
                    placeholder="Search by patient name…"
                    maxLength={300}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      className="absolute right-0 grid size-11 place-items-center border-0 bg-transparent text-secondary"
                      aria-label="Clear search"
                      onClick={() => setSearch('')}
                    >
                      <X className="size-5" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm text-secondary">
                    City
                    <select
                      aria-label="Filter by city"
                      className="ml-2 min-h-11 max-w-48 rounded-md border border-border bg-surface px-2 text-primary"
                      value={listQuery.city || ''}
                      onChange={(event) => updateQuery({ city: event.target.value || undefined })}
                    >
                      <option value="">All cities</option>
                      {Array.from(
                        new Set([
                          ...(metadata.data?.cities || []),
                          ...(listQuery.city ? [listQuery.city] : []),
                        ]),
                      ).map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              {metadata.isError && (
                <div
                  className="mx-4 mb-5 rounded-lg border border-error-border bg-error-bg p-4 text-error-fg"
                  role="alert"
                >
                  <p>Unable to refresh patient counts and city options.</p>
                  <Button
                    variant="outline"
                    onClick={() => void metadata.refetch()}
                    disabled={metadata.isFetching}
                  >
                    Retry patient metadata
                  </Button>
                </div>
              )}
              {query.isError && (
                <div
                  className="mx-4 mb-5 flex flex-wrap items-center gap-3.5 rounded-lg border border-error-border bg-error-bg p-4 text-error-fg sm:mx-5 sm:flex-nowrap"
                  role="alert"
                >
                  <AlertCircle className="size-5" />
                  <div>
                    <strong className="text-base">Unable to refresh patients</strong>
                    <p className="mt-1 text-base">{query.error.message}</p>
                  </div>
                  <Button
                    className="ml-8 sm:ml-auto"
                    variant="outline"
                    onClick={() => {
                      void query.refetch();
                    }}
                    disabled={query.isFetching}
                  >
                    <RefreshCw className="size-5" />
                    Try again
                  </Button>
                </div>
              )}
              {query.isPending ? (
                <div className="px-6 py-2.5" role="status" aria-label="Loading patients">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div className="flex gap-12 border-t border-border py-6" key={i}>
                      <span className="h-5 w-1/4 animate-shimmer rounded-md bg-linear-to-r from-surface-inset via-surface-subtle to-surface-inset bg-size-[200%] first:w-1/3" />
                      <span className="h-5 w-1/4 animate-shimmer rounded-md bg-linear-to-r from-surface-inset via-surface-subtle to-surface-inset bg-size-[200%] first:w-1/3" />
                      <span className="h-5 w-1/4 animate-shimmer rounded-md bg-linear-to-r from-surface-inset via-surface-subtle to-surface-inset bg-size-[200%] first:w-1/3" />
                    </div>
                  ))}
                  <span className="sr-only">Loading patients…</span>
                </div>
              ) : patients.length ? (
                <PatientTable
                  patients={patients}
                  sortBy={listQuery.sortBy}
                  sortOrder={listQuery.sortOrder}
                  loading={query.isFetching}
                  onSort={(sortBy) =>
                    updateQuery({
                      sortBy,
                      sortOrder:
                        listQuery.sortBy === sortBy
                          ? listQuery.sortOrder === 'asc'
                            ? 'desc'
                            : 'asc'
                          : sortBy === 'createdAt'
                            ? 'desc'
                            : 'asc',
                    })
                  }
                  onView={(patient, opener) => open({ mode: 'view', patient }, opener)}
                />
              ) : (
                !query.isError && (
                  <div className="flex min-h-80 flex-col items-center justify-center p-9 text-center">
                    <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-surface-inset text-secondary">
                      {hasFilters ? <Search className="size-5" /> : <Users className="size-5" />}
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {hasFilters ? 'No matching patients' : 'Your patient roster starts here'}
                    </h2>
                    <p className="mt-2 mb-6 text-base leading-relaxed text-secondary">
                      {hasFilters
                        ? 'Try another name or clear your filters.'
                        : 'Add your first patient to keep their information in one place.'}
                    </p>
                    {hasFilters ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchInput('');
                          updateQuery({ q: '', status: undefined, city: undefined });
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : (
                      <Button onClick={(event) => open({ mode: 'create' }, event.currentTarget)}>
                        <Plus className="size-5" />
                        Add patient
                      </Button>
                    )}
                  </div>
                )
              )}
              {query.data && !query.isPlaceholderData && !query.isError && (
                <div className="flex flex-col gap-4 border-t border-border px-4 py-4 text-sm text-secondary sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-3">
                  <div className="flex items-center justify-between gap-3 sm:contents">
                    <span className="text-xs sm:text-sm" role="status">
                      Showing {patients.length ? (listQuery.page - 1) * listQuery.pageSize + 1 : 0}–
                      {patients.length
                        ? (listQuery.page - 1) * listQuery.pageSize + patients.length
                        : 0}{' '}
                      of {total} patients
                    </span>
                    <label className="flex shrink-0 items-center gap-2 text-xs sm:text-sm">
                      <span className="sm:hidden">Rows</span>
                      <span className="hidden sm:inline">Per page</span>
                      <select
                        aria-label="Patients per page"
                        className="min-h-11 rounded-md border border-border bg-surface px-2 text-sm text-primary"
                        value={listQuery.pageSize}
                        onChange={(event) => updateQuery({ pageSize: Number(event.target.value) })}
                      >
                        {Array.from(new Set([10, 20, 50, 100, listQuery.pageSize]))
                          .sort((a, b) => a - b)
                          .map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  <nav
                    aria-label="Patient pagination"
                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:gap-3"
                  >
                    <Button
                      className="min-w-0 px-2 text-sm sm:px-4 sm:text-base"
                      variant="outline"
                      disabled={listQuery.page <= 1 || query.isFetching}
                      onClick={() => updateQuery({ page: listQuery.page - 1 })}
                    >
                      Previous
                    </Button>
                    <span className="text-center text-xs whitespace-nowrap sm:text-sm">
                      Page {listQuery.page} of {Math.max(1, totalPages)}
                    </span>
                    <Button
                      className="min-w-0 px-2 text-sm sm:px-4 sm:text-base"
                      variant="outline"
                      disabled={listQuery.page >= totalPages || query.isFetching}
                      onClick={() => updateQuery({ page: listQuery.page + 1 })}
                    >
                      Next
                    </Button>
                  </nav>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
      {notice && (
        <div
          className="fixed bottom-6 left-1/2 z-70 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2.5 rounded-lg bg-success-bg px-4 py-4 text-base text-success-fg shadow-xl sm:w-auto"
          role="status"
        >
          <CheckCircle2 className="size-5" />
          <span>{notice}</span>
          <button
            className="ml-3 grid place-items-center border-0 bg-transparent text-success-icon"
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <X className="size-5" />
          </button>
        </div>
      )}
      <Dialog
        open={!!panel}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            requestClose();
          }
        }}
      >
        <SheetContent
          className={panel?.mode === 'view' ? 'max-w-lg' : undefined}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            // A save can remove the original button from the filtered roster.
            const target = panelOpener.current;
            if (target?.isConnected && !target.disabled) {
              target.focus();
            } else {
              addPatientButton.current?.focus();
            }
            panelOpener.current = null;
          }}
        >
          <div className="border-b border-border p-6 pr-20 sm:pt-7 sm:pr-16 sm:pb-6 sm:pl-8">
            <span className="text-xs font-bold tracking-wider text-secondary">PATIENT RECORD</span>
            <DialogTitle className="mt-2 mb-2 text-2xl leading-tight font-semibold tracking-tight wrap-anywhere sm:text-3xl">
              {panel?.mode === 'create'
                ? 'Add patient'
                : panel?.mode === 'edit'
                  ? 'Edit patient'
                  : displayed
                    ? fullName(displayed)
                    : 'Patient details'}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed text-secondary">
              {panel?.mode === 'create'
                ? 'Create a complete record for your practice.'
                : panel?.mode === 'edit'
                  ? 'Keep this patient’s information up to date.'
                  : 'Essential information, all in one place.'}
            </DialogDescription>
          </div>
          {panel &&
            (panel.mode === 'view' && displayed ? (
              <PatientDetails
                patient={displayed}
                onEdit={() => open({ mode: 'edit', patient: displayed })}
              />
            ) : (
              <PatientForm
                key={panel.mode === 'create' ? 'new' : panel.patient.id}
                patient={selected}
                onDirtyChange={setDirty}
                onPendingChange={setPending}
                onCancel={requestClose}
                onSaved={(p) => {
                  setNotice(
                    panel.mode === 'create'
                      ? `${fullName(p)} was added.`
                      : 'Patient information updated.',
                  );

                  open({ mode: 'view', patient: p });
                }}
              />
            ))}
        </SheetContent>
      </Dialog>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <ConfirmContent>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Discard your changes?
          </DialogTitle>
          <DialogDescription className="mt-3 text-base text-secondary">
            Your unsaved entries will be lost.
          </DialogDescription>
          <div className="mt-6 flex flex-wrap justify-end gap-2 sm:flex-nowrap">
            <Button variant="outline" onClick={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button
              onClick={() => {
                setDiscard(false);
                open(null);
              }}
            >
              Discard changes
            </Button>
          </div>
        </ConfirmContent>
      </Dialog>
    </div>
  );
}
