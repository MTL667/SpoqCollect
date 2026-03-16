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
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-6">
        <p className="text-lg mb-4">Camera niet beschikbaar</p>
        <p className="text-sm text-gray-400 mb-6">{error}</p>
        <button onClick={onCancel} className="px-4 py-2 bg-white text-black rounded-md">
          Terug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {state === 'starting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <p className="text-white text-lg">Camera starten...</p>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-20 pb-[env(safe-area-inset-bottom,16px)]">
        <div className="flex items-center justify-center gap-8 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-white text-sm font-medium border border-white/60 rounded-lg backdrop-blur-sm"
          >
            Annuleren
          </button>
          <button
            onClick={handleCapture}
            disabled={state !== 'active'}
            className="w-20 h-20 rounded-full border-[5px] border-white shadow-lg disabled:opacity-40 active:scale-95 transition-transform"
            aria-label="Foto nemen"
          >
            <div className="w-full h-full rounded-full bg-white/90 m-[-1px] p-[3px]">
              <div className="w-full h-full rounded-full bg-white" />
            </div>
          </button>
          <div className="w-[88px]" />
        </div>
      </div>
    </div>
  );
}
