import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useSession, useCompleteSession, useCreateLocation, useCreateFloor, formatAddress } from './use-sessions';
import type { LocationItem, FloorItem } from './use-sessions';
import PhotoThumbnail from '../../shared/components/PhotoThumbnail';
import ConfirmDialog from '../../shared/components/ConfirmDialog';
import ExportView from '../export/ExportView';

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, isError } = useSession(id!);
  const completeSession = useCompleteSession(id!);
  const createLocation = useCreateLocation(id!);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [showAddLocation, setShowAddLocation] = useState(false);

  if (isLoading) return <div className="p-6 text-gray-500">Laden...</div>;
  if (isError || !session) return <div className="p-6 text-red-600">Sessie niet gevonden</div>;

  const isActive = session.status === 'active';
  const totalScans = session.scanRecords.length;

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
                onClick={() => setShowConfirm(true)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Sessie voltooien
              </button>
            </>
          )}
        </div>
        {!isActive && (
          <div className="mt-3">
            <ExportView sessionId={session.id} clientAddress={`${session.clientName} - ${formatAddress(session)}`} status={session.status} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {session.locations.length === 0 && totalScans === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Nog geen locaties</p>
            <p className="text-sm mt-1">Voeg een locatie toe om te beginnen met scannen</p>
          </div>
        ) : (
          session.locations.map((loc) => (
            <LocationSection key={loc.id} location={loc} sessionId={session.id} isActive={isActive} />
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

      <ConfirmDialog
        open={showConfirm}
        title="Sessie voltooien"
        message={`Weet u zeker dat u deze sessie wilt voltooien? Er zijn ${totalScans} objecten gescand.`}
        confirmLabel="Voltooien"
        onConfirm={() => completeSession.mutate()}
        onCancel={() => setShowConfirm(false)}
        isLoading={completeSession.isPending}
      />
    </div>
  );
}

function LocationSection({ location, sessionId, isActive }: { location: LocationItem; sessionId: string; isActive: boolean }) {
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
        <FloorSection key={floor.id} floor={floor} />
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

function FloorSection({ floor }: { floor: FloorItem }) {
  return (
    <div className="border-t border-gray-50">
      <div className="px-4 py-2 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700">{floor.name}</h3>
      </div>
      {floor.scanRecords.length === 0 ? (
        <div className="px-4 py-2 text-xs text-gray-400 italic">Geen scans</div>
      ) : (
        floor.scanRecords.map((record) => (
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
        ))
      )}
    </div>
  );
}
