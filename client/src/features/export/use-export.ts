import { useMutation } from '@tanstack/react-query';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('inventarispoq_auth');
  const parsed = token ? JSON.parse(token) : null;
  return parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {};
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useExportHeliOm(sessionId: string, clientAddress: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/export/heli-om`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Export failed');
      }

      return res.blob();
    },
    onSuccess: (blob) => {
      const sanitized = clientAddress.replace(/[^a-zA-Z0-9 -]/g, '').replace(/\s+/g, '-');
      const date = new Date().toISOString().split('T')[0];
      triggerDownload(blob, `heli-om-${sanitized}-${date}.xlsx`);
    },
  });
}

export function useExportReport(sessionId: string, clientAddress: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sessions/${sessionId}/export/report`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'Export failed');
      }

      return res.blob();
    },
    onSuccess: (blob) => {
      const sanitized = clientAddress.replace(/[^a-zA-Z0-9 -]/g, '').replace(/\s+/g, '-');
      const date = new Date().toISOString().split('T')[0];
      triggerDownload(blob, `rapport-${sanitized}-${date}.pdf`);
    },
  });
}
