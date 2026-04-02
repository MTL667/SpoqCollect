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
  photoPath: string | null;
  labelPhotoPath: string | null;
  floorId: string;
  confirmedTypeId: string | null;
  confirmedType: { nameNl: string } | null;
  aiProposedTypeId: string | null;
  aiConfidence: number | null;
  quantity: number;
  createdAt: string;
  status: string;
  parentScanId?: string | null;
  onScanPromptAnswers?: Record<string, unknown> | null;
  lastInspectionDate?: string | null;
  certifiedUntilDate?: string | null;
  lbLmbPercentage?: string | null;
  lbLmbTestDate?: string | null;
  inspectionComment?: string | null;
  externalInspectionNumber?: string | null;
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

interface MappingProfileSummary {
  id: string;
  name: string;
  country: string;
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
  mappingProfileId?: string | null;
  mappingProfile?: MappingProfileSummary | null;
  inspector: { id: string; name: string };
  locations: LocationItem[];
  scanRecords: ScanRecordItem[];
  sessionPromptData?: Record<string, unknown> | null;
  mappingVersion?: number;
}

export type { SessionListItem, SessionDetail, LocationItem, FloorItem, ScanRecordItem, MappingProfileSummary };

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
  mappingProfileId?: string;
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

export interface CompleteSessionPayload {
  end?: Record<string, string>;
  lightning?: Record<string, string>;
  atex?: Record<string, string>;
}

export function useCompleteSession(sessionId: string) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: CompleteSessionPayload = {}) =>
      apiClient(`/api/sessions/${sessionId}/complete`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
      qc.invalidateQueries({ queryKey: ['prompt-catalog', sessionId] });
      navigate('/sessions');
    },
  });
}

export function usePatchSessionPrompts(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: {
      start?: Record<string, unknown>;
      startCompleted?: boolean;
      end?: Record<string, unknown>;
      lightning?: Record<string, unknown>;
      atex?: Record<string, unknown>;
    }) =>
      apiClient(`/api/sessions/${sessionId}/prompts`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
      qc.invalidateQueries({ queryKey: ['prompt-catalog', sessionId] });
    },
  });
}

export function useUpdateSession(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      clientName?: string;
      street?: string;
      number?: string;
      bus?: string | null;
      postalCode?: string;
      city?: string;
      mappingProfileId?: string | null;
    }) =>
      apiClient<SessionDetail>(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

export function useReopenSession(sessionId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient(`/api/sessions/${sessionId}/reopen`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

export function useMappingProfiles() {
  return useQuery({
    queryKey: ['mapping-profiles'],
    queryFn: () =>
      apiClient<Array<{ id: string; name: string; country: string; active: boolean }>>('/api/admin/mapping-profiles'),
    staleTime: Infinity,
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

export function useDeleteFloor(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (floorId: string) =>
      apiClient(`/api/sessions/${sessionId}/floors/${floorId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

export function useDuplicateFloor(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ floorId, targetFloorId }: { floorId: string; targetFloorId: string }) =>
      apiClient(`/api/sessions/${sessionId}/floors/${floorId}/duplicate`, {
        method: 'POST',
        body: JSON.stringify({ targetFloorId }),
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
