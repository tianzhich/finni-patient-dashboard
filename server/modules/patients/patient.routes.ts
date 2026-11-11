import { Router, type Request } from 'express';
import { patientInputSchema } from '@shared/patient-schema';
import {
  patientMetadataResponseSchema,
  patientListQuerySchema,
  patientListResponseSchema,
  patientResponseSchema,
} from '@shared/api-schema';
import { ApiFailure } from '@server/http/api-response';
import type { patientRepository } from '@server/modules/patients/patient.repository';

function readPatientInput(request: Request) {
  const parsed = patientInputSchema.safeParse(request.body);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};

    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] ??= issue.message;
    }

    throw new ApiFailure('VALIDATION_ERROR', fieldErrors);
  }

  return parsed.data;
}

export function createPatientRouter(patients: ReturnType<typeof patientRepository>) {
  const router = Router();

  router.get('/', (req, res) => {
    const parsed = patientListQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};

      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join('.')] ??= issue.message;
      }

      throw new ApiFailure('VALIDATION_ERROR', fieldErrors);
    }

    res.json(patientListResponseSchema.parse(patients.list(parsed.data)));
  });

  router.get('/metadata', (_req, res) => {
    res.json(patientMetadataResponseSchema.parse(patients.metadata()));
  });

  router.get('/:id', (req, res) => {
    const patient = patients.get(req.params.id);

    if (!patient) {
      throw new ApiFailure('NOT_FOUND');
    }

    res.json(patientResponseSchema.parse({ data: patient }));
  });

  router.post('/', (req, res) => {
    const patient = patients.create(readPatientInput(req));
    const body = patientResponseSchema.parse({ data: patient });

    res.location(`${req.baseUrl}/${patient.id}`).status(201).json(body);
  });

  router.put('/:id', (req, res) => {
    const patient = patients.update(req.params.id, readPatientInput(req));

    if (!patient) {
      throw new ApiFailure('NOT_FOUND');
    }

    res.json(patientResponseSchema.parse({ data: patient }));
  });

  return router;
}
