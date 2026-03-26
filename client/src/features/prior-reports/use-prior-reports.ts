import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('inventarispoq_auth');
  const parsed = token ? JSON.parse(token) : null;
  return parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {};
}

export interface DraftAssetItem {
  id: string;
  sessionId: string;
  title: string;
  lastInspectionDate: string | null;
  locationHint: string | null;
  status: string;
  suggestedObjectType: { id: string; nameNl: string } | null;
  matchedScan: {
    id: string;
    confirmedType: { nameNl: string } | null;
  } | null;
  priorReportFile: { originalName: string } | null;
}

export function useDraftAssets(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['draft-assets', sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/draft-assets`, { headers: authHeaders() });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message ?? 'Laden mislukt');
      }
      const j = await res.json();
      return j.data as DraftAssetItem[];
    },
    enabled: !!sessionId,
  });
}

export function useUploadPriorReports() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, files }: { sessionId: string; files: File[] }) => {
      const fd = new FormData();
      for (const f of files) {
        fd.append('reports', f);
      }
      const res = await fetch(`/api/sessions/${sessionId}/prior-reports`, {
        method: 'POST',
        headers: authHeaders(),
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message ?? 'Upload mislukt');
      }
      return res.json() as Promise<{ data: { draftAssets: DraftAssetItem[] } }>;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['draft-assets', v.sessionId] });
      qc.invalidateQueries({ queryKey: ['prior-report-files', v.sessionId] });
      qc.invalidateQueries({ queryKey: ['sessions', v.sessionId] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export interface PriorReportFileItem {
  id: string;
  sessionId: string;
  originalName: string;
  extractionStatus: string;
  extractionError: string | null;
  createdAt: string;
}

export function usePriorReportFiles(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['prior-report-files', sessionId],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/prior-reports`, { headers: authHeaders() });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message ?? 'Laden mislukt');
      }
      const j = await res.json();
      return j.data as PriorReportFileItem[];
    },
    enabled: !!sessionId,
  });
}

export function useDeleteDraftAsset(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draftId: string) => {
      const res = await fetch(`/api/sessions/${sessionId}/draft-assets/${draftId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message ?? 'Verwijderen mislukt');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['draft-assets', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

export function usePatchDraftAsset(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      draftId: string;
      action: 'match' | 'skip' | 'unmatch';
      scanRecordId?: string;
    }) => {
      const res = await fetch(`/api/sessions/${sessionId}/draft-assets/${input.draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          action: input.action,
          ...(input.scanRecordId ? { scanRecordId: input.scanRecordId } : {}),
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error?.message ?? 'Actie mislukt');
      }
      const j = await res.json();
      return j.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['draft-assets', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}
