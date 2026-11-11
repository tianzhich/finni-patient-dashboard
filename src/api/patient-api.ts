import type { PatientInput } from '@shared/patient-schema';
import {
  patientListResponseSchema,
  patientMetadataResponseSchema,
  patientResponseSchema,
  type PatientListQuery,
} from '@shared/api-schema';
import { ApiError, NetworkError, requestJson } from '@/api/http-client';

export async function getPatients(query: PatientListQuery, signal?: AbortSignal) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }

  return patientListResponseSchema.parse(await requestJson(`/api/patients?${params}`, { signal }));
}

export async function getPatientMetadata(signal?: AbortSignal) {
  return patientMetadataResponseSchema.parse(
    await requestJson('/api/patients/metadata', { signal }),
  );
}

export async function savePatient({ id, input }: { id?: string; input: PatientInput }) {
  let body: unknown;

  try {
    body = await requestJson(id ? `/api/patients/${encodeURIComponent(id)}` : '/api/patients', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch (error) {
    if (error instanceof NetworkError) {
      throw new ApiError(
        'We couldn’t confirm the save. Your entries are still here. Check the roster before retrying.',
      );
    }

    throw error;
  }

  return patientResponseSchema.parse(body).data;
}
