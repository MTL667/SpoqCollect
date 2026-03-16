import { useOnlineStatus } from '../hooks/use-online-status';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-1 text-sm font-medium z-50">
      Offline — scans worden lokaal bewaard
    </div>
  );
}
