import { useState } from 'react';
import { useDraftAssets, usePatchDraftAsset, useUploadPriorReports, type DraftAssetItem } from './use-prior-reports';
import type { ScanRecordItem } from '../sessions/use-sessions';

function formatNlDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('nl-BE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function DraftAssetsPanel({
  sessionId,
  isActive,
  confirmedScans,
}: {
  sessionId: string;
  isActive: boolean;
  confirmedScans: ScanRecordItem[];
}) {
  const { data: drafts, isLoading } = useDraftAssets(sessionId);
  const patchDraft = usePatchDraftAsset(sessionId);
  const uploadMore = useUploadPriorReports();
  const [matchDraft, setMatchDraft] = useState<DraftAssetItem | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);

  const openDrafts = drafts?.filter((d) => d.status === 'draft') ?? [];
  const matched = drafts?.filter((d) => d.status === 'matched') ?? [];

  if (isLoading && !drafts) {
    return <div className="text-sm text-gray-500 py-2">Concept-assets laden...</div>;
  }

  if (!drafts?.length && !isActive) {
    return null;
  }

  const hasAnyList = openDrafts.length > 0 || matched.length > 0;

  return (
    <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-amber-950">Concept-assets uit vorige verslagen</h2>
          <p className="text-xs text-amber-900/80 mt-1">
            Afkomstig van geüploade PDF’s of camera-foto’s van verslagen. Koppel aan een scan zodra u het
            toestel op de locatie heeft vastgelegd.
          </p>
        </div>
      </div>

      {isActive && (
        <div className="bg-white/80 rounded-md p-3 border border-amber-100">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Extra verslagen (PDF of afbeeldingen)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setExtraFiles(Array.from(e.target.files ?? []))}
              className="text-sm"
            />
            <button
              type="button"
              disabled={extraFiles.length === 0 || uploadMore.isPending}
              onClick={() => {
                uploadMore.mutate(
                  { sessionId, files: extraFiles },
                  { onSuccess: () => setExtraFiles([]) },
                );
              }}
              className="px-3 py-1.5 text-sm bg-amber-700 text-white rounded-md disabled:opacity-50"
            >
              {uploadMore.isPending ? 'Uploaden...' : 'Uploaden'}
            </button>
          </div>
          {uploadMore.isError && (
            <p className="text-red-600 text-xs mt-1">{uploadMore.error.message}</p>
          )}
        </div>
      )}

      {!hasAnyList && (
        <p className="text-sm text-amber-900/70">Nog geen concepten. Upload verslagen bij een nieuwe sessie of hierboven.</p>
      )}

      {openDrafts.length > 0 && (
        <ul className="space-y-2">
          {openDrafts.map((d) => (
            <li
              key={d.id}
              className="bg-white rounded-md border border-amber-100 p-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{d.title}</p>
                <p className="text-xs text-gray-600">
                  Vorige keuring: <strong>{formatNlDate(d.lastInspectionDate)}</strong>
                  {d.suggestedObjectType && (
                    <>
                      {' '}
                      · suggestie: <strong>{d.suggestedObjectType.nameNl}</strong>
                    </>
                  )}
                  {d.locationHint && (
                    <>
                      {' '}
                      · {d.locationHint}
                    </>
                  )}
                </p>
                {d.priorReportFile && (
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">{d.priorReportFile.originalName}</p>
                )}
              </div>
              {isActive && (
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMatchDraft(d)}
                    className="px-3 py-1.5 text-sm bg-blue-700 text-white rounded-md"
                  >
                    Koppel aan scan
                  </button>
                  <button
                    type="button"
                    onClick={() => patchDraft.mutate({ draftId: d.id, action: 'skip' })}
                    disabled={patchDraft.isPending}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700"
                  >
                    N.v.t.
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {matched.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">Gekoppeld</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            {matched.map((d) => (
              <li key={d.id} className="flex justify-between gap-2">
                <span className="truncate">{d.title}</span>
                <span className="text-green-700 shrink-0">
                  → {d.matchedScan?.confirmedType?.nameNl ?? d.matchedScan?.id.slice(0, 8)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {matchDraft && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[70vh] overflow-y-auto p-4">
            <h3 className="font-semibold text-gray-900 mb-1">Koppel: {matchDraft.title}</h3>
            <p className="text-xs text-gray-500 mb-3">Kies een bevestigde scan uit deze sessie.</p>
            <ul className="space-y-1">
              {confirmedScans.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 rounded-md border border-gray-100 hover:bg-blue-50 text-sm"
                    onClick={() => {
                      patchDraft.mutate(
                        { draftId: matchDraft.id, action: 'match', scanRecordId: s.id },
                        { onSuccess: () => setMatchDraft(null) },
                      );
                    }}
                  >
                    {s.confirmedType?.nameNl ?? 'Onbekend type'} ·{' '}
                    {new Date(s.createdAt).toLocaleString('nl-BE')}
                  </button>
                </li>
              ))}
            </ul>
            {confirmedScans.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">Nog geen bevestigde scans.</p>
            )}
            <button
              type="button"
              className="w-full mt-3 py-2 text-sm border border-gray-200 rounded-md"
              onClick={() => setMatchDraft(null)}
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
