import { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/use-online-status';
import { getAllOfflineScansCount } from '../lib/indexed-db';
import { onSyncChange } from '../lib/offline-sync';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getAllOfflineScansCount().then(setPendingCount);
    const unsub = onSyncChange(setPendingCount);
    return unsub;
  }, []);

  useEffect(() => {
    if (isOnline) {
      getAllOfflineScansCount().then(setPendingCount);
    }
  }, [isOnline]);

  const showBanner = !isOnline || pendingCount > 0;
  if (!showBanner) return null;

  return (
    <>
      {isOnline && pendingCount > 0 ? (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-center py-1.5 text-sm font-medium z-50">
          Synchroniseren — {pendingCount} scan{pendingCount !== 1 ? 's' : ''} worden geüpload...
        </div>
      ) : (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-1.5 text-sm font-medium z-50">
          Offline modus — AI classificatie niet beschikbaar
          {pendingCount > 0 && (
            <span className="ml-2 opacity-80">
              ({pendingCount} scan{pendingCount !== 1 ? 's' : ''} wacht{pendingCount === 1 ? '' : 'en'} op sync)
            </span>
          )}
        </div>
      )}
      <div className="h-8" />
    </>
  );
}
