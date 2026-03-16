import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useCreateSession, useBuildingTypes } from './use-sessions';

export default function CreateSession() {
  const navigate = useNavigate();
  const { data: buildingTypes, isLoading: btLoading } = useBuildingTypes();
  const createSession = useCreateSession();

  const [clientAddress, setClientAddress] = useState('');
  const [buildingTypeId, setBuildingTypeId] = useState('');
  const [errors, setErrors] = useState<{ address?: string; buildingType?: string }>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!clientAddress.trim()) newErrors.address = 'Adres is verplicht';
    if (!buildingTypeId) newErrors.buildingType = 'Gebouwtype is verplicht';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    createSession.mutate(
      { clientAddress: clientAddress.trim(), buildingTypeId },
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
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Klantadres
          </label>
          <input
            id="address"
            type="text"
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Straat 123, Stad"
          />
          {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address}</p>}
        </div>

        <div>
          <label htmlFor="buildingType" className="block text-sm font-medium text-gray-700 mb-1">
            Gebouwtype
          </label>
          <select
            id="buildingType"
            value={buildingTypeId}
            onChange={(e) => setBuildingTypeId(e.target.value)}
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
          {errors.buildingType && <p className="text-red-600 text-sm mt-1">{errors.buildingType}</p>}
        </div>

        <div className="flex gap-3">
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
