import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import CameraView from './CameraView';
import ClassificationResult from './ClassificationResult';
import { useUploadScan, useConfirmScan, useCreateCustomObjectType, useCreateSubassets, useUploadLabelPhoto, useExtractLabelData } from './use-scan';
import { useSession, useCreateLocation, useCreateFloor, usePatchSessionPrompts } from '../sessions/use-sessions';
import { apiClient } from '../../lib/api-client';
import type { LocationItem } from '../sessions/use-sessions';
import { usePromptCatalog, type PromptFieldDef } from '../prompts/use-prompt-catalog';
import { DynamicPromptFields } from '../prompts/DynamicPromptFields';

type FlowStep = 'pick-floor' | 'camera' | 'uploading' | 'classifying' | 'confirm' | 'subassets' | 'label-photo';

interface ChildObjectType {
  id: string;
  nameNl: string;
}

interface ObjectTypeWithChildren {
  id: string;
  nameNl: string;
  nameFr: string;
  heliOmCategory: string;
  active: boolean;
  childObjectTypes?: ChildObjectType[];
}

interface ScanState {
  floorId: string | null;
  photoBlob: Blob | null;
  scanRecordId: string | null;
  aiTypeId: string | null;
  aiConfidence: number | null;
  candidates: Array<{ typeId: string; confidence: number }>;
  quantity: number;
}

