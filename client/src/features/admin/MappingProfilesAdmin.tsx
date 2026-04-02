import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import {
  useMappingProfilesList,
  useMappingProfileDetail,
  useCreateMappingProfile,
  useUpdateMappingProfile,
  useCreateSubcontractor,
  useUpdateSubcontractor,
  useCreateSubassetConfig,
  useDeleteSubassetConfig,
  useCreateProfileRule,
  useDeleteProfileRule,
  type ProfileDetail,
  type ProfileSubcontractor,
  type ProfileMappingRule,
} from './use-mapping-profiles';

type Tab = 'overview' | 'subcontractors' | 'rules' | 'subassets';

export default function MappingProfilesAdmin() {
  const navigate = useNavigate();
  const { data: profiles, isLoading } = useMappingProfilesList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: profile } = useMappingProfileDetail(selectedId);
  const [tab, setTab] = useState<Tab>('overview');
  const [showCreateProfile, setShowCreateProfile] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate('/sessions')} className="text-sm text-blue-600 hover:underline mb-1">
              &larr; Terug naar sessies
            </button>
            <h1 className="text-2xl font-bold text-blue-800">Mapping Profielen</h1>
            <p className="text-sm text-gray-500 mt-1">
              Beheer land-specifieke configuraties: subcontractors, mapping regels en subasset structuren.
            </p>
          </div>
          <button
            onClick={() => setShowCreateProfile(true)}
            className="px-4 py-2 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-800"
          >
            + Nieuw profiel
          </button>
        </div>

        <div className="flex gap-6">
          {/* Profile list */}
          <div className="w-64 shrink-0 space-y-2">
            {isLoading && <p className="text-gray-500 text-sm">Laden...</p>}
            {profiles?.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedId(p.id); setTab('overview'); }}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedId === p.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-gray-900">{p.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {p.country} &middot; {p._count.mappingRules} regels &middot; {p._count.sessions} sessies
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          <div className="flex-1 min-w-0">
            {!selectedId && (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Selecteer een profiel om te beheren
              </div>
            )}

            {selectedId && profile && (
              <>
                <div className="bg-white rounded-lg shadow mb-4">
                  <div className="border-b border-gray-200 flex">
                    {(['overview', 'subcontractors', 'rules', 'subassets'] as Tab[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                          tab === t
                            ? 'border-blue-600 text-blue-700'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {{
                          overview: 'Overzicht',
                          subcontractors: `Subcontractors (${profile.subcontractors.length})`,
                          rules: `Regels (${profile.mappingRules.length})`,
                          subassets: `Subassets (${profile.subassetConfigs.length})`,
                        }[t]}
                      </button>
                    ))}
                  </div>
                </div>

                {tab === 'overview' && <ProfileOverview profile={profile} />}
                {tab === 'subcontractors' && <SubcontractorsTab profile={profile} />}
                {tab === 'rules' && <RulesTab profile={profile} />}
                {tab === 'subassets' && <SubassetsTab profile={profile} />}
              </>
            )}
          </div>
        </div>

        {showCreateProfile && (
          <CreateProfileModal onClose={() => setShowCreateProfile(false)} onCreated={(id) => { setSelectedId(id); setShowCreateProfile(false); }} />
        )}
      </div>
    </div>
  );
}

