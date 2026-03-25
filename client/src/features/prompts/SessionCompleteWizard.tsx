import { useState, useEffect } from 'react';
import type { PromptCatalog, PromptFieldDef } from './use-prompt-catalog';
import { DynamicPromptFields } from './DynamicPromptFields';
import type { CompleteSessionPayload } from '../sessions/use-sessions';

function initValues(fields: PromptFieldDef[], bucket: Record<string, unknown> | undefined) {
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = bucket?.[f.key];
    out[f.key] = v !== undefined && v !== null ? String(v) : '';
  }
  return out;
}

export default function SessionCompleteWizard({
  open,
  catalog,
  onClose,
  onSubmit,
  isLoading,
  errorMessage,
}: {
  open: boolean;
  catalog: PromptCatalog | undefined;
  onClose: () => void;
  onSubmit: (payload: CompleteSessionPayload) => void;
  isLoading: boolean;
  errorMessage: string | null;
}) {
  const [endVals, setEndVals] = useState<Record<string, string>>({});
  const [lightVals, setLightVals] = useState<Record<string, string>>({});
  const [atexVals, setAtexVals] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !catalog) return;
    const spd = catalog.sessionPromptData as {
      end?: Record<string, unknown>;
      lightning?: Record<string, unknown>;
      atex?: Record<string, unknown>;
    } | null;
    setEndVals(initValues(catalog.sessionEndFireFields, spd?.end));
    setLightVals(initValues(catalog.sessionEndLightningFields, spd?.lightning));
    setAtexVals(initValues(catalog.sessionEndAtexFields, spd?.atex));
  }, [open, catalog]);

  if (!open) return null;

  const blockers = catalog?.completeBlockers ?? [];
  const needAtex = blockers.includes('sessionEndAtex');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: CompleteSessionPayload = {
      end: { ...endVals },
      lightning: { ...lightVals },
    };
    if (needAtex) {
      payload.atex = { ...atexVals };
    }
    onSubmit(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Sessie voltooien</h2>
        <p className="text-sm text-gray-600 mb-4">Beantwoord de vragen voor export en compliance.</p>

        {blockers.includes('sessionStart') && (
          <div className="mb-4 p-3 bg-amber-50 text-amber-900 text-sm rounded-md">
            Startvragen ontbreken. Open <strong>Scannen</strong> en doorloop eerst de startvragen.
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 text-sm rounded-md">{errorMessage}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Brand / veiligheidsverlichting</h3>
            <DynamicPromptFields
              fields={catalog?.sessionEndFireFields ?? []}
              values={endVals}
              onChange={(k, v) => setEndVals((p) => ({ ...p, [k]: v }))}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Bliksem (niet-huishoudelijk)</h3>
            <DynamicPromptFields
              fields={catalog?.sessionEndLightningFields ?? []}
              values={lightVals}
              onChange={(k, v) => setLightVals((p) => ({ ...p, [k]: v }))}
            />
          </div>

          {needAtex && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">ATEX-zone</h3>
              <DynamicPromptFields
                fields={catalog?.sessionEndAtexFields ?? []}
                values={atexVals}
                onChange={(k, v) => setAtexVals((p) => ({ ...p, [k]: v }))}
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isLoading || blockers.includes('sessionStart')}
              className="flex-1 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Bezig...' : 'Sessie voltooien'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
