import { useState, useRef, useCallback, useEffect } from 'react';

type CameraState = 'idle' | 'starting' | 'active' | 'error';

export function useCamera() {
  const [state, setState] = useState<CameraState>('idle');
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setState('starting');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState('active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera access denied');
      setState('error');
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState('idle');
  }, []);

  const capture = useCallback((): Promise<Blob | null> => {
    const MAX_DIMENSION = 1024;

    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video) { resolve(null); return; }

      let w = video.videoWidth;
      let h = video.videoHeight;
      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }

      ctx.drawImage(video, 0, 0, w, h);
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        0.82,
      );
    });
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { state, error, videoRef, start, stop, capture };
}
