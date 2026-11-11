import type { PatientStatus } from '@shared/patient-schema';
import { cn } from '@/components/ui/primitives';

const statusStyles = {
  Inquiry: 'border-status-inquiry-border bg-status-inquiry-bg text-status-inquiry-fg',
  Onboarding: 'border-status-onboarding-border bg-status-onboarding-bg text-status-onboarding-fg',
  Active: 'border-status-active-border bg-status-active-bg text-status-active-fg',
  Churned: 'border-status-churned-border bg-status-churned-bg text-status-churned-fg',
} satisfies Record<PatientStatus, string>;

export function StatusBadge({ status }: { status: PatientStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-semibold',
        statusStyles[status],
      )}
    >
      <span className="size-1 rounded-full bg-current" />
      {status}
    </span>
  );
}
