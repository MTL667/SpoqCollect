import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  useSession,
  useCompleteSession,
  useReopenSession,
  useCreateLocation,
  useCreateFloor,
  formatAddress,
} from './use-sessions';
import type { LocationItem, FloorItem, ScanRecordItem } from './use-sessions';
import { useUpdateQuantity, useManualAdd, usePatchScan } from '../scan/use-scan';
import { apiClient } from '../../lib/api-client';
import PhotoThumbnail from '../../shared/components/PhotoThumbnail';
import ExportView from '../export/ExportView';
import CameraView from '../scan/CameraView';
import { usePromptCatalog } from '../prompts/use-prompt-catalog';
import SessionCompleteWizard from '../prompts/SessionCompleteWizard';
import DraftAssetsPanel from '../prior-reports/DraftAssetsPanel';

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, isError } = useSession(id!);
  const completeSession = useCompleteSession(id!);
  const reopenSession = useReopenSession(id!);
  const createLocation = useCreateLocation(id!);
  const { data: promptCatalog, refetch: refetchPromptCatalog } = usePromptCatalog(id);
  const [showCompleteWizard, setShowCompleteWizard] = useState(false);
  const [completeWizardError, setCompleteWizardError] = useState<string | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [showAddLocation, setShowAddLocation] = useState(false);

  if (isLoading) return <div className="p-6 text-gray-500">Laden...</div>;
  if (isError || !session) return <div className="p-6 text-red-600">Sessie niet gevonden</div>;

  const isActive = session.status === 'active';
  const totalScans = session.scanRecords.reduce((sum, r) => sum + (r.quantity ?? 1), 0);

  function handleAddLocation() {
    if (!newLocationName.trim()) return;
    createLocation.mutate(newLocationName.trim(), {
      onSuccess: () => {
        setNewLocationName('');
        setShowAddLocation(false);
      },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow p-4">
        <button onClick={() => navigate('/sessions')} className="text-blue-700 text-sm mb-2 hover:underline">
          &larr; Terug naar sessies
        </button>
        <h1 className="text-xl font-bold text-gray-900">{session.clientName}</h1>
        <p className="text-sm text-gray-600">{formatAddress(session)}</p>
        <div className="text-sm text-gray-500 mt-1">
          {session.buildingType.nameNl} &middot; {session.inspector.name} &middot;{' '}
          {new Date(session.createdAt).toLocaleString('nl-BE')} &middot;{' '}
          {totalScans} objecten
        </div>
        <div className="mt-3 flex gap-2">
          {isActive && (
            <>
              <button
                onClick={() => navigate(`/sessions/${session.id}/scan`)}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700"
              >
                Scannen
              </button>
              <button
                onClick={() => {
                  setCompleteWizardError(null);
                  refetchPromptCatalog();
                  setShowCompleteWizard(true);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Sessie voltooien
              </button>
            </>
          )}
        </div>
        {!isActive && (
          <div className="mt-3 space-y-2">
            <button
              onClick={() => reopenSession.mutate()}
              disabled={reopenSession.isPending}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {reopenSession.isPending ? 'Hervatten...' : 'Sessie hervatten'}
            </button>
            <ExportView sessionId={session.id} clientAddress={`${session.clientName} - ${formatAddress(session)}`} status={session.status} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <DraftAssetsPanel
          sessionId={session.id}
          isActive={isActive}
          confirmedScans={session.scanRecords.filter((r) => r.status === 'confirmed')}
        />

        {session.locations.length === 0 && totalScans === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Nog geen locaties</p>
            <p className="text-sm mt-1">Voeg een locatie toe om te beginnen met scannen</p>
          </div>
        ) : (
          session.locations.map((loc) => (
            <LocationSection
              key={loc.id}
              location={loc}
              sessionId={session.id}
              isActive={isActive}
              sessionScanRecords={session.scanRecords}
            />
          ))
        )}

        {isActive && (
          <div className="bg-white rounded-lg shadow p-4">
            {showAddLocation ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="bv. Hoofdgebouw, Bijgebouw..."
                  autoFocus
                />
                <button
                  onClick={handleAddLocation}
                  disabled={createLocation.isPending}
                  className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50"
                >
                  Toevoegen
                </button>
                <button
                  onClick={() => { setShowAddLocation(false); setNewLocationName(''); }}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700"
                >
                  Annuleren
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddLocation(true)}
                className="w-full text-center py-2 text-blue-700 font-medium hover:text-blue-800"
              >
                + Locatie toevoegen
              </button>
            )}
          </div>
        )}
      </div>

      <SessionCompleteWizard
        open={showCompleteWizard}
        catalog={promptCatalog}
        onClose={() => setShowCompleteWizard(false)}
        onSubmit={(payload) => {
          setCompleteWizardError(null);
          completeSession.mutate(payload, {
            onError: (e: unknown) =>
              setCompleteWizardError(e instanceof Error ? e.message : 'Sessie voltooien mislukt'),
          });
        }}
        isLoading={completeSession.isPending}
        errorMessage={completeWizardError}
      />
    </div>
  );
}

function LocationSection({
  location,
  sessionId,
  isActive,
  sessionScanRecords,
}: {
  location: LocationItem;
  sessionId: string;
  isActive: boolean;
  sessionScanRecords: ScanRecordItem[];
}) {
  const createFloorMutation = useCreateFloor(sessionId, location.id);
  const [newFloorName, setNewFloorName] = useState('');
  const [showAddFloor, setShowAddFloor] = useState(false);

  function handleAddFloor() {
    if (!newFloorName.trim()) return;
    createFloorMutation.mutate(newFloorName.trim(), {
      onSuccess: () => {
        setNewFloorName('');
        setShowAddFloor(false);
      },
    });
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{location.name}</h2>
      </div>

      {location.floors.map((floor) => (
        <FloorSection
          key={floor.id}
          floor={floor}
          isActive={isActive}
          sessionId={sessionId}
          allRecordsInLocation={location.floors.flatMap((f) => f.scanRecords)}
          sessionScanRecords={sessionScanRecords}
        />
      ))}

      {location.floors.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-400 italic">Nog geen verdiepingen</div>
      )}

      {isActive && (
        <div className="px-4 py-2 border-t border-gray-100">
          {showAddFloor ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFloor()}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="bv. Gelijkvloers, Verdieping 1, Kelder..."
                autoFocus
              />
              <button
                onClick={handleAddFloor}
                disabled={createFloorMutation.isPending}
                className="px-3 py-1.5 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50"
              >
                OK
              </button>
              <button
                onClick={() => { setShowAddFloor(false); setNewFloorName(''); }}
                className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddFloor(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + Verdieping toevoegen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FloorSection({
  floor,
  isActive,
  sessionId,
  allRecordsInLocation,
  sessionScanRecords,
}: {
  floor: FloorItem;
  isActive: boolean;
  sessionId: string;
  allRecordsInLocation: ScanRecordItem[];
  sessionScanRecords: ScanRecordItem[];
}) {
  const updateQuantity = useUpdateQuantity();
  const manualAdd = useManualAdd(sessionId);
  const patchScan = usePatchScan(sessionId);
  const [parentPickerFor, setParentPickerFor] = useState<string | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualStep, setManualStep] = useState<'pick-type' | 'camera' | 'quantity'>('pick-type');
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [manualQty, setManualQty] = useState(1);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [search, setSearch] = useState('');

  const { data: objectTypes } = useQuery({
    queryKey: ['object-types-all'],
    queryFn: () => apiClient<Array<{ id: string; nameNl: string }>>('/api/object-types'),
    staleTime: Infinity,
    enabled: showManualAdd,
  });

  const typesInLocation = useMemo(() => {
    const ids = new Set<string>();
    for (const r of allRecordsInLocation) {
      if (r.confirmedTypeId) ids.add(r.confirmedTypeId);
    }
    return ids;
  }, [allRecordsInLocation]);

  function handleQuantityChange(scanId: string, currentQty: number, delta: number) {
    const newQty = Math.max(1, currentQty + delta);
    if (newQty === currentQty) return;
    updateQuantity.mutate({ scanId, quantity: newQty });
  }

  function handleTypeSelected(typeId: string) {
    setSelectedTypeId(typeId);
    if (typesInLocation.has(typeId)) {
      setManualStep('quantity');
    } else {
      setManualStep('camera');
    }
  }

  function handlePhotoTaken(blob: Blob) {
    setPhotoBlob(blob);
    setManualStep('quantity');
  }

  function handleManualConfirm() {
    if (!selectedTypeId) return;
    manualAdd.mutate(
      { floorId: floor.id, confirmedTypeId: selectedTypeId, quantity: manualQty, photoBlob: photoBlob ?? undefined },
      {
        onSuccess: () => {
          setShowManualAdd(false);
          setManualStep('pick-type');
          setSelectedTypeId(null);
          setManualQty(1);
          setPhotoBlob(null);
          setSearch('');
        },
      },
    );
  }

  function cancelManual() {
    setShowManualAdd(false);
    setManualStep('pick-type');
    setSelectedTypeId(null);
    setManualQty(1);
    setPhotoBlob(null);
    setSearch('');
  }

  const selectedTypeName = objectTypes?.find((t) => t.id === selectedTypeId)?.nameNl;

  if (showManualAdd && manualStep === 'camera') {
    return <CameraView onCapture={handlePhotoTaken} onCancel={() => setManualStep('pick-type')} />;
  }

  const filtered = objectTypes
    ?.filter((t) => t.nameNl.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.nameNl.localeCompare(b.nameNl, 'nl')) ?? [];

  return (
    <div className="border-t border-gray-50">
      <div className="px-4 py-2 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700">{floor.name}</h3>
      </div>
      {floor.scanRecords.length === 0 && !showManualAdd && (
        <div className="px-4 py-2 text-xs text-gray-400 italic">Geen scans</div>
      )}
      {floor.scanRecords.map((record) => (
        <div
          key={record.id}
          className="flex items-center gap-3 px-4 py-2 border-t border-gray-50"
        >
          <PhotoThumbnail photoPath={record.photoPath} size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {record.confirmedType?.nameNl ?? 'Wacht op classificatie...'}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(record.createdAt).toLocaleTimeString('nl-BE')}
            </p>
          </div>
          {isActive && record.status === 'confirmed' ? (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setParentPickerFor(record.id)}
                  className="text-xs text-blue-600 hover:underline px-1"
                >
                  {record.parentScanId ? 'Parent' : 'Koppel'}
                </button>
                <button
                  onClick={() => handleQuantityChange(record.id, record.quantity, -1)}
                  disabled={record.quantity <= 1}
                  className="w-7 h-7 rounded-full bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200 disabled:opacity-30"
                >
                  −
                </button>
                <span className="text-sm font-bold text-gray-900 w-5 text-center tabular-nums">{record.quantity}</span>
                <button
                  onClick={() => handleQuantityChange(record.id, record.quantity, 1)}
                  className="w-7 h-7 rounded-full bg-blue-100 text-sm font-bold text-blue-700 hover:bg-blue-200"
                >
                  +
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              {record.quantity > 1 && (
                <span className="text-xs font-medium text-gray-500">×{record.quantity}</span>
              )}
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  record.status === 'confirmed'
                    ? 'bg-green-100 text-green-700'
                    : record.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {record.status === 'confirmed' ? 'Bevestigd' : record.status === 'pending' ? 'In afwachting' : record.status}
              </span>
            </div>
          )}
        </div>
      ))}

      {isActive && showManualAdd && manualStep === 'pick-type' && (
        <div className="px-4 py-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Selecteer objecttype</span>
            <button onClick={cancelManual} className="text-xs text-gray-500 hover:text-gray-700">&times; Annuleren</button>
          </div>
          <input
            type="text"
            placeholder="Zoeken..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.map((t) => {
              const exists = typesInLocation.has(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => handleTypeSelected(t.id)}
                  className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-blue-50 flex justify-between items-center"
                >
                  <span>{t.nameNl}</span>
                  {exists && <span className="text-xs text-green-600">Bekend</span>}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">Geen resultaten</p>
            )}
          </div>
        </div>
      )}

      {isActive && showManualAdd && manualStep === 'quantity' && (
        <div className="px-4 py-3 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">{selectedTypeName}</span>
            <button onClick={cancelManual} className="text-xs text-gray-500 hover:text-gray-700">&times; Annuleren</button>
          </div>
          {photoBlob && (
            <img src={URL.createObjectURL(photoBlob)} alt="Foto" className="w-full max-h-32 object-contain rounded-lg" />
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Aantal</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setManualQty((q) => Math.max(1, q - 1))}
                disabled={manualQty <= 1}
                className="w-9 h-9 rounded-full bg-gray-100 text-lg font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-30"
              >−</button>
              <span className="text-xl font-bold text-gray-900 w-6 text-center tabular-nums">{manualQty}</span>
              <button
                onClick={() => setManualQty((q) => q + 1)}
                className="w-9 h-9 rounded-full bg-blue-100 text-lg font-bold text-blue-700 hover:bg-blue-200"
              >+</button>
            </div>
          </div>
          <button
            onClick={handleManualConfirm}
            disabled={manualAdd.isPending}
            className="w-full py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {manualAdd.isPending ? 'Toevoegen...' : 'Toevoegen'}
          </button>
        </div>
      )}

      {isActive && !showManualAdd && (
        <button
          onClick={() => setShowManualAdd(true)}
          className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-t border-gray-100"
        >
          + Object toevoegen
        </button>
      )}

      {parentPickerFor && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full max-h-[70vh] overflow-y-auto p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Bovenliggend object</h3>
            <p className="text-xs text-gray-500 mb-3">Kies een andere scan in deze sessie als parent (subasset).</p>
            <button
              type="button"
              className="w-full text-left py-2 px-2 text-sm border-b border-gray-100 hover:bg-gray-50"
              onClick={() => {
                patchScan.mutate({ scanId: parentPickerFor, parentScanId: null });
                setParentPickerFor(null);
              }}
            >
              Geen parent
            </button>
            {sessionScanRecords
              .filter((r) => r.id !== parentPickerFor && r.status === 'confirmed')
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="w-full text-left py-2 px-2 text-sm border-b border-gray-50 hover:bg-blue-50"
                  onClick={() => {
                    patchScan.mutate({ scanId: parentPickerFor, parentScanId: r.id });
                    setParentPickerFor(null);
                  }}
                >
                  {r.confirmedType?.nameNl ?? r.id.slice(0, 8)}
                </button>
              ))}
            <button
              type="button"
              className="w-full mt-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-md"
              onClick={() => setParentPickerFor(null)}
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
