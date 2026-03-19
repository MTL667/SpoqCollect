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

export function useConfirmScan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ scanId, confirmedTypeId, quantity }: { scanId: string; confirmedTypeId: string; quantity?: number }) => {
      const token = localStorage.getItem('inventarispoq_auth');
      const parsed = token ? JSON.parse(token) : null;

      const res = await fetch(`/api/scans/${scanId}/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {}),
        },
        body: JSON.stringify({ confirmedTypeId, quantity: quantity ?? 1 }),
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
    },
  });
}
