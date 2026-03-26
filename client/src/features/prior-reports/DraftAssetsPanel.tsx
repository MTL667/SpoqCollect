import { useState } from 'react';
import {
  useDraftAssets,
  usePatchDraftAsset,
  useDeleteDraftAsset,
  useDeletePriorReportFile,
  useUploadPriorReports,
  usePriorReportFiles,
  type DraftAssetItem,
} from './use-prior-reports';
import type { ScanRecordItem } from '../sessions/use-sessions';
import ConfirmDialog from '../../shared/components/ConfirmDialog';

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
  const { data: reportFiles } = usePriorReportFiles(sessionId);
  const patchDraft = usePatchDraftAsset(sessionId);
  const deleteDraft = useDeleteDraftAsset(sessionId);
  const uploadMore = useUploadPriorReports();
  const deleteFile = useDeletePriorReportFile(sessionId);
  const [matchDraft, setMatchDraft] = useState<DraftAssetItem | null>(null);
  const [deleteDraftId, setDeleteDraftId] = useState<string | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);

  const openDrafts = drafts?.filter((d) => d.status === 'draft') ?? [];
  const matched = drafts?.filter((d) => d.status === 'matched') ?? [];
  const skipped = drafts?.filter((d) => d.status === 'skipped') ?? [];

  if (isLoading && !drafts) {
    return <div className="text-sm text-gray-500 py-2">Concept-assets laden...</div>;
  }

  if (!drafts?.length && !isActive && !reportFiles?.length) {
    return null;
  }

  const hasAnyList = openDrafts.length > 0 || matched.length > 0 || skipped.length > 0;

  const processingFiles = reportFiles?.filter((f) => f.extractionStatus === 'processing') ?? [];
  const failedFiles = reportFiles?.filter((f) => f.extractionStatus === 'failed') ?? [];

  function handleDeleteDraft() {
    if (!deleteDraftId) return;
    deleteDraft.mutate(deleteDraftId, {
      onSuccess: () => setDeleteDraftId(null),
    });
  }

  return (
    <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-amber-950">Concept-assets uit vorige verslagen</h2>
          <p className="text-xs text-amber-900/80 mt-1">
            Afkomstig van geüploade PDF&apos;s of camera-foto&apos;s van verslagen. Koppel aan een scan zodra u het
            toestel op de locatie heeft vastgelegd.
          </p>
        </div>
      </div>

      {/* Upload section */}
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

          {/* Upload in progress */}
          {uploadMore.isPending && (
            <div className="mt-2 flex items-center gap-2 text-sm text-amber-800">
              <span className="inline-block w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              Bestanden verwerken... Dit kan even duren bij grote verslagen.
            </div>
          )}

          {uploadMore.isError && (
            <p className="text-red-600 text-xs mt-1">{uploadMore.error.message}</p>
          )}
        </div>
      )}

      {/* File processing status */}
      {processingFiles.length > 0 && (
        <div className="space-y-1">
          {processingFiles.map((f) => (
            <div key={f.id} className="flex items-center gap-2 px-3 py-2 bg-amber-100/60 rounded-md text-sm text-amber-900">
              <span className="inline-block w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="truncate">Verwerken: {f.originalName}</span>
            </div>
          ))}
        </div>
      )}

      {failedFiles.length > 0 && (
        <div className="space-y-1">
          {failedFiles.map((f) => (
            <div key={f.id} className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-red-800 truncate">{f.originalName}</p>
                <p className="text-xs text-red-600 mt-0.5">{f.extractionError ?? 'Extractie mislukt'}</p>
              </div>
              <button
                type="button"
                onClick={() => deleteFile.mutate(f.id)}
                disabled={deleteFile.isPending}
                className="shrink-0 w-7 h-7 rounded-full bg-red-100 text-sm text-red-600 hover:bg-red-200 disabled:opacity-50"
                title="Verwijderen"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No results after upload */}
      {!hasAnyList && reportFiles && reportFiles.length > 0 && reportFiles.every((f) => f.extractionStatus === 'done') && (
        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
          Geen concept-assets gevonden in de geüploade verslagen. Probeer andere documenten of maak foto&apos;s van het verslag.
        </div>
      )}

      {!hasAnyList && !reportFiles?.length && (
        <p className="text-sm text-amber-900/70">Nog geen concepten. Upload verslagen bij een nieuwe sessie of hierboven.</p>
      )}

      {/* Open drafts */}
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
                    Koppel
                  </button>
                  <button
                    type="button"
                    onClick={() => patchDraft.mutate({ draftId: d.id, action: 'skip' })}
                    disabled={patchDraft.isPending}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700"
                  >
                    N.v.t.
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteDraftId(d.id)}
                    className="px-2 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-md"
                    title="Verwijderen"
                  >
                    ✕
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Matched drafts */}
      {matched.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">Gekoppeld</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            {matched.map((d) => (
              <li key={d.id} className="flex justify-between items-center gap-2">
                <span className="truncate">{d.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-green-700">
                    → {d.matchedScan?.confirmedType?.nameNl ?? d.matchedScan?.id.slice(0, 8)}
                  </span>
                  {isActive && (
                    <button
                      type="button"
                      onClick={() => setDeleteDraftId(d.id)}
                      className="w-6 h-6 rounded-full bg-red-50 text-xs text-red-500 hover:bg-red-100"
                      title="Verwijderen"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Skipped drafts */}
      {skipped.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Overgeslagen ({skipped.length})</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            {skipped.map((d) => (
              <li key={d.id} className="flex justify-between items-center gap-2">
                <span className="truncate line-through">{d.title}</span>
                {isActive && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => patchDraft.mutate({ draftId: d.id, action: 'unmatch' })}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Herstellen
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteDraftId(d.id)}
                      className="w-6 h-6 rounded-full bg-red-50 text-xs text-red-500 hover:bg-red-100"
                      title="Verwijderen"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Match draft modal */}
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

      {/* Delete draft confirmation */}
      <ConfirmDialog
        open={!!deleteDraftId}
        title="Concept verwijderen"
        message="Weet u zeker dat u dit concept-asset wilt verwijderen?"
        confirmLabel="Verwijderen"
        variant="destructive"
        onConfirm={handleDeleteDraft}
        onCancel={() => setDeleteDraftId(null)}
        isLoading={deleteDraft.isPending}
      />
    </div>
  );
}
