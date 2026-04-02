import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  useSession,
  useCompleteSession,
  useReopenSession,
  useUpdateSession,
  useCreateLocation,
  useCreateFloor,
  useDeleteFloor,
  useDuplicateFloor,
  useMappingProfiles,
  formatAddress,
} from './use-sessions';
import type { LocationItem, FloorItem, ScanRecordItem } from './use-sessions';
import { useUpdateQuantity, useManualAdd, useDeleteScan, usePatchScan, useCreateCustomObjectType, useConfirmScan, useUpdateInspectionData, useUploadLabelPhoto, useExtractLabelData } from '../scan/use-scan';
import { apiClient } from '../../lib/api-client';
import PhotoThumbnail from '../../shared/components/PhotoThumbnail';
import ConfirmDialog from '../../shared/components/ConfirmDialog';
import ExportView from '../export/ExportView';
import CameraView from '../scan/CameraView';
import { usePromptCatalog } from '../prompts/use-prompt-catalog';
import SessionCompleteWizard from '../prompts/SessionCompleteWizard';
import DraftAssetsPanel from '../prior-reports/DraftAssetsPanel';
import ObjectTypeSelector from '../scan/ObjectTypeSelector';

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, isError } = useSession(id!);
  const completeSession = useCompleteSession(id!);
  const reopenSession = useReopenSession(id!);
  const updateSession = useUpdateSession(id!);
  const createLocation = useCreateLocation(id!);
  const { data: mappingProfiles } = useMappingProfiles();
  const { data: promptCatalog, refetch: refetchPromptCatalog } = usePromptCatalog(id);
  const [showCompleteWizard, setShowCompleteWizard] = useState(false);
  const [completeWizardError, setCompleteWizardError] = useState<string | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showEditSession, setShowEditSession] = useState(false);
  const [editForm, setEditForm] = useState({
    clientName: '',
    street: '',
    number: '',
    bus: '',
    postalCode: '',
    city: '',
    mappingProfileId: '',
  });

  function openEditSession() {
    if (!session) return;
    setEditForm({
      clientName: session.clientName,
      street: session.street,
      number: session.number,
      bus: session.bus ?? '',
      postalCode: session.postalCode,
      city: session.city,
      mappingProfileId: session.mappingProfileId ?? '',
    });
    setShowEditSession(true);
  }

  function handleSaveSession() {
    updateSession.mutate(
      {
        clientName: editForm.clientName,
        street: editForm.street,
        number: editForm.number,
        bus: editForm.bus || null,
        postalCode: editForm.postalCode,
        city: editForm.city,
        mappingProfileId: editForm.mappingProfileId || null,
      },
      { onSuccess: () => setShowEditSession(false) },
    );
  }

  if (isLoading) return <div className="p-6 text-gray-500">Laden...</div>;
  if (isError || !session) return <div className="p-6 text-red-600">Sessie niet gevonden</div>;

  const isActive = session.status === 'active';
  const totalScans = session.scanRecords.reduce((sum, r) => sum + (r.quantity ?? 1), 0);
  const allFloors = session.locations.flatMap((l) => l.floors);

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{session.clientName}</h1>
            <p className="text-sm text-gray-600">{formatAddress(session)}</p>
          </div>
          <button
            onClick={openEditSession}
            className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 border border-blue-200 rounded-md hover:bg-blue-50 shrink-0"
          >
            Bewerk
          </button>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {session.buildingType.nameNl} &middot; {session.inspector.name} &middot;{' '}
          {new Date(session.createdAt).toLocaleString('nl-BE')} &middot;{' '}
          {totalScans} objecten
          {session.mappingProfile && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              {session.mappingProfile.name} ({session.mappingProfile.country})
            </span>
          )}
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
              allFloors={allFloors}
              sessionScanRecords={session.scanRecords}
              clientName={session.clientName}
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

      {showEditSession && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Sessie bewerken</h3>
              <button onClick={() => setShowEditSession(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-gray-600">Klantnaam</span>
              <input
                type="text"
                value={editForm.clientName}
                onChange={(e) => setEditForm((p) => ({ ...p, clientName: e.target.value }))}
                className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-600">Straat</span>
              <input
                type="text"
                value={editForm.street}
                onChange={(e) => setEditForm((p) => ({ ...p, street: e.target.value }))}
                className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <div className="flex gap-2">
              <label className="block flex-1">
                <span className="text-xs font-medium text-gray-600">Nummer</span>
                <input
                  type="text"
                  value={editForm.number}
                  onChange={(e) => setEditForm((p) => ({ ...p, number: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block w-24">
                <span className="text-xs font-medium text-gray-600">Bus</span>
                <input
                  type="text"
                  value={editForm.bus}
                  onChange={(e) => setEditForm((p) => ({ ...p, bus: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="optioneel"
                />
              </label>
            </div>

            <div className="flex gap-2">
              <label className="block w-28">
                <span className="text-xs font-medium text-gray-600">Postcode</span>
                <input
                  type="text"
                  value={editForm.postalCode}
                  onChange={(e) => setEditForm((p) => ({ ...p, postalCode: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="block flex-1">
                <span className="text-xs font-medium text-gray-600">Stad</span>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-gray-600">Mapping profiel (land)</span>
              <select
                value={editForm.mappingProfileId}
                onChange={(e) => setEditForm((p) => ({ ...p, mappingProfileId: e.target.value }))}
                className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Geen profiel</option>
                {mappingProfiles
                  ?.filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.country})
                    </option>
                  ))}
              </select>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditSession(false)}
                className="flex-1 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleSaveSession}
                disabled={updateSession.isPending || !editForm.clientName.trim() || !editForm.street.trim() || !editForm.number.trim() || !editForm.postalCode.trim() || !editForm.city.trim()}
                className="flex-1 py-2 text-sm bg-blue-700 text-white font-medium rounded-md hover:bg-blue-800 disabled:opacity-50"
              >
                {updateSession.isPending ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

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
  allFloors,
  sessionScanRecords,
  clientName,
}: {
  location: LocationItem;
  sessionId: string;
  isActive: boolean;
  allFloors: FloorItem[];
  sessionScanRecords: ScanRecordItem[];
  clientName: string;
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
          allFloors={allFloors}
          sessionScanRecords={sessionScanRecords}
          clientName={clientName}
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
  allFloors,
  sessionScanRecords,
  clientName,
}: {
  floor: FloorItem;
  isActive: boolean;
  sessionId: string;
  allRecordsInLocation: ScanRecordItem[];
  allFloors: FloorItem[];
  sessionScanRecords: ScanRecordItem[];
  clientName: string;
}) {
  const updateQuantity = useUpdateQuantity();
  const manualAdd = useManualAdd(sessionId);
  const deleteScan = useDeleteScan(sessionId);
  const deleteFloor = useDeleteFloor(sessionId);
  const duplicateFloor = useDuplicateFloor(sessionId);
  const patchScan = usePatchScan(sessionId);
  const createCustomType = useCreateCustomObjectType();
  const confirmScan = useConfirmScan();
  const updateInspection = useUpdateInspectionData(sessionId);
  const uploadLabel = useUploadLabelPhoto(sessionId);
  const extractLabel = useExtractLabelData();

  const [collapsed, setCollapsed] = useState(false);
  const [parentPickerFor, setParentPickerFor] = useState<string | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualStep, setManualStep] = useState<'pick-type' | 'camera' | 'quantity'>('pick-type');
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [manualQty, setManualQty] = useState(1);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [search, setSearch] = useState('');

  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [showDeleteFloorConfirm, setShowDeleteFloorConfirm] = useState(false);
  const [showDuplicatePicker, setShowDuplicatePicker] = useState(false);
  const [editTypeScanId, setEditTypeScanId] = useState<string | null>(null);
  const [classifyScanId, setClassifyScanId] = useState<string | null>(null);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [inlineCustomName, setInlineCustomName] = useState('');
  const [inspectionScanId, setInspectionScanId] = useState<string | null>(null);
  const [inspectionForm, setInspectionForm] = useState<{
    lastInspectionDate: string;
    certifiedUntilDate: string;
    lbLmbPercentage: string;
    lbLmbTestDate: string;
    inspectionComment: string;
    externalInspectionNumber: string;
  }>({
    lastInspectionDate: '',
    certifiedUntilDate: '',
    lbLmbPercentage: '',
    lbLmbTestDate: '',
    inspectionComment: '',
    externalInspectionNumber: '',
  });

  function openInspection(record: typeof floor.scanRecords[0]) {
    setInspectionScanId(record.id);
    setInspectionForm({
      lastInspectionDate: record.lastInspectionDate ? record.lastInspectionDate.split('T')[0] : '',
      certifiedUntilDate: record.certifiedUntilDate ? record.certifiedUntilDate.split('T')[0] : '',
      lbLmbPercentage: record.lbLmbPercentage ?? '',
      lbLmbTestDate: record.lbLmbTestDate ? record.lbLmbTestDate.split('T')[0] : '',
      inspectionComment: record.inspectionComment ?? '',
      externalInspectionNumber: record.externalInspectionNumber ?? '',
    });
  }

  function saveInspection() {
    if (!inspectionScanId) return;
    updateInspection.mutate(
      {
        scanId: inspectionScanId,
        lastInspectionDate: inspectionForm.lastInspectionDate || null,
        certifiedUntilDate: inspectionForm.certifiedUntilDate || null,
        lbLmbPercentage: inspectionForm.lbLmbPercentage || null,
        lbLmbTestDate: inspectionForm.lbLmbTestDate || null,
        inspectionComment: inspectionForm.inspectionComment || null,
        externalInspectionNumber: inspectionForm.externalInspectionNumber || null,
      },
      { onSuccess: () => setInspectionScanId(null) },
    );
  }

  async function handleLabelUpload(scanId: string, file: File) {
    try {
      await uploadLabel.mutateAsync({ scanId, photoBlob: file });
      try {
        await extractLabel.mutateAsync(scanId);
      } catch {
        // extraction best-effort
      }
    } catch {
      // upload failed
    }
  }

  const { data: objectTypes } = useQuery({
    queryKey: ['object-types-all', clientName],
    queryFn: () => apiClient<Array<{ id: string; nameNl: string }>>(`/api/object-types?clientName=${encodeURIComponent(clientName)}`),
    staleTime: Infinity,
    enabled: showManualAdd || editTypeScanId !== null || classifyScanId !== null,
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
      { onSuccess: () => cancelManual() },
    );
  }

  function cancelManual() {
    setShowManualAdd(false);
    setManualStep('pick-type');
    setSelectedTypeId(null);
    setManualQty(1);
    setPhotoBlob(null);
    setSearch('');
    setShowInlineCreate(false);
    setInlineCustomName('');
  }

  function handleDeleteRecord() {
    if (!deleteRecordId) return;
    deleteScan.mutate(deleteRecordId, {
      onSuccess: () => setDeleteRecordId(null),
    });
  }

  function handleDeleteFloor() {
    deleteFloor.mutate(floor.id, {
      onSuccess: () => setShowDeleteFloorConfirm(false),
    });
  }

  function handleDuplicate(targetFloorId: string) {
    duplicateFloor.mutate(
      { floorId: floor.id, targetFloorId },
      { onSuccess: () => setShowDuplicatePicker(false) },
    );
  }

  const selectedTypeName = objectTypes?.find((t) => t.id === selectedTypeId)?.nameNl;
  const recordCount = floor.scanRecords.reduce((s, r) => s + (r.quantity ?? 1), 0);

  if (showManualAdd && manualStep === 'camera') {
    return <CameraView onCapture={handlePhotoTaken} onCancel={() => setManualStep('pick-type')} />;
  }

  const filtered = objectTypes
    ?.filter((t) => t.nameNl.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.nameNl.localeCompare(b.nameNl, 'nl')) ?? [];

  const otherFloors = allFloors.filter((f) => f.id !== floor.id);

  return (
    <div className="border-t border-gray-50">
      {/* Floor header — collapsible */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full px-4 py-2 bg-gray-50 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 transition-transform" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
          <h3 className="text-sm font-medium text-gray-700">{floor.name}</h3>
          <span className="text-xs text-gray-400">({recordCount})</span>
        </div>
        {isActive && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {floor.scanRecords.length > 0 && otherFloors.length > 0 && (
              <button
                onClick={() => setShowDuplicatePicker(true)}
                className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                title="Dupliceer assets"
              >
                Dupliceer
              </button>
            )}
            <button
              onClick={() => setShowDeleteFloorConfirm(true)}
              className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded"
              title="Verdieping verwijderen"
            >
              Verwijder
            </button>
          </div>
        )}
      </button>

      {/* Duplicate floor picker */}
      {showDuplicatePicker && (
        <div className="px-4 py-3 border-t border-gray-100 bg-blue-50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Dupliceer assets naar:</span>
            <button onClick={() => setShowDuplicatePicker(false)} className="text-xs text-gray-500 hover:text-gray-700">&times;</button>
          </div>
          <p className="text-xs text-gray-500">Foto&apos;s worden niet meegekopieerd. Je kan later nieuwe foto&apos;s toevoegen.</p>
          <div className="space-y-1">
            {otherFloors.map((f) => (
              <button
                key={f.id}
                onClick={() => handleDuplicate(f.id)}
                disabled={duplicateFloor.isPending}
                className="w-full text-left px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50"
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible content */}
      {!collapsed && (
        <>
          {floor.scanRecords.length === 0 && !showManualAdd && (
            <div className="px-4 py-2 text-xs text-gray-400 italic">Geen scans</div>
          )}
          {floor.scanRecords.filter((r) => !r.parentScanId).map((record) => {
            const childScans = floor.scanRecords.filter((r) => r.parentScanId === record.id);
            return (
            <div key={record.id}>
            <div
              className="flex items-center gap-3 px-4 py-2 border-t border-gray-50"
            >
              <PhotoThumbnail photoPath={record.photoPath} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {record.confirmedType?.nameNl ?? 'Wacht op classificatie...'}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(record.createdAt).toLocaleTimeString('nl-BE')}
                  {childScans.length > 0 && (
                    <span className="ml-2 text-blue-600">
                      {childScans.length} subasset{childScans.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {record.lastInspectionDate && (
                    <span className="ml-2 text-emerald-600">Keuring ✓</span>
                  )}
                  {record.labelPhotoPath && !record.lastInspectionDate && (
                    <span className="ml-2 text-amber-600">Label ✓</span>
                  )}
                </p>
              </div>
              {isActive && record.status === 'confirmed' ? (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openInspection(record)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 px-1"
                      title="Keuringsdata"
                    >
                      Keuring
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditTypeScanId(record.id)}
                      className="text-xs text-gray-500 hover:text-blue-600 px-1"
                      title="Wijzig type"
                    >
                      Wijzig
                    </button>
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
                    <button
                      onClick={() => setDeleteRecordId(record.id)}
                      className="w-7 h-7 rounded-full bg-red-50 text-sm text-red-500 hover:bg-red-100 ml-0.5"
                      title="Verwijderen"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  {isActive && (record.status === 'classified' || record.status === 'pending') && (
                    <button
                      type="button"
                      onClick={() => setClassifyScanId(record.id)}
                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Classificeer
                    </button>
                  )}
                  {record.quantity > 1 && (
                    <span className="text-xs font-medium text-gray-500">×{record.quantity}</span>
                  )}
                  {!(isActive && (record.status === 'classified' || record.status === 'pending')) && (
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
                  )}
                  {isActive && (
                    <button
                      onClick={() => setDeleteRecordId(record.id)}
                      className="w-7 h-7 rounded-full bg-red-50 text-sm text-red-500 hover:bg-red-100"
                      title="Verwijderen"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
            {childScans.length > 0 && (
              <div className="ml-12 border-l-2 border-blue-100">
                {childScans.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-3 px-4 py-1.5 text-sm"
                  >
                    <span className="text-blue-400 text-xs">↳</span>
                    <span className="text-gray-700 flex-1 truncate">{child.confirmedType?.nameNl ?? '?'}</span>
                    <span className="text-xs font-medium text-gray-500 tabular-nums">×{child.quantity}</span>
                    {isActive && (
                      <button
                        onClick={() => setDeleteRecordId(child.id)}
                        className="w-6 h-6 rounded-full bg-red-50 text-xs text-red-500 hover:bg-red-100"
                        title="Verwijderen"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>
            );
          })}

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
                {filtered.length === 0 && !showInlineCreate && (
                  <p className="text-xs text-gray-400 text-center py-3">Geen resultaten</p>
                )}
              </div>
              {!showInlineCreate ? (
                <button
                  type="button"
                  onClick={() => { setShowInlineCreate(true); setInlineCustomName(search); }}
                  className="w-full text-xs text-blue-600 hover:text-blue-700 py-2 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  + Nieuw type aanmaken
                </button>
              ) : (
                <div className="border border-blue-200 rounded-lg p-2 space-y-2 bg-blue-50/50">
                  <input
                    type="text"
                    value={inlineCustomName}
                    onChange={(e) => setInlineCustomName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inlineCustomName.trim()) {
                        createCustomType.mutate({ nameNl: inlineCustomName.trim(), clientName }, {
                          onSuccess: (data) => {
                            handleTypeSelected(data.id);
                            setShowInlineCreate(false);
                            setInlineCustomName('');
                          },
                        });
                      }
                    }}
                    placeholder="Naam nieuw objecttype"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!inlineCustomName.trim()) return;
                        createCustomType.mutate({ nameNl: inlineCustomName.trim(), clientName }, {
                          onSuccess: (data) => {
                            handleTypeSelected(data.id);
                            setShowInlineCreate(false);
                            setInlineCustomName('');
                          },
                        });
                      }}
                      disabled={!inlineCustomName.trim() || createCustomType.isPending}
                      className="flex-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {createCustomType.isPending ? 'Aanmaken...' : 'Aanmaken'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowInlineCreate(false); setInlineCustomName(''); }}
                      className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              )}
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
        </>
      )}

      {/* Parent picker modal */}
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

      {/* Edit type modal */}
      {editTypeScanId && objectTypes && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full max-h-[70vh] overflow-y-auto">
            <ObjectTypeSelector
              objectTypes={objectTypes}
              onSelect={(typeId) => {
                patchScan.mutate({ scanId: editTypeScanId, confirmedTypeId: typeId });
                setEditTypeScanId(null);
              }}
              isLoading={patchScan.isPending}
              onCreateCustom={(name) => {
                createCustomType.mutate({ nameNl: name, clientName }, {
                  onSuccess: (data) => {
                    patchScan.mutate({ scanId: editTypeScanId!, confirmedTypeId: data.id });
                    setEditTypeScanId(null);
                  },
                });
              }}
              isCreating={createCustomType.isPending}
            />
            <div className="px-4 pb-4">
              <button
                type="button"
                className="w-full py-2 text-sm text-gray-600 border border-gray-200 rounded-md"
                onClick={() => setEditTypeScanId(null)}
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Classify scan modal */}
      {classifyScanId && objectTypes && (() => {
        const scanToClassify = floor.scanRecords.find((r) => r.id === classifyScanId);
        const aiTypeId = scanToClassify?.aiProposedTypeId;
        const aiConfidence = scanToClassify?.aiConfidence;
        const aiTypeName = aiTypeId ? objectTypes.find((t) => t.id === aiTypeId)?.nameNl : null;
        return (
          <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full max-h-[70vh] overflow-y-auto">
              {aiTypeId && aiTypeName && (
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs text-gray-500 mb-1">AI-voorstel {aiConfidence ? `(${Math.round(aiConfidence * 100)}%)` : ''}</p>
                  <button
                    type="button"
                    onClick={() => {
                      confirmScan.mutate({ scanId: classifyScanId, confirmedTypeId: aiTypeId });
                      setClassifyScanId(null);
                    }}
                    className="w-full text-left p-3 border-2 border-blue-400 bg-blue-50 rounded-lg hover:bg-blue-100 font-medium text-gray-900"
                  >
                    {aiTypeName}
                  </button>
                  <div className="relative my-3">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                    <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-gray-400">of kies een ander type</span></div>
                  </div>
                </div>
              )}
              <ObjectTypeSelector
                objectTypes={objectTypes}
                onSelect={(typeId) => {
                  confirmScan.mutate({ scanId: classifyScanId, confirmedTypeId: typeId });
                  setClassifyScanId(null);
                }}
                isLoading={confirmScan.isPending}
                onCreateCustom={(name) => {
                  createCustomType.mutate({ nameNl: name, clientName }, {
                    onSuccess: (data) => {
                      confirmScan.mutate({ scanId: classifyScanId!, confirmedTypeId: data.id });
                      setClassifyScanId(null);
                    },
                  });
                }}
                isCreating={createCustomType.isPending}
              />
              <div className="px-4 pb-4">
                <button
                  type="button"
                  className="w-full py-2 text-sm text-gray-600 border border-gray-200 rounded-md"
                  onClick={() => setClassifyScanId(null)}
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Inspection data modal */}
      {inspectionScanId && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Keuringsdata</h3>
              <button onClick={() => setInspectionScanId(null)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>

            <div className="space-y-2">
              <label className="block">
                <span className="text-xs font-medium text-gray-600">Label foto</span>
                <div className="mt-1">
                  {(() => {
                    const rec = floor.scanRecords.find((r) => r.id === inspectionScanId);
                    if (rec?.labelPhotoPath) {
                      return (
                        <div className="flex items-center gap-2">
                          <PhotoThumbnail photoPath={rec.labelPhotoPath} size={60} />
                          <span className="text-xs text-green-600">Label foto aanwezig</span>
                        </div>
                      );
                    }
                    return (
                      <label className="block cursor-pointer">
                        <div className="border border-dashed border-gray-300 rounded-md px-3 py-2 text-center text-xs text-gray-500 hover:border-blue-400 transition-colors">
                          {uploadLabel.isPending || extractLabel.isPending ? 'Verwerken...' : 'Klik om label foto te uploaden'}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLabelUpload(inspectionScanId!, file);
                          }}
                        />
                      </label>
                    );
                  })()}
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-600">Laatste keuringsdatum</span>
                <input
                  type="date"
                  value={inspectionForm.lastInspectionDate}
                  onChange={(e) => setInspectionForm((p) => ({ ...p, lastInspectionDate: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-600">Gekeurd tot datum</span>
                <input
                  type="date"
                  value={inspectionForm.certifiedUntilDate}
                  onChange={(e) => setInspectionForm((p) => ({ ...p, certifiedUntilDate: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-600">LB/LMB %</span>
                <input
                  type="text"
                  value={inspectionForm.lbLmbPercentage}
                  onChange={(e) => setInspectionForm((p) => ({ ...p, lbLmbPercentage: e.target.value }))}
                  placeholder="bv. 85%"
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-600">Datum LB/LMB test</span>
                <input
                  type="date"
                  value={inspectionForm.lbLmbTestDate}
                  onChange={(e) => setInspectionForm((p) => ({ ...p, lbLmbTestDate: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-600">Commentaar keuring</span>
                <textarea
                  value={inspectionForm.inspectionComment}
                  onChange={(e) => setInspectionForm((p) => ({ ...p, inspectionComment: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-600">Ext. keuringsnummer</span>
                <input
                  type="text"
                  value={inspectionForm.externalInspectionNumber}
                  onChange={(e) => setInspectionForm((p) => ({ ...p, externalInspectionNumber: e.target.value }))}
                  className="mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInspectionScanId(null)}
                className="flex-1 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={saveInspection}
                disabled={updateInspection.isPending}
                className="flex-1 py-2 text-sm bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {updateInspection.isPending ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete record confirmation */}
      <ConfirmDialog
        open={!!deleteRecordId}
        title="Object verwijderen"
        message="Weet u zeker dat u dit object wilt verwijderen?"
        confirmLabel="Verwijderen"
        variant="destructive"
        onConfirm={handleDeleteRecord}
        onCancel={() => setDeleteRecordId(null)}
        isLoading={deleteScan.isPending}
      />

      {/* Delete floor confirmation */}
      <ConfirmDialog
        open={showDeleteFloorConfirm}
        title="Verdieping verwijderen"
        message={`Weet u zeker dat u "${floor.name}" en alle ${floor.scanRecords.length} object(en) wilt verwijderen?`}
        confirmLabel="Verwijderen"
        variant="destructive"
        onConfirm={handleDeleteFloor}
        onCancel={() => setShowDeleteFloorConfirm(false)}
        isLoading={deleteFloor.isPending}
      />
    </div>
  );
}
