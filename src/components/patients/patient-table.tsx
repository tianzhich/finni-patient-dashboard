import { ArrowDown, ArrowUp, ArrowUpDown, ArrowRight } from 'lucide-react';
import type { PatientListQuery } from '@shared/api-schema';
import { formatDate, fullName, type Patient } from '@shared/patient-schema';
import { cn } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/patients/status-badge';

const headerStyles = 'h-12 border-y border-border px-4 text-sm font-semibold tracking-wide lg:px-6';

const cellStyles =
  'block min-w-0 border-0 p-0 text-base sm:table-cell sm:border-b sm:border-border sm:px-4 sm:py-4 sm:group-last:border-b-0 lg:px-6';

const mobileLabelStyles =
  'mb-1.5 block text-xs leading-normal font-medium text-secondary normal-nums sm:hidden';

export function PatientTable({
  patients,
  onView,
  sortBy,
  sortOrder,
  onSort,
  loading,
}: {
  patients: Patient[];
  sortBy: PatientListQuery['sortBy'];
  sortOrder: PatientListQuery['sortOrder'];
  onSort: (field: PatientListQuery['sortBy']) => void;
  loading: boolean;
  onView: (patient: Patient, opener: HTMLButtonElement) => void;
}) {
  return (
    <div
      className="overflow-visible focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-accent sm:overflow-x-auto"
      role="region"
      aria-label="Patient records"
      aria-busy={loading}
      tabIndex={0}
    >
      {loading && (
        <span className="sr-only" role="status">
          Updating patients…
        </span>
      )}
      <table
        className="block w-full min-w-0 border-collapse text-left whitespace-normal sm:table sm:min-w-4xl sm:whitespace-nowrap"
        role="table"
      >
        <caption className="sr-only">
          Patient roster, sorted by{' '}
          {sortBy === 'name' ? 'name' : sortBy === 'createdAt' ? 'date added' : 'date of birth'}{' '}
          {sortOrder === 'asc' ? 'ascending' : 'descending'}
        </caption>
        <thead
          className="block bg-surface-subtle text-secondary sm:table-header-group"
          role="rowgroup"
        >
          <tr className="grid grid-cols-2 sm:table-row" role="row">
            <th
              className={cn(headerStyles, 'sm:w-1/4')}
              scope="col"
              aria-sort={
                sortBy === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'
              }
            >
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 border-0 bg-transparent p-0 text-left font-semibold hover:text-primary"
                aria-label="Sort by patient name"
                title={
                  sortBy === 'name' && sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'
                }
                onClick={() => onSort('name')}
              >
                Patient name
                {sortBy !== 'name' ? (
                  <ArrowUpDown className="size-4" aria-hidden="true" />
                ) : sortOrder === 'asc' ? (
                  <ArrowUp className="size-4" aria-hidden="true" />
                ) : (
                  <ArrowDown className="size-4" aria-hidden="true" />
                )}
              </button>
            </th>
            <th
              className={headerStyles}
              scope="col"
              aria-sort={
                sortBy === 'dateOfBirth'
                  ? sortOrder === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 border-0 bg-transparent p-0 text-left font-semibold hover:text-primary"
                aria-label="Sort by date of birth"
                title={
                  sortBy === 'dateOfBirth' && sortOrder === 'asc'
                    ? 'Sort descending'
                    : 'Sort ascending'
                }
                onClick={() => onSort('dateOfBirth')}
              >
                Date of birth
                {sortBy !== 'dateOfBirth' ? (
                  <ArrowUpDown className="size-4" aria-hidden="true" />
                ) : sortOrder === 'asc' ? (
                  <ArrowUp className="size-4" aria-hidden="true" />
                ) : (
                  <ArrowDown className="size-4" aria-hidden="true" />
                )}
              </button>
            </th>
            <th
              className={cn(headerStyles, 'col-span-full')}
              scope="col"
              aria-sort={
                sortBy === 'createdAt' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'
              }
            >
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 border-0 bg-transparent p-0 text-left font-semibold hover:text-primary"
                aria-label="Sort by date added"
                title={
                  sortBy !== 'createdAt' || sortOrder === 'asc'
                    ? 'Newest added first'
                    : 'Oldest added first'
                }
                onClick={() => onSort('createdAt')}
              >
                Date added
                {sortBy !== 'createdAt' ? (
                  <ArrowUpDown className="size-4" aria-hidden="true" />
                ) : sortOrder === 'asc' ? (
                  <ArrowUp className="size-4" aria-hidden="true" />
                ) : (
                  <ArrowDown className="size-4" aria-hidden="true" />
                )}
              </button>
            </th>
            <th className={cn(headerStyles, 'hidden sm:table-cell')} scope="col">
              Status
            </th>
            <th className={cn(headerStyles, 'hidden sm:table-cell')} scope="col">
              Location
            </th>
            <th className={cn(headerStyles, 'hidden sm:table-cell')} scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody
          className={cn('block px-5 sm:table-row-group sm:px-0', loading && 'opacity-50')}
          role="rowgroup"
        >
          {patients.map((p) => (
            <tr
              className="group grid grid-cols-2 items-start gap-x-4 gap-y-5 border-t border-border py-6 sm:table-row sm:border-0 sm:py-0 sm:hover:bg-surface-hover"
              key={p.id}
              role="row"
            >
              <td role="cell" className={cn(cellStyles, 'col-span-full')}>
                <div className="flex items-start gap-3 sm:items-center">
                  <span
                    className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface-inset text-xs font-semibold text-secondary sm:mt-0"
                    aria-hidden="true"
                  >
                    {p.firstName.slice(0, 1)}
                    {p.lastName.slice(0, 1)}
                  </span>
                  <div>
                    <button
                      className="flex min-h-11 items-center border-0 bg-transparent p-0 text-left text-base leading-normal font-semibold wrap-anywhere text-primary hover:underline sm:block sm:min-h-0 sm:max-w-xs sm:whitespace-normal"
                      onClick={(event) => onView(p, event.currentTarget)}
                    >
                      {fullName(p)}
                    </button>
                    <span className="block text-xs tracking-wide text-secondary tabular-nums sm:mt-1">
                      ID · {p.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>
              </td>
              <td role="cell" className={cn(cellStyles, 'text-base text-primary tabular-nums')}>
                <span className={mobileLabelStyles} aria-hidden="true">
                  Date of birth
                </span>
                {formatDate(p.dateOfBirth)}
              </td>
              <td role="cell" className={cn(cellStyles, 'text-base text-primary tabular-nums')}>
                <span className={mobileLabelStyles} aria-hidden="true">
                  Date added
                </span>
                <time dateTime={p.createdAt} title={new Date(p.createdAt).toLocaleString('en-US')}>
                  {new Date(p.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </time>
              </td>
              <td role="cell" className={cellStyles}>
                <span className={mobileLabelStyles} aria-hidden="true">
                  Status
                </span>
                <StatusBadge status={p.status} />
              </td>
              <td role="cell" className={cn(cellStyles, 'text-base wrap-anywhere text-primary')}>
                <span className={mobileLabelStyles} aria-hidden="true">
                  Location
                </span>
                {p.address.city}
                <span className="mt-1 block text-sm text-secondary sm:mt-1">
                  {p.address.state} · {p.address.postalCode}
                </span>
              </td>
              <td role="cell" className={cn(cellStyles, 'self-end justify-self-end')}>
                <button
                  className="inline-flex h-11 min-h-11 items-center gap-1 rounded-lg border border-accent-border bg-transparent px-2.5 text-sm font-semibold text-accent hover:bg-surface-hover sm:gap-1.5 sm:rounded-md sm:border-transparent"
                  aria-label={`View ${fullName(p)}`}
                  onClick={(event) => onView(p, event.currentTarget)}
                >
                  View<span className="sm:hidden"> record</span> <ArrowRight className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
