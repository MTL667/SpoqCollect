import { useEffect } from 'react';
import { useCamera } from './use-camera';

interface CameraViewProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

export default function CameraView({ onCapture, onCancel }: CameraViewProps) {
  const { state, error, videoRef, start, stop, capture } = useCamera();

  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  async function handleCapture() {
    const blob = await capture();
    if (blob) {
      onCapture(blob);
    }
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <p className="text-lg mb-4">Camera niet beschikbaar</p>
        <p className="text-sm text-gray-400 mb-6">{error}</p>
        <button onClick={onCancel} className="px-4 py-2 bg-white text-black rounded-md">
          Terug
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {state === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <p className="text-white">Camera starten...</p>
          </div>
        )}
      </div>
      <div className="bg-black p-4 flex items-center justify-center gap-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-white border border-white rounded-md"
        >
          Annuleren
        </button>
        <button
          onClick={handleCapture}
          disabled={state !== 'active'}
          className="w-16 h-16 bg-white rounded-full border-4 border-gray-300 disabled:opacity-50"
          aria-label="Foto nemen"
        />
      </div>
    </div>
  );
}
