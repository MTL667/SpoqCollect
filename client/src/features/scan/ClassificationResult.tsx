import { useState } from 'react';
import ObjectTypeSelector from './ObjectTypeSelector';

const HIGH_CONFIDENCE = 0.85;
const MEDIUM_CONFIDENCE = 0.50;

interface ObjectTypeInfo {
  id: string;
  nameNl: string;
}

interface Candidate {
  typeId: string;
  confidence: number;
}

interface ClassificationResultProps {
  aiTypeId: string | null;
  aiConfidence: number | null;
  candidates: Candidate[];
  objectTypes: ObjectTypeInfo[];
  onConfirm: (typeId: string) => void;
  isLoading?: boolean;
}

export default function ClassificationResult({
  aiTypeId,
  aiConfidence,
  candidates,
  objectTypes,
  onConfirm,
  isLoading = false,
}: ClassificationResultProps) {
  const [showFullList, setShowFullList] = useState(false);

  const getTypeName = (id: string) =>
    objectTypes.find((t) => t.id === id)?.nameNl ?? 'Onbekend';

  if (showFullList || !aiTypeId || (aiConfidence !== null && aiConfidence < MEDIUM_CONFIDENCE)) {
    return (
      <ObjectTypeSelector
        objectTypes={objectTypes}
        onSelect={onConfirm}
        isLoading={isLoading}
      />
    );
  }

  if (aiConfidence !== null && aiConfidence >= HIGH_CONFIDENCE) {
    return (
      <div className="p-4 space-y-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Hoog vertrouwen ({Math.round(aiConfidence * 100)}%)</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{getTypeName(aiTypeId)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(aiTypeId)}
            disabled={isLoading}
            className="flex-1 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Bevestigen...' : 'Bevestigen'}
          </button>
          <button
            onClick={() => setShowFullList(true)}
            disabled={isLoading}
            className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Wijzigen
          </button>
        </div>
      </div>
    );
  }

  // Medium confidence
  const rankedCandidates = candidates
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-yellow-600 font-medium">Meerdere mogelijkheden</p>
      <div className="space-y-2">
        {rankedCandidates.map((c) => (
          <button
            key={c.typeId}
            onClick={() => onConfirm(c.typeId)}
            disabled={isLoading}
            className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 flex justify-between items-center"
          >
            <span className="font-medium">{getTypeName(c.typeId)}</span>
            <span className="text-sm text-gray-400">{Math.round(c.confidence * 100)}%</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setShowFullList(true)}
        disabled={isLoading}
        className="w-full py-2 text-blue-700 text-sm hover:underline disabled:opacity-50"
      >
        Geen van deze — toon volledige lijst
      </button>
    </div>
  );
}
