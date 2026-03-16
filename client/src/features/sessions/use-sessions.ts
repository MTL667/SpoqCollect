import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { apiClient } from '../../lib/api-client';

interface BuildingTypeSummary {
  id: string;
  nameNl: string;
}

interface SessionListItem {
  id: string;
  clientAddress: string;
  status: string;
  createdAt: string;
  buildingType: BuildingTypeSummary;
  _count: { scanRecords: number };
}

interface ScanRecordItem {
  id: string;
  photoPath: string;
  confirmedTypeId: string | null;
  confirmedType: { nameNl: string } | null;
  createdAt: string;
  status: string;
}

interface SessionDetail {
  id: string;
  clientAddress: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  buildingType: BuildingTypeSummary;
  buildingTypeId: string;
  inspector: { id: string; name: string };
  scanRecords: ScanRecordItem[];
}

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => apiClient<SessionListItem[]>('/api/sessions'),
  });
}

export function useSession(sessionId: string) {
  return useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: () => apiClient<SessionDetail>(`/api/sessions/${sessionId}`),
    enabled: !!sessionId,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { clientAddress: string; buildingTypeId: string }) =>
      apiClient<SessionDetail>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useCompleteSession(sessionId: string) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () =>
      apiClient(`/api/sessions/${sessionId}/complete`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
      navigate('/sessions');
    },
  });
}

export function useBuildingTypes() {
  return useQuery({
    queryKey: ['building-types'],
    queryFn: () =>
      apiClient<Array<{ id: string; nameNl: string; nameFr: string; active: boolean }>>('/api/building-types'),
    staleTime: Infinity,
  });
}
