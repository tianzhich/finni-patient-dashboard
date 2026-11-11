import { afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

const clients = new Set<QueryClient>();

export function createQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });

  clients.add(client);
  return client;
}

afterEach(() => {
  for (const client of clients) client.clear();
  clients.clear();
});
