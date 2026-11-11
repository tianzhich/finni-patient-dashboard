import { apiErrorSchema } from '@shared/api-schema';

export class ApiError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export class NetworkError extends ApiError {
  constructor() {
    super('We couldn’t connect. Check your connection and try again.');
  }
}

export async function requestJson(url: string, options?: RequestInit): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(url, options);
  } catch (error) {
    if (options?.signal?.aborted) {
      throw error;
    }

    throw new NetworkError();
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);

    throw new ApiError(
      parsed.success ? parsed.data.error.message : 'The request failed. Please try again.',
      parsed.success ? parsed.data.error.fieldErrors : undefined,
    );
  }

  if (body === null) {
    throw new ApiError('The server returned an unexpected response. Please refresh.');
  }

  return body;
}
