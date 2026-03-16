import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import CameraView from './CameraView';
import ClassificationResult from './ClassificationResult';
import { useUploadScan, useConfirmScan } from './use-scan';
import { useSession } from '../sessions/use-sessions';
import { apiClient } from '../../lib/api-client';

type FlowStep = 'camera' | 'uploading' | 'classifying' | 'confirm';

interface ScanState {
  photoBlob: Blob | null;
  scanRecordId: string | null;
  aiTypeId: string | null;
  aiConfidence: number | null;
  candidates: Array<{ typeId: string; confidence: number }>;
}

export default function ScanFlow() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session } = useSession(sessionId!);
  const uploadScan = useUploadScan(sessionId!);
  const confirmScan = useConfirmScan();

  const [step, setStep] = useState<FlowStep>('camera');
  const [scanState, setScanState] = useState<ScanState>({
    photoBlob: null,
    scanRecordId: null,
    aiTypeId: null,
    aiConfidence: null,
    candidates: [],
  });

  const { data: objectTypes } = useQuery({
    queryKey: ['object-types', session?.buildingTypeId],
    queryFn: () =>
      apiClient<Array<{ id: string; nameNl: string; nameFr: string; heliOmCategory: string; active: boolean }>>(
        `/api/object-types?buildingTypeId=${session?.buildingTypeId}`,
      ),
    enabled: !!session?.buildingTypeId,
    staleTime: Infinity,
  });

  async function handleCapture(blob: Blob) {
    setScanState((prev) => ({ ...prev, photoBlob: blob }));
    setStep('uploading');

    try {
      const record = await uploadScan.mutateAsync(blob);
      setScanState((prev) => ({ ...prev, scanRecordId: record.id }));
      setStep('classifying');
      pollForClassification(record.id);
    } catch {
      setStep('camera');
    }
  }

  async function pollForClassification(scanRecordId: string) {
    const maxPolls = 30;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const token = localStorage.getItem('inventarispoq_auth');
        const parsed = token ? JSON.parse(token) : null;
        const res = await fetch(`/api/scans/${scanRecordId}/status`, {
          headers: parsed?.token ? { Authorization: `Bearer ${parsed.token}` } : {},
        });
        if (!res.ok) continue;
        const json = await res.json();
        const scan = json.data;

        if (scan.status === 'classified' || scan.status === 'manual_required') {
          const rawResponse = scan.aiRawResponse ? JSON.parse(scan.aiRawResponse) : null;
          setScanState((prev) => ({
            ...prev,
            aiTypeId: scan.aiProposedTypeId,
            aiConfidence: scan.aiConfidence,
            candidates: rawResponse?.candidates ?? [],
          }));
          setStep('confirm');
          return;
        }
      } catch { /* continue polling */ }
    }
    setStep('confirm');
  }

  function handleConfirm(typeId: string) {
    if (!scanState.scanRecordId) return;
    confirmScan.mutate(
      { scanId: scanState.scanRecordId, confirmedTypeId: typeId },
      {
        onSuccess: () => {
          setScanState({ photoBlob: null, scanRecordId: null, aiTypeId: null, aiConfidence: null, candidates: [] });
          setStep('camera');
        },
      },
    );
  }

  if (step === 'camera') {
    return (
      <CameraView
        onCapture={handleCapture}
        onCancel={() => navigate(`/sessions/${sessionId}`)}
      />
    );
  }

  if (step === 'uploading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">Foto uploaden...</p>
        </div>
      </div>
    );
  }

  if (step === 'classifying') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">AI classificeert...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow p-4">
        <button
          onClick={() => setStep('camera')}
          className="text-blue-700 text-sm hover:underline"
        >
          Overslaan &amp; volgende scan
        </button>
      </div>
      {scanState.photoBlob && (
        <div className="p-4">
          <img
            src={URL.createObjectURL(scanState.photoBlob)}
            alt="Captured"
            className="w-full max-h-48 object-contain rounded-lg"
          />
        </div>
      )}
      <ClassificationResult
        aiTypeId={scanState.aiTypeId}
        aiConfidence={scanState.aiConfidence}
        candidates={scanState.candidates}
        objectTypes={objectTypes?.map((t) => ({ id: t.id, nameNl: t.nameNl })) ?? []}
        onConfirm={handleConfirm}
        isLoading={confirmScan.isPending}
      />
    </div>
  );
}
