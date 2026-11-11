import { CircleHelp, MapPin, Pencil } from 'lucide-react';
import { STATUS_DESCRIPTIONS, formatDate, type Patient } from '@shared/patient-schema';
import { Button, PanelFooter } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/patients/status-badge';

export function PatientDetails({ patient, onEdit }: { patient: Patient; onEdit: () => void }) {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-6 sm:px-8 sm:py-7">
        <div className="mb-8 flex items-center justify-between">
          <div className="grid size-16 place-items-center rounded-2xl border border-accent-border bg-accent-surface text-xl font-medium text-accent">
            {patient.firstName.slice(0, 1)}
            {patient.lastName.slice(0, 1)}
          </div>
          <StatusBadge status={patient.status} />
        </div>
        <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold">Patient information</h3>
        <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-6 border-b border-border pb-7 sm:grid-cols-2">
          <div>
            <dt className="mb-2 text-sm text-secondary">First name</dt>
            <dd className="m-0 text-base wrap-anywhere text-primary">{patient.firstName}</dd>
          </div>
          <div>
            <dt className="mb-2 text-sm text-secondary">Last name</dt>
            <dd className="m-0 text-base wrap-anywhere text-primary">{patient.lastName}</dd>
          </div>
          <div>
            <dt className="mb-2 text-sm text-secondary">Middle name</dt>
            <dd className="m-0 text-base wrap-anywhere text-primary">
              {patient.middleName || 'No middle name'}
            </dd>
          </div>
          <div>
            <dt className="mb-2 text-sm text-secondary">Date of birth</dt>
            <dd className="m-0 text-base wrap-anywhere text-primary">
              {formatDate(patient.dateOfBirth)}
            </dd>
          </div>
        </dl>
        <div className="border-b border-border py-6">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold">
            <MapPin className="size-5" /> Home address
          </h3>
          <p className="text-base leading-loose wrap-anywhere text-primary">
            {patient.address.line1}
            <br />
            {patient.address.line2 && (
              <>
                {patient.address.line2}
                <br />
              </>
            )}
            {patient.address.city}, {patient.address.state} {patient.address.postalCode}
          </p>
        </div>
        <div className="my-6 flex items-start gap-2 rounded-lg border border-border bg-surface-subtle p-3.5 text-sm leading-relaxed text-secondary">
          <CircleHelp className="size-5" />
          <p>{STATUS_DESCRIPTIONS[patient.status]}</p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-secondary">
          <span>Record ID</span>
          <code className="mb-2 text-xs wrap-anywhere">{patient.id}</code>
          <span>Date added</span>
          <span>{new Date(patient.createdAt).toLocaleString('en-US')}</span>
          <span>Last updated</span>
          <span>{new Date(patient.updatedAt).toLocaleString('en-US')}</span>
        </div>
      </div>
      <PanelFooter>
        <Button onClick={onEdit}>
          <Pencil className="size-5" />
          Edit patient
        </Button>
      </PanelFooter>
    </>
  );
}
