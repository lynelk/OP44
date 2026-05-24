import { createContext, useContext, useEffect, useState } from 'react';
import { syncManager } from './syncManager';
import { base44 } from '@/api/base44Client';

const SyncContext = createContext({ status: 'idle', lastSynced: null, pendingCount: 0, triggerSync: () => {} });

export function SyncProvider({ children }) {
  const [syncState, setSyncState] = useState({ status: 'idle', lastSynced: null });
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Boot sync after auth resolves — retry a few times if user not yet available
    let attempts = 0;
    const tryInit = () => {
      base44.auth.me()
        .then(user => {
          if (user) {
            syncManager.init(user.id);
          } else if (attempts < 5) {
            attempts++;
            setTimeout(tryInit, 1500);
          }
        })
        .catch(() => {
          if (attempts < 3) { attempts++; setTimeout(tryInit, 2000); }
        });
    };
    tryInit();

    const unsub = syncManager.subscribe((state) => {
      setSyncState(state);
    });

    // Poll pending outbox count every 30s
    const pollPending = async () => {
      const { db } = await import('./offlineDb');
      const count = await db._outbox.where('synced_at').equals('').count();
      setPendingCount(count);
    };
    pollPending();
    const interval = setInterval(pollPending, 30000);

    return () => { unsub(); clearInterval(interval); };
  }, []);

  const triggerSync = () => syncManager.syncAll();

  return (
    <SyncContext.Provider value={{ ...syncState, pendingCount, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export const useSyncContext = () => useContext(SyncContext);
export default SyncContext;