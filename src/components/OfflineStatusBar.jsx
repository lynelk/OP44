import { useState, useEffect, useRef } from 'react';
import { syncManager } from '@/lib/syncManager';
import { WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const CONFIGS = {
  offline: {
    icon: WifiOff,
    text: 'Offline — saved locally',
    className: 'bg-gray-800 text-white',
  },
  syncing: {
    icon: RefreshCw,
    text: 'Syncing…',
    className: 'bg-gray-700 text-white',
    spin: true,
  },
  synced: {
    icon: CheckCircle,
    text: 'Synced',
    className: 'bg-emerald-600 text-white',
  },
  error: {
    icon: AlertCircle,
    text: 'Sync failed — will retry',
    className: 'bg-gray-800 text-amber-300',
  },
};

export default function OfflineStatusBar() {
  const [syncState, setSyncState] = useState({ status: navigator.onLine ? 'idle' : 'offline' });
  const [visible, setVisible] = useState(!navigator.onLine);
  const hideTimerRef = useRef(null);

  const scheduleHide = (ms) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setVisible(false), ms);
  };

  useEffect(() => {
    const unsub = syncManager.subscribe((state) => {
      setSyncState(state);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

      if (state.status === 'offline' || state.status === 'syncing') {
        setVisible(true);
      } else if (state.status === 'synced') {
        setVisible(true);
        scheduleHide(2500);
      } else if (state.status === 'error') {
        setVisible(true);
        scheduleHide(5000); // auto-hide error after 5s
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
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  const cfg = CONFIGS[syncState.status];
  if (!cfg) return null;

  const Icon = cfg.icon;

  return (
    <div
      className={`fixed bottom-20 right-3 z-[9999] flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg text-xs font-medium transition-all duration-300 ${cfg.className}`}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <Icon className={`w-3 h-3 flex-shrink-0 ${cfg.spin ? 'animate-spin' : ''}`} />
      <span>{cfg.text}</span>
    </div>
  );
}