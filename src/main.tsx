import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientsPage } from '@/pages/patients-page';
import '@/styles/index.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <a href="#main-content" className="fixed -top-15 left-3 z-100 bg-surface p-3 focus:top-3">
        Skip to patients
      </a>
      <PatientsPage />
    </QueryClientProvider>
  </React.StrictMode>,
);
