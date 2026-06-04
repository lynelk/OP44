import { useState, useEffect } from 'react';
import { syncManager } from '@/lib/syncManager';
import { WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function OfflineStatusBar() {
  const [syncState, setSyncState] = useState({ status: navigator.onLine ? 'idle' : 'offline' });
  const [visible, setVisible] = useState(!navigator.onLine);
  const [hideTimer, setHideTimer] = useState(null);

  useEffect(() => {
    const unsub = syncManager.subscribe((state) => {
      setSyncState(state);

      if (state.status === 'offline') {
        setVisible(true);
        if (hideTimer) clearTimeout(hideTimer);
      } else if (state.status === 'synced') {
        setVisible(true);
        const t = setTimeout(() => setVisible(false), 3000);
        setHideTimer(t);
      } else if (state.status === 'syncing' || state.status === 'error') {
        setVisible(true);
        if (hideTimer) clearTimeout(hideTimer);
      }
    });

    const onOnline = () => setSyncState(s => ({ ...s, status: 'syncing' }));
    const onOffline = () => { setSyncState({ status: 'offline' }); setVisible(true); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (!visible) return null;

  const configs = {
    offline: {
      bg: 'bg-red-600',
      icon: <WifiOff className="w-3.5 h-3.5" />,
      text: 'You\'re offline — changes saved locally',
    },
    syncing: {
      bg: 'bg-amber-500',
      icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
      text: 'Syncing your data…',
    },
    synced: {
      bg: 'bg-emerald-600',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      text: 'All changes synced',
    },
    error: {
      bg: 'bg-red-500',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      text: 'Sync failed — will retry',
    },
    idle: null,
  };

  const cfg = configs[syncState.status];
  if (!cfg) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] ${cfg.bg} text-white text-xs font-medium flex items-center justify-center gap-2 py-1.5 transition-all duration-300`}
      style={{ paddingTop: `calc(env(safe-area-inset-top) + 6px)` }}
    >
      {cfg.icon}
      <span>{cfg.text}</span>
    </div>
  );
}