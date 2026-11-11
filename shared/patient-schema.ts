import { z } from 'zod';

export const STATUSES = ['Inquiry', 'Onboarding', 'Active', 'Churned'] as const;

export const STATUS_DESCRIPTIONS: Record<PatientStatus, string> = {
  Inquiry: 'The family is exploring services with the practice.',
  Onboarding: 'The patient is preparing to start services.',
  Active: 'The patient is currently receiving services.',
  Churned: 'The patient is no longer pursuing or receiving services here.',
};

export type PatientStatus = (typeof STATUSES)[number];

export const STATES = [
  ['AL', 'Alabama'],
  ['AK', 'Alaska'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
  ['CA', 'California'],
  ['CO', 'Colorado'],
  ['CT', 'Connecticut'],
  ['DE', 'Delaware'],
  ['DC', 'District of Columbia'],
  ['FL', 'Florida'],
  ['GA', 'Georgia'],
  ['HI', 'Hawaii'],
  ['ID', 'Idaho'],
  ['IL', 'Illinois'],
  ['IN', 'Indiana'],
  ['IA', 'Iowa'],
  ['KS', 'Kansas'],
  ['KY', 'Kentucky'],
  ['LA', 'Louisiana'],
  ['ME', 'Maine'],
  ['MD', 'Maryland'],
  ['MA', 'Massachusetts'],
  ['MI', 'Michigan'],
  ['MN', 'Minnesota'],
  ['MS', 'Mississippi'],
  ['MO', 'Missouri'],
  ['MT', 'Montana'],
  ['NE', 'Nebraska'],
  ['NV', 'Nevada'],
  ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'],
  ['NY', 'New York'],
  ['NC', 'North Carolina'],
  ['ND', 'North Dakota'],
  ['OH', 'Ohio'],
  ['OK', 'Oklahoma'],
  ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'],
  ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'],
  ['SD', 'South Dakota'],
  ['TN', 'Tennessee'],
  ['TX', 'Texas'],
  ['UT', 'Utah'],
  ['VT', 'Vermont'],
  ['VA', 'Virginia'],
  ['WA', 'Washington'],
  ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
  ['AS', 'American Samoa'],
  ['GU', 'Guam'],
  ['MP', 'Northern Mariana Islands'],
  ['PR', 'Puerto Rico'],
  ['VI', 'US Virgin Islands'],
] as const;

export function practiceToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const part = (name: string) => parts.find((p) => p.type === name)!.value;

  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const requiredText = (label: string, max = 100) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const patientInputSchema = z
  .object({
    firstName: requiredText('First name'),
    middleName: requiredText('Middle name').nullable(),
    lastName: requiredText('Last name'),
    dateOfBirth: z
      .string()
      .refine(isCalendarDate, 'Enter a valid date of birth.')
      .refine(
        (v) => !isCalendarDate(v) || v <= practiceToday(),
        'Date of birth cannot be in the future.',
      ),
    status: z.enum(STATUSES, { error: 'Choose a valid patient status.' }),
    address: z
      .object({
        line1: requiredText('Street address', 200),
        line2: z
          .string()
          .trim()
          .max(100, 'Apartment or unit must be 100 characters or fewer.')
          .default(''),
        city: requiredText('City'),
        state: z.enum(
          STATES.map(([code]) => code),
          { error: 'Choose a state or territory.' },
        ),
        postalCode: z
          .string()
          .trim()
          .regex(/^\d{5}(-\d{4})?$/, 'Use a 5-digit ZIP or ZIP+4, such as 02108 or 02108-1234.'),
      })
      .strict(),
  })
  .strict();

export type PatientInput = z.output<typeof patientInputSchema>;

export const patientSchema = patientInputSchema.extend({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Patient = z.output<typeof patientSchema>;

export function fullName(patient: Pick<Patient, 'firstName' | 'middleName' | 'lastName'>) {
  return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ');
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

// Administrative status is editable, not an enforced linear clinical workflow.
export function canChangeStatus(from: PatientStatus, to: PatientStatus) {
  return STATUSES.includes(from) && STATUSES.includes(to);
}
