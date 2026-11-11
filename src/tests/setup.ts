import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

beforeEach(() => {
  if (typeof window !== 'undefined') window.history.replaceState(null, '', '/');
  // Fail unexpected requests instead of allowing tests to contact a real service.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('Unexpected fetch in test'))),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (typeof window !== 'undefined') window.history.replaceState(null, '', '/');
  if (typeof window !== 'undefined') window.localStorage.clear();
});
