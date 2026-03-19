interface PhotoThumbnailProps {
  photoPath: string | null;
  size?: number;
}

export default function PhotoThumbnail({ photoPath, size = 48 }: PhotoThumbnailProps) {
  if (!photoPath) {
    return (
      <div
        className="bg-gray-200 rounded flex items-center justify-center text-gray-400"
        style={{ width: size, height: size }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={`/api/scans/photo/${photoPath}`}
      alt="Scan"
      className="rounded object-cover"
      style={{ width: size, height: size }}
    />
  );
}
