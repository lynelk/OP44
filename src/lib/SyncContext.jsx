import { createContext, useContext, useEffect, useState } from 'react';
import { syncManager } from './syncManager';
import { base44 } from '@/api/base44Client';

const SyncContext = createContext({ status: 'idle', lastSynced: null, pendingCount: 0, triggerSync: () => {} });

export function SyncProvider({ children }) {
  const [syncState, setSyncState] = useState({ status: 'idle', lastSynced: null });
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Boot sync after auth
    base44.auth.me().then(user => {
      if (user) syncManager.init(user.id);
    }).catch(() => {});

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