import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useCreateSession, useBuildingTypes, useMappingProfiles } from './use-sessions';
import { useUploadPriorReports } from '../prior-reports/use-prior-reports';
import CameraView from '../scan/CameraView';

type WizardStep = 'client' | 'reports';

export default function CreateSession() {
  const navigate = useNavigate();
  const { data: buildingTypes, isLoading: btLoading } = useBuildingTypes();
  const { data: mappingProfiles, isLoading: mpLoading } = useMappingProfiles();
  const createSession = useCreateSession();
  const [step, setStep] = useState<WizardStep>('client');
  const uploadReports = useUploadPriorReports();

  const [form, setForm] = useState({
    clientName: '',
    street: '',
    number: '',
    bus: '',
    postalCode: '',
    city: '',
    buildingTypeId: '',
    mappingProfileId: '',
  });
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [reportPhotoBlobs, setReportPhotoBlobs] = useState<Blob[]>([]);
  const [reportCameraOpen, setReportCameraOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function handleClientNext(e: FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!form.clientName.trim()) newErrors.clientName = 'Verplicht';
    if (!form.street.trim()) newErrors.street = 'Verplicht';
    if (!form.number.trim()) newErrors.number = 'Verplicht';
    if (!form.postalCode.trim()) newErrors.postalCode = 'Verplicht';
    if (!form.city.trim()) newErrors.city = 'Verplicht';
    if (!form.buildingTypeId) newErrors.buildingTypeId = 'Verplicht';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setStep('reports');
  }

  function handleReportsSubmit() {
    createSession.mutate(
      {
        clientName: form.clientName.trim(),
        street: form.street.trim(),
        number: form.number.trim(),
        bus: form.bus.trim() || undefined,
        postalCode: form.postalCode.trim(),
        city: form.city.trim(),
        buildingTypeId: form.buildingTypeId,
        ...(form.mappingProfileId ? { mappingProfileId: form.mappingProfileId } : {}),
      },
      {
        onSuccess: async (session) => {
          const photoFiles = reportPhotoBlobs.map(
            (blob, i) =>
              new File([blob], `verslag-foto-${i + 1}.jpg`, {
                type: blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg',
              }),
          );
          const toUpload = [...reportFiles, ...photoFiles];
          if (toUpload.length > 0) {
            try {
              await uploadReports.mutateAsync({ sessionId: session.id, files: toUpload });
            } catch {
              /* uploadReports.isError — navigatie toch */
            }
          }
          navigate(`/sessions/${session.id}`);
        },
      },
    );
  }

  const busy = createSession.isPending || uploadReports.isPending;
  const reportCount = reportFiles.length + reportPhotoBlobs.length;

  if (reportCameraOpen) {
    return (
      <CameraView
        onCapture={(blob) => {
          setReportPhotoBlobs((prev) => [...prev, blob]);
          setReportCameraOpen(false);
        }}
        onCancel={() => setReportCameraOpen(false)}
      />
    );
  }

  if (step === 'reports') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-2xl font-bold text-blue-800 mb-2">Vorige keuringsverslagen</h1>
        <p className="text-gray-600 text-sm mb-6 max-w-lg">
          Leg papieren of oude verslagen vast met de camera, of upload
          een PDF. De inhoud (zoals bij OCB, Infravision, ASC, …) wordt gebruikt om concept-assets en
          keuringsdata voor te bereiden — het hoeft geen PDF op uw toestel te zijn.
        </p>

        <div className="bg-white shadow rounded-lg p-6 max-w-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto’s van verslagen (aanbevolen op locatie)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReportCameraOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Foto maken
              </button>
            </div>
            {reportPhotoBlobs.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {reportPhotoBlobs.map((blob, i) => (
                  <ReportPhotoThumb
                    key={`${i}-${blob.size}`}
                    blob={blob}
                    onRemove={() => setReportPhotoBlobs((prev) => prev.filter((_, idx) => idx !== i))}
                  />
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-500 mt-2">Meerdere pagina’s: telkens opnieuw «Foto maken».</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Of: PDF-bestanden (optioneel)
            </label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={(e) => setReportFiles(Array.from(e.target.files ?? []))}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700"
            />
            {reportFiles.length > 0 && (
              <ul className="mt-2 text-xs text-gray-500 space-y-1">
                {reportFiles.map((f) => (
                  <li key={f.name + f.size}>{f.name}</li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-gray-500">
            PDF: doorzoekbare bestanden werken het best; gescande PDF’s kunnen weinig tekst bevatten — gebruik
            dan liever foto’s. Foto’s worden met AI uitgelezen (helder, recht van voren).
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handleReportsSubmit}
              disabled={busy}
              className="w-full px-4 py-2 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-800 disabled:opacity-50"
            >
              {busy
                ? 'Bezig...'
                : reportCount
                  ? 'Sessie aanmaken & verslagen verwerken'
                  : 'Sessie aanmaken zonder verslagen'}
            </button>
            <button
              type="button"
              onClick={() => setStep('client')}
              disabled={busy}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Terug
            </button>
          </div>

          {createSession.isError && (
            <p className="text-red-600 text-sm">{createSession.error.message}</p>
          )}
          {uploadReports.isError && (
            <p className="text-amber-700 text-sm">
              Sessie is aangemaakt maar upload mislukte: {uploadReports.error.message}. U kunt later opnieuw
              uploaden vanuit de sessie (functie volgt) of doorgaan zonder.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Nieuwe sessie</h1>
      <form onSubmit={handleClientNext} className="bg-white shadow rounded-lg p-6 max-w-lg space-y-4">
        <Field label="Naam opdrachtgever" value={form.clientName} error={errors.clientName} onChange={(v) => update('clientName', v)} placeholder="Bedrijfsnaam / naam klant" />

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Straat" value={form.street} error={errors.street} onChange={(v) => update('street', v)} />
          </div>
          <Field label="Nummer" value={form.number} error={errors.number} onChange={(v) => update('number', v)} />
        </div>

        <Field label="Bus (optioneel)" value={form.bus} onChange={(v) => update('bus', v)} placeholder="bv. A, 2.1" />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Postcode" value={form.postalCode} error={errors.postalCode} onChange={(v) => update('postalCode', v)} />
          <Field label="Plaats" value={form.city} error={errors.city} onChange={(v) => update('city', v)} />
        </div>

        <div>
          <label htmlFor="buildingType" className="block text-sm font-medium text-gray-700 mb-1">
            Gebouwtype
          </label>
          <select
            id="buildingType"
            value={form.buildingTypeId}
            onChange={(e) => update('buildingTypeId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={btLoading}
          >
            <option value="">Selecteer...</option>
            {buildingTypes?.map((bt) => (
              <option key={bt.id} value={bt.id}>
                {bt.nameNl}
              </option>
            ))}
          </select>
          {errors.buildingTypeId && <p className="text-red-600 text-sm mt-1">{errors.buildingTypeId}</p>}
        </div>

        <div>
          <label htmlFor="mappingProfile" className="block text-sm font-medium text-gray-700 mb-1">
            Mapping profiel (land)
          </label>
          <select
            id="mappingProfile"
            value={form.mappingProfileId}
            onChange={(e) => update('mappingProfileId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={mpLoading}
          >
            <option value="">Geen profiel (legacy)</option>
            {mappingProfiles?.map((mp) => (
              <option key={mp.id} value={mp.id}>
                {mp.name} ({mp.country})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-800"
          >
            Volgende: vorige verslagen
          </button>
          <button
            type="button"
            onClick={() => navigate('/sessions')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Annuleren
          </button>
        </div>
      </form>
    </div>
  );
}

function ReportPhotoThumb({ blob, onRemove }: { blob: Blob; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return (
    <li className="relative w-16 h-16 rounded border border-gray-200 overflow-hidden shrink-0">
      {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : null}
      <button
        type="button"
        aria-label="Foto verwijderen"
        onClick={onRemove}
        className="absolute top-0 right-0 w-5 h-5 bg-black/60 text-white text-xs leading-5"
      >
        ×
      </button>
    </li>
  );
}

function Field({ label, value, error, onChange, placeholder }: {
  label: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-400' : 'border-gray-300'}`}
        placeholder={placeholder}
      />
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}
