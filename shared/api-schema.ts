import { z } from 'zod';
import { patientSchema, STATUSES } from '@shared/patient-schema';

export const API_ERRORS = {
  VALIDATION_ERROR: { status: 400, message: 'Please check the highlighted fields.' },
  NOT_FOUND: { status: 404, message: 'Patient or API endpoint not found.' },
  INVALID_REQUEST: { status: 400, message: 'Invalid JSON request.' },
  REQUEST_TOO_LARGE: { status: 413, message: 'Request is too large.' },
  SERVER_ERROR: { status: 500, message: 'Something went wrong. Please try again.' },
} as const;

export type ApiErrorCode = keyof typeof API_ERRORS;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(Object.keys(API_ERRORS) as [ApiErrorCode, ...ApiErrorCode[]]),
    message: z.string(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
  }),
});

export const patientResponseSchema = z.object({ data: patientSchema });

export const patientListQuerySchema = z
  .object({
    q: z.string().trim().max(300).default(''),
    status: z.enum(STATUSES).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['name', 'dateOfBirth', 'createdAt']).default('name'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

export type PatientListQuery = z.output<typeof patientListQuerySchema>;

export const patientListResponseSchema = z.object({
  data: z.array(patientSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});

export const patientMetadataResponseSchema = z.object({
  cities: z.array(z.string()),
  counts: z.object({
    All: z.number().int().nonnegative(),
    Inquiry: z.number().int().nonnegative(),
    Onboarding: z.number().int().nonnegative(),
    Active: z.number().int().nonnegative(),
    Churned: z.number().int().nonnegative(),
  }),
});

export type PatientListResponse = z.output<typeof patientListResponseSchema>;

export type PatientMetadataResponse = z.output<typeof patientMetadataResponseSchema>;