export default function ScanFlow() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, refetch: refetchSession } = useSession(sessionId!);
  const uploadScan = useUploadScan(sessionId!);
  const confirmScan = useConfirmScan();
  const createCustomType = useCreateCustomObjectType();
  const createSubassets = useCreateSubassets(sessionId!);
  const uploadLabel = useUploadLabelPhoto(sessionId!);
  const extractLabel = useExtractLabelData();
  const patchPrompts = usePatchSessionPrompts(sessionId!);
  const {
    data: catalog,
    isPending: catalogPending,
    isError: catalogError,
    refetch: refetchCatalog,
  } = usePromptCatalog(sessionId);

  const [step, setStep] = useState<FlowStep>('pick-floor');
  const [scanState, setScanState] = useState<ScanState>({
    floorId: null,
    photoBlob: null,
    scanRecordId: null,
    aiTypeId: null,
    aiConfidence: null,
    candidates: [],
    quantity: 1,
  });

  const [sessionStartValues, setSessionStartValues] = useState<Record<string, string>>({});
  const [pendingOnScan, setPendingOnScan] = useState<{ typeId: string; fields: PromptFieldDef[] } | null>(null);
  const [onScanValues, setOnScanValues] = useState<Record<string, string>>({});
  const [pendingSubassets, setPendingSubassets] = useState<{ parentScanId: string; children: ChildObjectType[] } | null>(null);
  const [subassetQuantities, setSubassetQuantities] = useState<Record<string, number>>({});

  const sessionPrompt = catalog?.sessionPromptData as { startCompleted?: boolean } | undefined;
  const needSessionStart =
    !!catalog &&
    catalog.sessionStartFields.length > 0 &&
    sessionPrompt?.startCompleted !== true;

  const clientName = session?.clientName;
  const profileId = (session as { mappingProfileId?: string } | undefined)?.mappingProfileId;

  const { data: objectTypes } = useQuery({
    queryKey: ['object-types', clientName],
    queryFn: () =>
      apiClient<ObjectTypeWithChildren[]>(
        `/api/object-types${clientName ? `?clientName=${encodeURIComponent(clientName)}` : ''}`,
      ),
    staleTime: Infinity,
  });

  const { data: profileSubassets } = useQuery({
    queryKey: ['profile-subassets', profileId],
    queryFn: () =>
      apiClient<{
        subassetConfigs: Array<{
          parentObjectTypeId: string;
          childObjectType: { id: string; nameNl: string };
          sortOrder: number;
        }>;
      }>(`/api/admin/mapping-profiles/${profileId}`).then((p) => p.subassetConfigs),
    enabled: !!profileId,
    staleTime: Infinity,
  });

  function getChildrenForType(typeId: string): ChildObjectType[] {
    if (profileSubassets) {
      return profileSubassets
        .filter((c) => c.parentObjectTypeId === typeId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => c.childObjectType);
    }
    const parentType = objectTypes?.find((t) => t.id === typeId);
    return parentType?.childObjectTypes ?? [];
  }

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

  const [labelPhotoBlob, setLabelPhotoBlob] = useState<Blob | null>(null);
  const [extracting, setExtracting] = useState(false);

  function goToLabelPhoto() {
    setStep('label-photo');
  }

  function resetForNextScan() {
    setScanState((prev) => ({
      ...prev,
      photoBlob: null,
      scanRecordId: null,
      aiTypeId: null,
      aiConfidence: null,
      candidates: [],
      quantity: 1,
    }));
    setPendingOnScan(null);
    setOnScanValues({});
    setPendingSubassets(null);
    setSubassetQuantities({});
    setLabelPhotoBlob(null);
    setExtracting(false);
    setStep('camera');
  }

  function resetAfterConfirm() {
    goToLabelPhoto();
  }

  function runConfirm(typeId: string, onScanPromptAnswers?: Record<string, unknown>) {
    if (!scanState.scanRecordId) return;
    const children = getChildrenForType(typeId);

    confirmScan.mutate(
      {
        scanId: scanState.scanRecordId,
        confirmedTypeId: typeId,
        quantity: scanState.quantity,
        ...(onScanPromptAnswers !== undefined ? { onScanPromptAnswers } : {}),
      },
      {
        onSuccess: () => {
          setPendingOnScan(null);
          setOnScanValues({});

          if (children.length > 0) {
            const init: Record<string, number> = {};
            for (const c of children) init[c.id] = 0;
            setSubassetQuantities(init);
            setPendingSubassets({ parentScanId: scanState.scanRecordId!, children });
            setStep('subassets');
          } else {
            resetAfterConfirm();
          }
        },
      },
    );
  }

  function handleConfirm(typeId: string) {
    const nameNl = objectTypes?.find((t) => t.id === typeId)?.nameNl;
    const fields = nameNl ? catalog?.onScanPromptsByTypeNl[nameNl] : undefined;
    if (fields && fields.length > 0) {
      const init: Record<string, string> = {};
      for (const f of fields) init[f.key] = '';
      setOnScanValues(init);
      setPendingOnScan({ typeId, fields });
      return;
    }
    runConfirm(typeId);
  }

  function submitSessionStart() {
    patchPrompts.mutate(
      { start: { ...sessionStartValues }, startCompleted: true },
      {
        onSuccess: () => {
          refetchCatalog();
          refetchSession();
        },
      },
    );
  }

  if (catalogPending && sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Sessie laden...</p>
      </div>
    );
  }

  if ((catalogError || !catalog) && sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-600 text-center">Kon vragenlijst niet laden.</p>
        <button
          type="button"
          onClick={() => refetchCatalog()}
          className="px-4 py-2 bg-blue-700 text-white rounded-md"
        >
          Opnieuw
        </button>
        <button type="button" onClick={() => navigate(`/sessions/${sessionId}`)} className="text-sm text-blue-700 underline">
          Terug naar sessie
        </button>
      </div>
    );
  }

  if (needSessionStart && catalog) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-4 mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Start van de sessie</h2>
          <p className="text-sm text-gray-600 mb-4">Enkele vragen voor dit gebouwtype.</p>
          <DynamicPromptFields
            fields={catalog.sessionStartFields}
            values={sessionStartValues}
            onChange={(k, v) => setSessionStartValues((p) => ({ ...p, [k]: v }))}
          />
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={() => navigate(`/sessions/${sessionId}`)}
              className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700"
            >
              Terug
            </button>
            <button
              type="button"
              disabled={patchPrompts.isPending}
              onClick={submitSessionStart}
              className="flex-1 py-2 bg-blue-700 text-white font-medium rounded-md disabled:opacity-50"
            >
              {patchPrompts.isPending ? 'Opslaan...' : 'Verder naar scannen'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pendingOnScan) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Extra gegevens</h2>
          <DynamicPromptFields
            fields={pendingOnScan.fields}
            values={onScanValues}
            onChange={(k, v) => setOnScanValues((p) => ({ ...p, [k]: v }))}
          />
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={() => { setPendingOnScan(null); setOnScanValues({}); }}
              className="flex-1 py-2 border border-gray-300 rounded-md"
            >
              Terug
            </button>
            <button
              type="button"
              onClick={() => {
                const answers: Record<string, unknown> = { ...onScanValues };
                for (const f of pendingOnScan.fields) {
                  if (f.type === 'number' && answers[f.key] !== '') {
                    answers[f.key] = Number(answers[f.key]);
                  }
                }
                runConfirm(pendingOnScan.typeId, answers);
              }}
              disabled={confirmScan.isPending}
              className="flex-1 py-2 bg-green-600 text-white font-medium rounded-md disabled:opacity-50"
            >
              Opslaan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'subassets' && pendingSubassets) {
    const hasAny = Object.values(subassetQuantities).some((q) => q > 0);
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Subassets invoeren</h2>
          <p className="text-sm text-gray-500 mb-4">
            Hoeveel componenten heeft deze installatie?
          </p>
          <div className="space-y-3">
            {pendingSubassets.children.map((child) => (
              <div key={child.id} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{child.nameNl}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setSubassetQuantities((p) => ({
                        ...p,
                        [child.id]: Math.max(0, (p[child.id] ?? 0) - 1),
                      }))
                    }
                    disabled={(subassetQuantities[child.id] ?? 0) <= 0}
                    className="w-8 h-8 rounded-full bg-gray-100 text-lg font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-30"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={subassetQuantities[child.id] ?? 0}
                    onChange={(e) =>
                      setSubassetQuantities((p) => ({
                        ...p,
                        [child.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                      }))
                    }
                    className="w-16 text-center text-lg font-bold text-gray-900 border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={() =>
                      setSubassetQuantities((p) => ({
                        ...p,
                        [child.id]: (p[child.id] ?? 0) + 1,
                      }))
                    }
                    className="w-8 h-8 rounded-full bg-blue-100 text-lg font-bold text-blue-700 hover:bg-blue-200"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={resetAfterConfirm}
              className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700"
            >
              Overslaan
            </button>
            <button
              type="button"
              disabled={!hasAny || createSubassets.isPending}
              onClick={() => {
                const subs = Object.entries(subassetQuantities)
                  .filter(([, qty]) => qty > 0)
                  .map(([objectTypeId, quantity]) => ({ objectTypeId, quantity }));
                createSubassets.mutate(
                  { parentScanId: pendingSubassets.parentScanId, subassets: subs },
                  { onSuccess: resetAfterConfirm },
                );
              }}
              className="flex-1 py-2 bg-green-600 text-white font-medium rounded-md disabled:opacity-50"
            >
              {createSubassets.isPending ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'label-photo') {
    const scanId = scanState.scanRecordId;
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Keuringslabel foto</h2>
          <p className="text-sm text-gray-500 mb-4">
            Optioneel: maak een foto van het keuringslabel/sticker. De keuringsdata wordt automatisch uitgelezen.
          </p>

          {!labelPhotoBlob ? (
            <div className="space-y-3">
              <label className="block w-full cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm text-gray-600">Tik om een foto te maken</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setLabelPhotoBlob(file);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={resetForNextScan}
                className="w-full py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Overslaan
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <img
                src={URL.createObjectURL(labelPhotoBlob)}
                alt="Label foto"
                className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
              />
              {extracting && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  Keuringsdata uitlezen...
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLabelPhotoBlob(null)}
                  className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700"
                >
                  Opnieuw
                </button>
                <button
                  type="button"
                  disabled={uploadLabel.isPending || extracting}
                  onClick={async () => {
                    if (!scanId) return;
                    try {
                      await uploadLabel.mutateAsync({ scanId, photoBlob: labelPhotoBlob });
                      setExtracting(true);
                      try {
                        await extractLabel.mutateAsync(scanId);
                      } catch {
                        // extraction is best-effort
                      }
                      setExtracting(false);
                      resetForNextScan();
                    } catch {
                      // upload failed, stay on page
                    }
                  }}
                  className="flex-1 py-2 bg-green-600 text-white font-medium rounded-md disabled:opacity-50"
                >
                  {uploadLabel.isPending ? 'Uploaden...' : extracting ? 'Uitlezen...' : 'Opslaan & verder'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
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
      <div className="bg-white shadow p-4 flex justify-between">
        <button
          onClick={() => navigate(`/sessions/${sessionId}`)}
          className="text-gray-500 text-sm hover:underline"
        >
          &larr; Terug naar sessie
        </button>
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
      <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">Aantal</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setScanState((prev) => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
            disabled={scanState.quantity <= 1}
            className="w-10 h-10 rounded-full bg-gray-100 text-xl font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-gray-100"
          >
            −
          </button>
          <span className="text-2xl font-bold text-gray-900 w-8 text-center tabular-nums">{scanState.quantity}</span>
          <button
            onClick={() => setScanState((prev) => ({ ...prev, quantity: prev.quantity + 1 }))}
            className="w-10 h-10 rounded-full bg-blue-100 text-xl font-bold text-blue-700 hover:bg-blue-200"
          >
            +
          </button>
        </div>
      </div>
      <ClassificationResult
        aiTypeId={scanState.aiTypeId}
        aiConfidence={scanState.aiConfidence}
        candidates={scanState.candidates}
        objectTypes={objectTypes?.map((t) => ({ id: t.id, nameNl: t.nameNl })) ?? []}
        onConfirm={handleConfirm}
        isLoading={confirmScan.isPending}
        onCreateCustom={clientName ? (name) => {
          createCustomType.mutate({ nameNl: name, clientName }, {
            onSuccess: (data) => handleConfirm(data.id),
          });
        } : undefined}
        isCreating={createCustomType.isPending}
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