function ProfileOverview({ profile }: { profile: ProfileDetail }) {
  const updateProfile = useUpdateMappingProfile();
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Land:</span>{' '}
          <span className="font-medium">{profile.country}</span>
        </div>
        <div>
          <span className="text-gray-500">Regio-logica:</span>{' '}
          <span className={`font-medium ${profile.hasRegionLogic ? 'text-green-700' : 'text-gray-400'}`}>
            {profile.hasRegionLogic ? 'Ja' : 'Nee'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Odoo export:</span>{' '}
          <span className={`font-medium ${profile.odooExportEnabled ? 'text-green-700' : 'text-gray-400'}`}>
            {profile.odooExportEnabled ? 'Ja' : 'Nee'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Status:</span>{' '}
          <button
            onClick={() => updateProfile.mutate({ id: profile.id, active: !profile.active })}
            disabled={updateProfile.isPending}
            className={`text-xs px-2 py-0.5 rounded-full ${
              profile.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {profile.active ? 'Actief' : 'Inactief'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-700">{profile.subcontractors.length}</div>
          <div className="text-xs text-gray-500">Subcontractors</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-700">{profile.mappingRules.length}</div>
          <div className="text-xs text-gray-500">Mapping regels</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-700">{profile.subassetConfigs.length}</div>
          <div className="text-xs text-gray-500">Subasset configs</div>
        </div>
      </div>
    </div>
  );
}

function SubcontractorsTab({ profile }: { profile: ProfileDetail }) {
  const createSub = useCreateSubcontractor(profile.id);
  const updateSub = useUpdateSubcontractor(profile.id);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [exportLabel, setExportLabel] = useState('');
  const [editingSub, setEditingSub] = useState<ProfileSubcontractor | null>(null);

  const { data: allObjectTypes } = useQuery({
    queryKey: ['object-types-all-admin'],
    queryFn: () => apiClient<Array<{ id: string; nameNl: string }>>('/api/object-types'),
    staleTime: Infinity,
  });

  function handleCreate() {
    if (!name.trim() || !exportLabel.trim()) return;
    createSub.mutate({ name: name.trim(), exportLabel: exportLabel.trim() }, {
      onSuccess: () => { setShowAdd(false); setName(''); setExportLabel(''); },
    });
  }

  return (
    <div className="space-y-3">
      {profile.subcontractors.map((sub) => (
        <div key={sub.id} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-medium text-gray-900">{sub.name}</span>
              <span className="text-xs text-gray-500 ml-2">({sub.exportLabel})</span>
            </div>
            <button
              onClick={() => setEditingSub(editingSub?.id === sub.id ? null : sub)}
              className="text-xs text-blue-600 hover:underline"
            >
              {editingSub?.id === sub.id ? 'Sluiten' : 'Objecttypes beheren'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {sub.objectTypes.map((ot) => (
              <span key={ot.objectTypeId} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                {ot.objectType.nameNl}
              </span>
            ))}
            {sub.objectTypes.length === 0 && (
              <span className="text-xs text-gray-400">Geen objecttypes gekoppeld</span>
            )}
          </div>
          {editingSub?.id === sub.id && allObjectTypes && (
            <SubcontractorObjectTypePicker
              sub={sub}
              allObjectTypes={allObjectTypes}
              onSave={(ids) => {
                updateSub.mutate({ subId: sub.id, objectTypeIds: ids }, {
                  onSuccess: () => setEditingSub(null),
                });
              }}
              saving={updateSub.isPending}
            />
          )}
        </div>
      ))}

      {showAdd ? (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Naam (bv. Simafire)"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            autoFocus
          />
          <input
            type="text"
            value={exportLabel}
            onChange={(e) => setExportLabel(e.target.value)}
            placeholder="Export label (bv. Simafire Odoo)"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createSub.isPending} className="px-3 py-1.5 text-sm bg-blue-700 text-white rounded-md disabled:opacity-50">
              Toevoegen
            </button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md">
              Annuleren
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-2 text-sm text-blue-600 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50"
        >
          + Subcontractor toevoegen
        </button>
      )}
    </div>
  );
}

function SubcontractorObjectTypePicker({
  sub,
  allObjectTypes,
  onSave,
  saving,
}: {
  sub: ProfileSubcontractor;
  allObjectTypes: Array<{ id: string; nameNl: string }>;
  onSave: (ids: string[]) => void;
  saving: boolean;
}) {
  const currentIds = new Set(sub.objectTypes.map((ot) => ot.objectTypeId));
  const [selected, setSelected] = useState<Set<string>>(currentIds);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return allObjectTypes;
    const q = search.toLowerCase();
    return allObjectTypes.filter((ot) => ot.nameNl.toLowerCase().includes(q));
  }, [allObjectTypes, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-3 border-t border-gray-200 pt-3 space-y-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Zoek objecttype..."
        className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
      />
      <div className="max-h-48 overflow-y-auto space-y-1">
        {filtered.map((ot) => (
          <label key={ot.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded text-sm cursor-pointer">
            <input type="checkbox" checked={selected.has(ot.id)} onChange={() => toggle(ot.id)} className="rounded" />
            <span>{ot.nameNl}</span>
          </label>
        ))}
      </div>
      <button
        onClick={() => onSave([...selected])}
        disabled={saving}
        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? 'Opslaan...' : `Opslaan (${selected.size} geselecteerd)`}
      </button>
    </div>
  );
}

function RulesTab({ profile }: { profile: ProfileDetail }) {
  const createRule = useCreateProfileRule(profile.id);
  const deleteRule = useDeleteProfileRule(profile.id);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRules = useMemo(() => {
    if (!searchQuery) return profile.mappingRules;
    const q = searchQuery.toLowerCase();
    return profile.mappingRules.filter(
      (r) =>
        r.objectType.nameNl.toLowerCase().includes(q) ||
        r.odooProductCode.toLowerCase().includes(q) ||
        (r.labelNl && r.labelNl.toLowerCase().includes(q)),
    );
  }, [profile.mappingRules, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, { nameNl: string; rules: ProfileMappingRule[] }>();
    for (const rule of filteredRules) {
      const key = rule.objectTypeId;
      if (!map.has(key)) map.set(key, { nameNl: rule.objectType.nameNl, rules: [] });
      map.get(key)!.rules.push(rule);
    }
    return [...map.entries()].sort((a, b) => a[1].nameNl.localeCompare(b[1].nameNl));
  }, [filteredRules]);

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Zoek op naam, productcode..."
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      />
      <p className="text-xs text-gray-400">{profile.mappingRules.length} regels totaal</p>

      {grouped.map(([typeId, group]) => (
        <div key={typeId} className="bg-white rounded-lg shadow">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-medium text-gray-900 text-sm">{group.nameNl}</h3>
            <span className="text-xs text-gray-400">{group.rules.length} regel(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-3 py-1.5">Code</th>
                  <th className="px-3 py-1.5">Start</th>
                  <th className="px-3 py-1.5">Regio</th>
                  <th className="px-3 py-1.5">Regime</th>
                  <th className="px-3 py-1.5">Prio</th>
                  <th className="px-3 py-1.5">Label</th>
                  <th className="px-3 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {group.rules.map((rule) => (
                  <tr key={rule.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-mono">{rule.odooProductCode}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-500">{rule.startPriceProductCode ?? '—'}</td>
                    <td className="px-3 py-1.5">{rule.region ?? 'Alle'}</td>
                    <td className="px-3 py-1.5 text-gray-500">{rule.regime ?? '—'}</td>
                    <td className="px-3 py-1.5 text-center">{rule.priority}</td>
                    <td className="px-3 py-1.5 text-gray-500 truncate max-w-[150px]">{rule.labelNl ?? '—'}</td>
                    <td className="px-3 py-1.5">
                      <button
                        onClick={() => deleteRule.mutate(rule.id)}
                        disabled={deleteRule.isPending}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {grouped.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Geen regels gevonden
        </div>
      )}
    </div>
  );
}

function SubassetsTab({ profile }: { profile: ProfileDetail }) {
  const createConfig = useCreateSubassetConfig(profile.id);
  const deleteConfig = useDeleteSubassetConfig(profile.id);
  const [showAdd, setShowAdd] = useState(false);
  const [parentId, setParentId] = useState('');
  const [childId, setChildId] = useState('');

  const { data: allObjectTypes } = useQuery({
    queryKey: ['object-types-all-admin'],
    queryFn: () => apiClient<Array<{ id: string; nameNl: string }>>('/api/object-types'),
    staleTime: Infinity,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, typeof profile.subassetConfigs>();
    for (const c of profile.subassetConfigs) {
      const key = c.parentObjectTypeId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()];
  }, [profile.subassetConfigs]);

  function handleCreate() {
    if (!parentId || !childId) return;
    createConfig.mutate({ parentObjectTypeId: parentId, childObjectTypeId: childId }, {
      onSuccess: () => { setShowAdd(false); setParentId(''); setChildId(''); },
    });
  }

  const sortedTypes = useMemo(() => {
    return [...(allObjectTypes ?? [])].sort((a, b) => a.nameNl.localeCompare(b.nameNl));
  }, [allObjectTypes]);

  return (
    <div className="space-y-3">
      {grouped.map(([parentTypeId, configs]) => (
        <div key={parentTypeId} className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium text-gray-900 text-sm mb-2">
            {configs[0].parentObjectType.nameNl}
          </h3>
          <div className="space-y-1">
            {configs.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">
                  <span className="text-blue-400 mr-1">↳</span>
                  {c.childObjectType.nameNl}
                </span>
                <button
                  onClick={() => deleteConfig.mutate(c.id)}
                  disabled={deleteConfig.isPending}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {grouped.length === 0 && !showAdd && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Geen subasset configuraties
        </div>
      )}

      {showAdd ? (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent objecttype</label>
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Selecteer...</option>
              {sortedTypes.map((ot) => (
                <option key={ot.id} value={ot.id}>{ot.nameNl}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Child objecttype (subasset)</label>
            <select value={childId} onChange={(e) => setChildId(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Selecteer...</option>
              {sortedTypes.map((ot) => (
                <option key={ot.id} value={ot.id}>{ot.nameNl}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createConfig.isPending || !parentId || !childId} className="px-3 py-1.5 text-sm bg-blue-700 text-white rounded-md disabled:opacity-50">
              Toevoegen
            </button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md">
              Annuleren
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-2 text-sm text-blue-600 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50"
        >
          + Subasset config toevoegen
        </button>
      )}
    </div>
  );
}

function CreateProfileModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const createProfile = useCreateMappingProfile();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('BE');
  const [hasRegionLogic, setHasRegionLogic] = useState(false);
  const [odooExportEnabled, setOdooExportEnabled] = useState(true);

  function handleCreate() {
    if (!name.trim()) return;
    createProfile.mutate(
      { name: name.trim(), country, hasRegionLogic, odooExportEnabled },
      { onSuccess: (data) => onCreated(data.id) },
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Nieuw mapping profiel</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="bv. Nederland"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Land (ISO code)</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            maxLength={2}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={hasRegionLogic} onChange={(e) => setHasRegionLogic(e.target.checked)} className="rounded" />
          Regio-logica (postcode naar regio)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={odooExportEnabled} onChange={(e) => setOdooExportEnabled(e.target.checked)} className="rounded" />
          Odoo export ingeschakeld
        </label>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
            Annuleren
          </button>
          <button
            onClick={handleCreate}
            disabled={createProfile.isPending || !name.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50"
          >
            {createProfile.isPending ? 'Aanmaken...' : 'Aanmaken'}
          </button>
        </div>
      </div>
    </div>
  );
}
