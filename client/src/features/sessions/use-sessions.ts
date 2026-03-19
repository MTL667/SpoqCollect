import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { apiClient } from '../../lib/api-client';

interface BuildingTypeSummary {
  id: string;
  nameNl: string;
}

interface SessionListItem {
  id: string;
  clientName: string;
  street: string;
  number: string;
  bus: string | null;
  postalCode: string;
  city: string;
  status: string;
  createdAt: string;
  buildingType: BuildingTypeSummary;
  _count: { scanRecords: number };
}

interface ScanRecordItem {
  id: string;
  photoPath: string;
  floorId: string;
  confirmedTypeId: string | null;
  confirmedType: { nameNl: string } | null;
  createdAt: string;
  status: string;
}

interface FloorItem {
  id: string;
  name: string;
  sortOrder: number;
  scanRecords: ScanRecordItem[];
}

interface LocationItem {
  id: string;
  name: string;
  sortOrder: number;
  floors: FloorItem[];
}

interface SessionDetail {
  id: string;
  clientName: string;
  street: string;
  number: string;
  bus: string | null;
  postalCode: string;
  city: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  buildingType: BuildingTypeSummary;
  buildingTypeId: string;
  inspector: { id: string; name: string };
  locations: LocationItem[];
  scanRecords: ScanRecordItem[];
}

export type { SessionListItem, SessionDetail, LocationItem, FloorItem, ScanRecordItem };

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

interface CreateSessionData {
  clientName: string;
  street: string;
  number: string;
  bus?: string;
  postalCode: string;
  city: string;
  buildingTypeId: string;
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSessionData) =>
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

export function useCreateLocation(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiClient<LocationItem>(`/api/sessions/${sessionId}/locations`, {
        method: 'POST',
        body: JSON.stringify({ name }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

export function useCreateFloor(sessionId: string, locationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiClient(`/api/sessions/${sessionId}/locations/${locationId}/floors`, {
        method: 'POST',
        body: JSON.stringify({ name }),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

export function formatAddress(session: { street: string; number: string; bus: string | null; postalCode: string; city: string }) {
  const addr = `${session.street} ${session.number}${session.bus ? ` bus ${session.bus}` : ''}`;
  return `${addr}, ${session.postalCode} ${session.city}`;
}
