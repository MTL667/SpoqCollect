import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useCreateSession, useBuildingTypes } from './use-sessions';

export default function CreateSession() {
  const navigate = useNavigate();
  const { data: buildingTypes, isLoading: btLoading } = useBuildingTypes();
  const createSession = useCreateSession();

  const [form, setForm] = useState({
    clientName: '',
    street: '',
    number: '',
    bus: '',
    postalCode: '',
    city: '',
    buildingTypeId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function handleSubmit(e: FormEvent) {
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

    createSession.mutate(
      {
        clientName: form.clientName.trim(),
        street: form.street.trim(),
        number: form.number.trim(),
        bus: form.bus.trim() || undefined,
        postalCode: form.postalCode.trim(),
        city: form.city.trim(),
        buildingTypeId: form.buildingTypeId,
      },
      {
        onSuccess: (session) => {
          navigate(`/sessions/${session.id}`);
        },
      },
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Nieuwe sessie</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 max-w-lg space-y-4">
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

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={createSession.isPending}
            className="px-4 py-2 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-800 disabled:opacity-50"
          >
            {createSession.isPending ? 'Aanmaken...' : 'Sessie aanmaken'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/sessions')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Annuleren
          </button>
        </div>

        {createSession.isError && (
          <p className="text-red-600 text-sm">{createSession.error.message}</p>
        )}
      </form>
    </div>
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
