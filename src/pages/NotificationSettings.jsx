import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, MessageSquare, Bell, Mail, Moon, Check } from 'lucide-react';
import { getPrefs, savePrefs, registerPush, NOTIF_CATEGORIES, NOTIF_PREFS_STUB } from '@/lib/backend/notificationPrefs';

const Toggle = ({ on, onChange, disabled }) => (
  <button onClick={() => !disabled && onChange(!on)} disabled={disabled}
    className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-[#0D1BFF]' : 'bg-gray-300 dark:bg-gray-600'} ${disabled ? 'opacity-50' : ''}`}>
    <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
  </button>
);

export default function NotificationSettings() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { getPrefs().then(setPrefs); }, []);

  const update = async (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await savePrefs(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const toggleMuted = (type) => {
    const muted = prefs.muted_types.includes(type)
      ? prefs.muted_types.filter(t => t !== type)
      : [...prefs.muted_types, type];
    update({ muted_types: muted });
  };

  const enablePush = async () => {
    const ok = await registerPush();
    update({ push: ok });
    if (!ok) alert('Push permission was not granted by your browser.');
  };

  if (!prefs) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-100 border-t-[#0D1BFF] rounded-full animate-spin" />
    </div>
  );

  const CHANNELS = [
    { key: 'in_app', icon: Bell, label: 'In-app', sub: 'Notifications inside the app' },
    { key: 'sms', icon: MessageSquare, label: 'SMS', sub: 'Text messages to your phone' },
    { key: 'push', icon: Smartphone, label: 'Push', sub: 'Alerts even when app is closed', custom: enablePush },
    { key: 'email', icon: Mail, label: 'Email', sub: 'Weekly digests & receipts' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      <div className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-14 pb-8">
        <button onClick={() => navigate('/notifications')} className="flex items-center gap-1 text-blue-100 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-blue-100 text-sm">Choose how and when we reach you.</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {NOTIF_PREFS_STUB && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 p-3 text-xs text-amber-700 dark:text-amber-400">
            Preferences are saved to your account. SMS &amp; push delivery activate once the backend dispatcher is connected.
          </div>
        )}

        {/* Channels */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-sm font-semibold text-gray-900 dark:text-white">Channels</p>
          {CHANNELS.map(({ key, icon: Icon, label, sub, custom }, i, arr) => (
            <div key={key} className={`flex items-center justify-between px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0D1BFF]/10 dark:bg-[#0D1BFF]/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#0D1BFF] dark:text-[#32B4FF]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              </div>
              <Toggle on={prefs[key]} onChange={(v) => (custom && v ? custom() : update({ [key]: v }))} />
            </div>
          ))}
        </div>

        {/* Quiet hours */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#32B4FF]/10 flex items-center justify-center">
                <Moon className="w-4 h-4 text-[#32B4FF]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Quiet hours</p>
                <p className="text-xs text-gray-400">Pause non-urgent alerts overnight</p>
              </div>
            </div>
            <Toggle on={prefs.quiet_hours_enabled} onChange={(v) => update({ quiet_hours_enabled: v })} />
          </div>
          {prefs.quiet_hours_enabled && (
            <div className="flex items-center gap-3 mt-3 pl-12">
              <label className="text-xs text-gray-500">From
                <input type="time" value={prefs.quiet_start} onChange={e => update({ quiet_start: e.target.value })}
                  className="block mt-1 h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-sm dark:text-white" />
              </label>
              <label className="text-xs text-gray-500">To
                <input type="time" value={prefs.quiet_end} onChange={e => update({ quiet_end: e.target.value })}
                  className="block mt-1 h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2 text-sm dark:text-white" />
              </label>
            </div>
          )}
        </div>

        {/* Per-category mutes */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-sm font-semibold text-gray-900 dark:text-white">Categories</p>
          <p className="px-4 pb-2 text-xs text-gray-400">Turn off categories you don't want.</p>
          {NOTIF_CATEGORIES.map(({ type, label }, i, arr) => {
            const enabled = !prefs.muted_types.includes(type);
            return (
              <div key={type} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}>
                <p className="text-sm text-gray-700 dark:text-gray-200">{label}</p>
                <Toggle on={enabled} onChange={() => toggleMuted(type)} />
              </div>
            );
          })}
        </div>
      </div>

      {saved && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg">
          <Check className="w-3.5 h-3.5 text-emerald-400" /> Saved
        </div>
      )}
    </div>
  );
}
