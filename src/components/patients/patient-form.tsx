import { useEffect, useState } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, LoaderCircle, Check } from 'lucide-react';
import {
  patientInputSchema,
  STATUSES,
  STATUS_DESCRIPTIONS,
  STATES,
  practiceToday,
  type Patient,
} from '@shared/patient-schema';
import { Button, Input, Select, PanelFooter } from '@/components/ui/primitives';
import { ApiError } from '@/api/http-client';
import { useSavePatient } from '@/hooks/use-patients';

const formSchema = patientInputSchema
  .extend({
    address: patientInputSchema.shape.address.extend({
      // The dropdown starts empty, but submitted data must contain a valid state.
      state: patientInputSchema.shape.address.shape.state
        .or(z.literal(''))
        .pipe(patientInputSchema.shape.address.shape.state),
    }),
    middleName: z.preprocess(
      (value: string) => value.trim(),
      patientInputSchema.shape.middleName.unwrap().or(z.literal('')),
    ),
    noMiddleName: z.boolean(),
  })
  .superRefine((value, context) => {
    if (!value.noMiddleName && !value.middleName) {
      context.addIssue({
        code: 'custom',
        path: ['middleName'],
        message: 'Enter a middle name or select “No middle name”.',
      });
    }
  });

type FormValues = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

export function PatientForm({
  patient,
  onSaved,
  onCancel,
  onDirtyChange,
  onPendingChange,
}: {
  patient?: Patient;
  onSaved: (patient: Patient) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const save = useSavePatient();
  const [saveError, setSaveError] = useState('');

  const form = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: patient
      ? {
          firstName: patient.firstName,
          middleName: patient.middleName || '',
          lastName: patient.lastName,
          noMiddleName: patient.middleName === null,
          dateOfBirth: patient.dateOfBirth,
          status: patient.status,
          address: patient.address,
        }
      : {
          firstName: '',
          middleName: '',
          lastName: '',
          noMiddleName: false,
          dateOfBirth: '',
          status: 'Inquiry',
          address: { line1: '', line2: '', city: '', state: '', postalCode: '' },
        },
  });

  const { isDirty } = form.formState;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onPendingChange(save.isPending);
  }, [save.isPending, onPendingChange]);

  const noMiddleName = useWatch({ control: form.control, name: 'noMiddleName' });
  const status = useWatch({ control: form.control, name: 'status' });

  const fieldError = (name: FieldPath<FormValues>) =>
    form.getFieldState(name, form.formState).error?.message;

  function textField(
    name: FieldPath<FormValues>,
    label: string,
    options: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) {
    const error = fieldError(name);

    return (
      <div className="mb-5 flex min-w-0 flex-col gap-2" key={name}>
        <label className="text-sm font-semibold text-label" htmlFor={name}>
          {label}
        </label>
        <Input
          {...form.register(name)}
          id={name}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          {...options}
        />
        {error && (
          <p className="text-sm leading-normal text-error-fg" id={`${name}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  }

  async function submit(values: FormOutput) {
    setSaveError('');

    const { noMiddleName: absent, ...rest } = values;

    try {
      const saved = await save.mutateAsync({
        id: patient?.id,
        input: { ...rest, middleName: absent ? null : rest.middleName },
      });

      onDirtyChange(false);
      onPendingChange(false);
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        for (const [name, message] of Object.entries(error.fieldErrors)) {
          if (name) {
            form.setError(name as FieldPath<FormValues>, { type: 'server', message });
          }
        }
      }

      setSaveError(error instanceof Error ? error.message : 'Unable to save. Please try again.');
    }
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(submit)} noValidate>
      <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:px-8 sm:py-6">
        <div className="mb-6 flex items-start gap-2 rounded-md bg-surface-subtle p-3 text-sm leading-relaxed text-secondary">
          <Check className="size-5" /> All patient details are required unless marked optional.
        </div>
        <fieldset className="mb-6 min-w-0 border-0 p-0" disabled={save.isPending}>
          <legend className="mb-2 text-lg font-semibold tracking-tight">Patient information</legend>
          <p className="mb-4 text-sm leading-relaxed text-secondary">
            Enter the details of the person receiving care.
          </p>
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-4">
            {textField('firstName', 'First name', { autoComplete: 'off', maxLength: 100 })}
            {textField('lastName', 'Last name', { autoComplete: 'off', maxLength: 100 })}
          </div>
          {textField('middleName', 'Middle name', {
            disabled: noMiddleName || save.isPending,
            maxLength: 100,
          })}
          <label className="-mt-1.5 flex min-h-11 cursor-pointer items-center gap-2 py-1.5 text-sm text-secondary">
            <input
              className="size-4.5 accent-accent"
              type="checkbox"
              {...form.register('noMiddleName', {
                onChange: () => {
                  form.clearErrors('middleName');
                },
              })}
            />
            No middle name
          </label>
          <div className="mt-6 grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-4">
            {textField('dateOfBirth', 'Date of birth', {
              type: 'date',
              max: practiceToday(),
              min: '0001-01-01',
              'aria-label': 'Date of birth',
            })}
            <div className="mb-5 flex min-w-0 flex-col gap-2">
              <label className="text-sm font-semibold text-label" htmlFor="status">
                Status
              </label>
              <Select
                id="status"
                {...form.register('status')}
                aria-describedby="status-help"
                aria-invalid={!!fieldError('status')}
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
              {fieldError('status') && (
                <p className="text-sm leading-normal text-error-fg">{fieldError('status')}</p>
              )}
            </div>
          </div>
          <p id="status-help" className="-mt-2 text-sm leading-relaxed text-secondary">
            {STATUS_DESCRIPTIONS[status]}
          </p>
        </fieldset>
        <fieldset className="mb-6 min-w-0 border-0 p-0" disabled={save.isPending}>
          <legend className="mb-2 text-lg font-semibold tracking-tight">Home address</legend>
          <p className="mb-4 text-sm leading-relaxed text-secondary">
            Use the patient’s US residential address.
          </p>
          {textField('address.line1', 'Street address', { maxLength: 200 })}
          {textField('address.line2', 'Apartment, suite, or unit (optional)', { maxLength: 100 })}
          {textField('address.city', 'City', { maxLength: 100 })}
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 sm:gap-4">
            <div className="mb-5 flex min-w-0 flex-col gap-2">
              <label className="text-sm font-semibold text-label" htmlFor="address.state">
                State or territory
              </label>
              <Select
                id="address.state"
                {...form.register('address.state')}
                aria-invalid={!!fieldError('address.state')}
                aria-describedby={fieldError('address.state') ? 'state-error' : undefined}
              >
                <option value="">Select state</option>
                {STATES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </Select>
              {fieldError('address.state') && (
                <p id="state-error" className="text-sm leading-normal text-error-fg">
                  {fieldError('address.state')}
                </p>
              )}
            </div>
            {textField('address.postalCode', 'ZIP code', {
              placeholder: 'e.g. 02108',
              maxLength: 10,
            })}
          </div>
        </fieldset>
        {saveError && (
          <div
            className="flex items-start gap-2 rounded-lg border border-error-border bg-error-bg p-3 text-base leading-relaxed text-error-fg"
            role="alert"
          >
            <AlertCircle className="size-5" />
            <span>{saveError}</span>
          </div>
        )}
      </div>
      <PanelFooter>
        <Button variant="outline" type="button" onClick={onCancel} disabled={save.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <LoaderCircle className="size-4 animate-spin" />}
          {save.isPending ? 'Saving…' : patient ? 'Save changes' : 'Add patient'}
        </Button>
      </PanelFooter>
    </form>
  );
}
