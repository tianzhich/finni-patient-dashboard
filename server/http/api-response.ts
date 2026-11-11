import type { ErrorRequestHandler, Response } from 'express';
import { API_ERRORS, type ApiErrorCode } from '@shared/api-schema';

export class ApiFailure extends Error {
  constructor(
    public code: ApiErrorCode,
    public fieldErrors?: Record<string, string>,
  ) {
    super(API_ERRORS[code].message);
  }
}

export function sendApiError(error: unknown, response: Response) {
  let code: ApiErrorCode = 'SERVER_ERROR';
  let fieldErrors: Record<string, string> | undefined;

  if (error instanceof ApiFailure) {
    code = error.code;
    fieldErrors = error.fieldErrors;
  } else if (error && typeof error === 'object' && 'type' in error) {
    if (error.type === 'entity.too.large') {
      code = 'REQUEST_TOO_LARGE';
    } else if (error.type === 'entity.parse.failed') {
      code = 'INVALID_REQUEST';
    }
  }

  if (code === 'SERVER_ERROR') {
    console.error('Request failed:', error instanceof Error ? error.name : 'UnknownError');
  }

  const { status, message } = API_ERRORS[code];

  response.status(status).json({
    error: { code, message, ...(code === 'VALIDATION_ERROR' ? { fieldErrors } : {}) },
  });
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  sendApiError(error, res);
};
