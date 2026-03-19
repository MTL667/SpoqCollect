import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import CameraView from './CameraView';
import ClassificationResult from './ClassificationResult';
import { useUploadScan, useConfirmScan } from './use-scan';
import { useSession, useCreateLocation, useCreateFloor } from '../sessions/use-sessions';
import { apiClient } from '../../lib/api-client';
import type { LocationItem } from '../sessions/use-sessions';

type FlowStep = 'pick-floor' | 'camera' | 'uploading' | 'classifying' | 'confirm';

interface ScanState {
  floorId: string | null;
  photoBlob: Blob | null;
  scanRecordId: string | null;
  aiTypeId: string | null;
  aiConfidence: number | null;
  candidates: Array<{ typeId: string; confidence: number }>;
}

export default function ScanFlow() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, refetch: refetchSession } = useSession(sessionId!);
  const uploadScan = useUploadScan(sessionId!);
  const confirmScan = useConfirmScan();

  const [step, setStep] = useState<FlowStep>('pick-floor');
  const [scanState, setScanState] = useState<ScanState>({
    floorId: null,
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

  function handleFloorSelected(floorId: string) {
    setScanState((prev) => ({ ...prev, floorId }));
    setStep('camera');
  }

  async function handleCapture(blob: Blob) {
    setScanState((prev) => ({ ...prev, photoBlob: blob }));
    setStep('uploading');

    try {
      const record = await uploadScan.mutateAsync({ photoBlob: blob, floorId: scanState.floorId! });
      setScanState((prev) => ({ ...prev, scanRecordId: record.id }));

      if (record.status === 'classified' || record.status === 'manual_required') {
        const rawResponse = record.aiRawResponse ? JSON.parse(record.aiRawResponse) : null;
        setScanState((prev) => ({
          ...prev,
          aiTypeId: record.aiProposedTypeId,
          aiConfidence: record.aiConfidence,
          candidates: rawResponse?.candidates ?? [],
        }));
        setStep('confirm');
      } else {
        setStep('classifying');
        pollForClassification(record.id);
      }
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
          setScanState((prev) => ({
            ...prev,
            photoBlob: null,
            scanRecordId: null,
            aiTypeId: null,
            aiConfidence: null,
            candidates: [],
          }));
          setStep('camera');
        },
      },
    );
  }

  if (step === 'pick-floor') {
    return (
      <FloorPicker
        sessionId={sessionId!}
        locations={session?.locations ?? []}
        onSelect={handleFloorSelected}
        onCancel={() => navigate(`/sessions/${sessionId}`)}
        onLocationsChanged={() => refetchSession()}
      />
    );
  }

  if (step === 'camera') {
    return (
      <CameraView
        onCapture={handleCapture}
        onCancel={() => setStep('pick-floor')}
      />
    );
  }

  if (step === 'uploading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-600">Foto analyseren...</p>
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

function FloorPicker({
  sessionId,
  locations,
  onSelect,
  onCancel,
  onLocationsChanged,
}: {
  sessionId: string;
  locations: LocationItem[];
  onSelect: (floorId: string) => void;
  onCancel: () => void;
  onLocationsChanged: () => void;
}) {
  const createLocation = useCreateLocation(sessionId);
  const [newLocName, setNewLocName] = useState('');
  const [addingFloorForLoc, setAddingFloorForLoc] = useState<string | null>(null);

  function handleAddLocation() {
    if (!newLocName.trim()) return;
    createLocation.mutate(newLocName.trim(), {
      onSuccess: () => {
        setNewLocName('');
        onLocationsChanged();
      },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Kies locatie & verdieping</h2>
        <button onClick={onCancel} className="text-blue-700 text-sm hover:underline">
          Terug
        </button>
      </div>

      {locations.length === 0 && (
        <p className="text-gray-500 text-sm mb-4">Voeg eerst een locatie toe</p>
      )}

      <div className="space-y-3">
        {locations.map((loc) => (
          <div key={loc.id} className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 font-semibold text-gray-900 border-b border-gray-100">
              {loc.name}
            </div>
            {loc.floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => onSelect(floor.id)}
                className="w-full text-left px-4 py-3 border-t border-gray-50 hover:bg-blue-50 flex items-center justify-between"
              >
                <span className="text-gray-800">{floor.name}</span>
                <span className="text-blue-600 text-sm">Scan &rarr;</span>
              </button>
            ))}
            {loc.floors.length === 0 && (
              <p className="px-4 py-2 text-xs text-gray-400 italic">Nog geen verdiepingen</p>
            )}
            <AddFloorInline
              sessionId={sessionId}
              locationId={loc.id}
              isAdding={addingFloorForLoc === loc.id}
              onStartAdding={() => setAddingFloorForLoc(loc.id)}
              onDone={() => { setAddingFloorForLoc(null); onLocationsChanged(); }}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 bg-white rounded-lg shadow p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newLocName}
            onChange={(e) => setNewLocName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nieuwe locatie (bv. Hoofdgebouw)..."
          />
          <button
            onClick={handleAddLocation}
            disabled={createLocation.isPending || !newLocName.trim()}
            className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function AddFloorInline({
  sessionId,
  locationId,
  isAdding,
  onStartAdding,
  onDone,
}: {
  sessionId: string;
  locationId: string;
  isAdding: boolean;
  onStartAdding: () => void;
  onDone: () => void;
}) {
  const createFloor = useCreateFloor(sessionId, locationId);
  const [name, setName] = useState('');

  function handleAdd() {
    if (!name.trim()) return;
    createFloor.mutate(name.trim(), {
      onSuccess: () => {
        setName('');
        onDone();
      },
    });
  }

  if (!isAdding) {
    return (
      <button
        onClick={onStartAdding}
        className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-700 border-t border-gray-100"
      >
        + Verdieping
      </button>
    );
  }

  return (
    <div className="flex gap-2 px-4 py-2 border-t border-gray-100">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="bv. Gelijkvloers, V1, Kelder..."
        autoFocus
      />
      <button
        onClick={handleAdd}
        disabled={createFloor.isPending}
        className="px-3 py-1.5 text-sm bg-blue-700 text-white rounded-md disabled:opacity-50"
      >
        OK
      </button>
    </div>
  );
}
