import type { PromptFieldDef } from './use-prompt-catalog';

export function DynamicPromptFields({
  fields,
  values,
  onChange,
}: {
  fields: PromptFieldDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
          {f.type === 'choice' && f.options ? (
            <select
              value={values[f.key] ?? ''}
              onChange={(e) => onChange(f.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Kies —</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === 'number' ? (
            <input
              type="number"
              min={0}
              value={values[f.key] ?? ''}
              onChange={(e) => onChange(f.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <input
              type="text"
              value={values[f.key] ?? ''}
              onChange={(e) => onChange(f.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      ))}
    </div>
  );
}
