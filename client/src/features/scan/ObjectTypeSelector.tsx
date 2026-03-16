import { useState, useMemo } from 'react';

interface ObjectTypeInfo {
  id: string;
  nameNl: string;
}

interface ObjectTypeSelectorProps {
  objectTypes: ObjectTypeInfo[];
  onSelect: (typeId: string) => void;
  isLoading?: boolean;
}

export default function ObjectTypeSelector({
  objectTypes,
  onSelect,
  isLoading = false,
}: ObjectTypeSelectorProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return objectTypes
      .filter((t) => t.nameNl.toLowerCase().includes(term))
      .sort((a, b) => a.nameNl.localeCompare(b.nameNl, 'nl'));
  }, [objectTypes, search]);

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
        {filtered.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Geen objecttypes gevonden</p>
        )}
      </div>
    </div>
  );
}
