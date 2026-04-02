import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/use-auth';
import { useSessions, formatAddress } from './use-sessions';
import type { SessionListItem } from './use-sessions';

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

type StatusFilter = 'all' | 'active' | 'completed';

function useFilteredSessions(
  sessions: SessionListItem[] | undefined,
  search: string,
  statusFilter: StatusFilter,
  inspectorFilter: string,
) {
  return useMemo(() => {
    if (!sessions) return { filtered: [], inspectors: [] };

    const inspectorMap = new Map<string, string>();
    for (const s of sessions) {
      if (s.inspector) inspectorMap.set(s.inspector.id, s.inspector.name);
    }
    const inspectors = Array.from(inspectorMap, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const q = search.toLowerCase().trim();

    const filtered = sessions.filter((s) => {
      if (statusFilter === 'active' && s.status !== 'active') return false;
      if (statusFilter === 'completed' && s.status !== 'completed') return false;
      if (inspectorFilter && s.inspector?.id !== inspectorFilter) return false;
      if (q) {
        const addr = formatAddress(s).toLowerCase();
        const name = s.clientName.toLowerCase();
        const inspName = s.inspector?.name?.toLowerCase() ?? '';
        if (!name.includes(q) && !addr.includes(q) && !inspName.includes(q)) return false;
      }
      return true;
    });

    return { filtered, inspectors };
  }, [sessions, search, statusFilter, inspectorFilter]);
}

export default function SessionList() {
  const navigate = useNavigate();
  const { inspector, logout } = useAuth();
  const { data: sessions, isLoading, isError } = useSessions();
  const isAdmin = inspector?.role === 'admin';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [inspectorFilter, setInspectorFilter] = useState('');

  const { filtered, inspectors } = useFilteredSessions(sessions, search, statusFilter, inspectorFilter);

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Alle' },
    { value: 'active', label: 'Actief' },
    { value: 'completed', label: 'Voltooid' },
  ];

  const hasActiveFilters = search || statusFilter !== 'all' || inspectorFilter;

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

      <div className="flex gap-3 mb-4">
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

      {/* Search & Filter Bar */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op klantnaam, adres of inspecteur..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status chips */}
          <div className="flex gap-1.5">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-blue-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Inspector dropdown (admin only) */}
          {isAdmin && inspectors.length > 1 && (
            <select
              value={inspectorFilter}
              onChange={(e) => setInspectorFilter(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Alle inspecteurs</option>
              {inspectors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          )}

          {/* Reset */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setInspectorFilter('');
              }}
              className="text-xs text-blue-600 hover:underline ml-auto"
            >
              Wis filters
            </button>
          )}
        </div>

        {/* Result counter */}
        {sessions && sessions.length > 0 && (
          <p className="text-xs text-gray-400">
            {filtered.length === sessions.length
              ? `${sessions.length} sessie${sessions.length !== 1 ? 's' : ''}`
              : `${filtered.length} van ${sessions.length} sessies`}
          </p>
        )}
      </div>

      {isLoading && <p className="text-gray-500">Laden...</p>}
      {isError && <p className="text-red-600">Fout bij laden sessies</p>}

      {sessions && sessions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Nog geen sessies</p>
          <p className="text-sm mt-1">Maak een nieuwe sessie aan om te beginnen</p>
        </div>
      )}

      {sessions && sessions.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Geen sessies gevonden</p>
          <p className="text-sm mt-1">Pas je zoekterm of filters aan</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((s) => (
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
                  {s.inspector?.name && (
                    <span className="ml-1">&middot; {s.inspector.name}</span>
                  )}
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
