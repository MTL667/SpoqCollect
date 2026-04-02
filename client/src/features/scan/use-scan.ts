import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUploadScan(sessionId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ photoBlob, floorId }: { photoBlob: Blob; floorId: string }) => {
      const formData = new FormData();
      formData.append('photo', photoBlob, 'scan.jpg');
      formData.append('floorId', floorId);

      const token = localStorage.getItem('inventarispoq_auth');
      const parsed = token ? JSON.parse(token) : null;

      const res = await fetch(`/api/sessions/${sessionId}/scans`, {
        method: 'POST',
        headers: parsed?.token
          ? { Authorization: `Bearer ${parsed.token}` }
          : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Upload failed');
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });
}

export function useUpdateQuantity() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ scanId, quantity }: { scanId: string; quantity: number }) => {
      const token = localStorage.getItem('inventarispoq_auth');
      const parsed = token ? JSON.parse(token) : null;

      const res = await fetch(`/api/scans/${scanId}/quantity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {}),
        },
        body: JSON.stringify({ quantity }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Update failed');
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useManualAdd(sessionId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ floorId, confirmedTypeId, quantity, photoBlob }: {
      floorId: string;
      confirmedTypeId: string;
      quantity: number;
      photoBlob?: Blob;
    }) => {
      const formData = new FormData();
      formData.append('floorId', floorId);
      formData.append('confirmedTypeId', confirmedTypeId);
      formData.append('quantity', String(quantity));
      if (photoBlob) formData.append('photo', photoBlob, 'manual.jpg');

      const token = localStorage.getItem('inventarispoq_auth');
      const parsed = token ? JSON.parse(token) : null;

      const res = await fetch(`/api/sessions/${sessionId}/scans/manual`, {
        method: 'POST',
        headers: parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Add failed');
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

export function useDeleteScan(sessionId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (scanId: string) => {
      const token = localStorage.getItem('inventarispoq_auth');
      const parsed = token ? JSON.parse(token) : null;

      const res = await fetch(`/api/scans/${scanId}`, {
        method: 'DELETE',
        headers: parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {},
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Delete failed');
      }

      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

export function useConfirmScan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scanId,
      confirmedTypeId,
      quantity,
      onScanPromptAnswers,
    }: {
      scanId: string;
      confirmedTypeId: string;
      quantity?: number;
      onScanPromptAnswers?: Record<string, unknown>;
    }) => {
      const token = localStorage.getItem('inventarispoq_auth');
      const parsed = token ? JSON.parse(token) : null;

      const res = await fetch(`/api/scans/${scanId}/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {}),
        },
        body: JSON.stringify({
          confirmedTypeId,
          quantity: quantity ?? 1,
          ...(onScanPromptAnswers !== undefined ? { onScanPromptAnswers } : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Confirm failed');
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['prompt-catalog'] });
    },
  });
}

export function useCreateSubassets(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ parentScanId, subassets }: {
      parentScanId: string;
      subassets: Array<{ objectTypeId: string; quantity: number }>;
    }) => {
      const token = localStorage.getItem('inventarispoq_auth');
      const parsed = token ? JSON.parse(token) : null;
      const res = await fetch(`/api/scans/${parentScanId}/subassets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {}),
        },
        body: JSON.stringify({ subassets }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Subassets aanmaken mislukt');
      }
      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

export function useUploadLabelPhoto(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scanId, photoBlob }: { scanId: string; photoBlob: Blob }) => {
      const formData = new FormData();
      formData.append('photo', photoBlob, 'label.jpg');
      const token = localStorage.getItem('inventarispoq_auth');
      const parsed = token ? JSON.parse(token) : null;
      const res = await fetch(`/api/scans/${scanId}/label-photo`, {
        method: 'POST',
        headers: parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Label upload failed');
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

export function useExtractLabelData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scanId: string) => {
      const token = localStorage.getItem('inventarispoq_auth');
      const parsed = token ? JSON.parse(token) : null;
      const res = await fetch(`/api/scans/${scanId}/label-photo/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {}),
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Extractie mislukt');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useUpdateInspectionData(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ scanId, ...data }: {
      scanId: string;
      lastInspectionDate?: string | null;
      certifiedUntilDate?: string | null;
      lbLmbPercentage?: string | null;
      lbLmbTestDate?: string | null;
      inspectionComment?: string | null;
      externalInspectionNumber?: string | null;
    }) => {
      const token = localStorage.getItem('inventarispoq_auth');
      const parsed = token ? JSON.parse(token) : null;
      const res = await fetch(`/api/scans/${scanId}/inspection`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Update mislukt');
      }
      return (await res.json()).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}

export function useCreateCustomObjectType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ nameNl, clientName }: { nameNl: string; clientName: string }) => {
      const token = localStorage.getItem('inventarispoq_auth');
      const parsed = token ? JSON.parse(token) : null;
      const res = await fetch('/api/object-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {}),
        },
        body: JSON.stringify({ nameNl, clientName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Aanmaken mislukt');
      }
      const json = await res.json();
      return json.data as { id: string; nameNl: string; nameFr: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['object-types'] });
      qc.invalidateQueries({ queryKey: ['object-types-all'] });
    },
  });
}

export function usePatchScan(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { scanId: string; parentScanId?: string | null; confirmedTypeId?: string }) => {
      const token = localStorage.getItem('inventarispoq_auth');
      const parsed = token ? JSON.parse(token) : null;
      const body: Record<string, unknown> = {};
      if (input.parentScanId !== undefined) body.parentScanId = input.parentScanId;
      if (input.confirmedTypeId !== undefined) body.confirmedTypeId = input.confirmedTypeId;
      const res = await fetch(`/api/scans/${input.scanId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Update failed');
      }
      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', sessionId] });
    },
  });
}
