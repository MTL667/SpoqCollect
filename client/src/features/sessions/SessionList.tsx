import { useNavigate } from 'react-router';
import { useAuth } from '../auth/use-auth';
import { useSessions, formatAddress } from './use-sessions';

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {isActive ? 'Actief' : 'Voltooid'}
    </span>
  );
}

export default function SessionList() {
  const navigate = useNavigate();
  const { inspector, logout } = useAuth();
  const { data: sessions, isLoading, isError } = useSessions();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Sessies</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{inspector?.name}</span>
          <button onClick={logout} className="text-sm text-red-600 hover:underline">
            Uitloggen
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => navigate('/sessions/new')}
          className="px-4 py-2 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-800"
        >
          + Nieuwe sessie
        </button>
        <button
          onClick={() => navigate('/admin/profiles')}
          className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300"
        >
          Profielen
        </button>
      </div>

      {isLoading && <p className="text-gray-500">Laden...</p>}
      {isError && <p className="text-red-600">Fout bij laden sessies</p>}

      {sessions && sessions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Nog geen sessies</p>
          <p className="text-sm mt-1">Maak een nieuwe sessie aan om te beginnen</p>
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/sessions/${s.id}`)}
              className="w-full text-left bg-white shadow rounded-lg p-4 hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{s.clientName}</p>
                <p className="text-sm text-gray-600">{formatAddress(s)}</p>
                <p className="text-sm text-gray-500">
                  {s.buildingType.nameNl} &middot;{' '}
                  {new Date(s.createdAt).toLocaleDateString('nl-BE')} &middot;{' '}
                  {s._count.scanRecords} objecten
                </p>
              </div>
              <StatusBadge status={s.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
