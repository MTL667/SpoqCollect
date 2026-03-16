import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSession, useCompleteSession } from './use-sessions';
import PhotoThumbnail from '../../shared/components/PhotoThumbnail';
import ConfirmDialog from '../../shared/components/ConfirmDialog';
import ExportView from '../export/ExportView';

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isLoading, isError } = useSession(id!);
  const completeSession = useCompleteSession(id!);
  const [showConfirm, setShowConfirm] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const scanRecords = session?.scanRecords ?? [];

  const virtualizer = useVirtualizer({
    count: scanRecords.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  if (isLoading) return <div className="p-6 text-gray-500">Laden...</div>;
  if (isError || !session) return <div className="p-6 text-red-600">Sessie niet gevonden</div>;

  const isActive = session.status === 'active';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white shadow p-4">
        <button onClick={() => navigate('/sessions')} className="text-blue-700 text-sm mb-2 hover:underline">
          &larr; Terug naar sessies
        </button>
        <h1 className="text-xl font-bold text-gray-900">{session.clientAddress}</h1>
        <div className="text-sm text-gray-500 mt-1">
          {session.buildingType.nameNl} &middot; {session.inspector.name} &middot;{' '}
          {new Date(session.createdAt).toLocaleString('nl-BE')} &middot;{' '}
          {scanRecords.length} objecten
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
            <ExportView sessionId={session.id} clientAddress={session.clientAddress} status={session.status} />
          </div>
        )}
      </div>

      {scanRecords.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-lg">Nog geen scans</p>
            {isActive && <p className="text-sm mt-1">Druk op &quot;Scannen&quot; om te beginnen</p>}
          </div>
        </div>
      ) : (
        <div ref={parentRef} className="flex-1 overflow-auto">
          <div
            style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const record = scanRecords[virtualRow.index];
              return (
                <div
                  key={record.id}
                  className="absolute left-0 right-0 flex items-center gap-3 px-4 py-2 border-b border-gray-100"
                  style={{
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <PhotoThumbnail photoPath={record.photoPath} size={48} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
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
              );
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title="Sessie voltooien"
        message={`Weet u zeker dat u deze sessie wilt voltooien? Er zijn ${scanRecords.length} objecten gescand.`}
        confirmLabel="Voltooien"
        onConfirm={() => completeSession.mutate()}
        onCancel={() => setShowConfirm(false)}
        isLoading={completeSession.isPending}
      />
    </div>
  );
}
