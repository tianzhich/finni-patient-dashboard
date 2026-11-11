import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PatientListQuery } from '@shared/api-schema';
import { getPatients, getPatientMetadata, savePatient } from '@/api/patient-api';

export function usePatients(query: PatientListQuery) {
  return useQuery({
    queryKey: ['patients', 'list', query],
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => getPatients(query, signal),
    retry: false,
  });
}

export function usePatientMetadata() {
  return useQuery({
    queryKey: ['patients', 'metadata'],
    queryFn: ({ signal }) => getPatientMetadata(signal),
    staleTime: Infinity,
    retry: false,
  });
}

export function useSavePatient() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: savePatient,
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
