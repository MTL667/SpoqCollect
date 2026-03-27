import { useState, useMemo } from 'react';

interface ObjectTypeInfo {
  id: string;
  nameNl: string;
}

interface ObjectTypeSelectorProps {
  objectTypes: ObjectTypeInfo[];
  onSelect: (typeId: string) => void;
  isLoading?: boolean;
  onCreateCustom?: (name: string) => void;
  isCreating?: boolean;
}

export default function ObjectTypeSelector({
  objectTypes,
  onSelect,
  isLoading = false,
  onCreateCustom,
  isCreating = false,
}: ObjectTypeSelectorProps) {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [customName, setCustomName] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return objectTypes
      .filter((t) => t.nameNl.toLowerCase().includes(term))
      .sort((a, b) => a.nameNl.localeCompare(b.nameNl, 'nl'));
  }, [objectTypes, search]);

  function handleCreateSubmit() {
    const name = customName.trim();
    if (!name || !onCreateCustom) return;
    onCreateCustom(name);
    setCustomName('');
    setShowCreate(false);
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-gray-600 font-medium">Selecteer objecttype</p>
      <input
        type="text"
        placeholder="Zoeken..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
      />
      <div className="max-h-64 overflow-y-auto space-y-1">
        {filtered.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            disabled={isLoading}
            className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 disabled:opacity-50"
          >
            {t.nameNl}
          </button>
        ))}
        {filtered.length === 0 && !showCreate && (
          <p className="text-sm text-gray-400 text-center py-4">Geen objecttypes gevonden</p>
        )}
      </div>

      {onCreateCustom && !showCreate && (
        <button
          type="button"
          onClick={() => {
            setShowCreate(true);
            setCustomName(search);
          }}
          className="w-full text-sm text-blue-600 hover:text-blue-700 py-2 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50"
        >
          + Nieuw type aanmaken
        </button>
      )}

      {onCreateCustom && showCreate && (
        <div className="border border-blue-200 rounded-lg p-3 space-y-2 bg-blue-50/50">
          <p className="text-xs font-medium text-gray-700">Naam nieuw objecttype</p>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateSubmit()}
            placeholder="Bijv. Warmtepomp XL"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateSubmit}
              disabled={!customName.trim() || isCreating}
              className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? 'Aanmaken...' : 'Aanmaken'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setCustomName(''); }}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
