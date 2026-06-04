import { AlertTriangle, RefreshCw, WifiOff, Lock, ServerCrash, LucideIcon } from 'lucide-react';

type Preset = 'network' | 'auth' | 'server' | 'empty';

interface PresetConfig {
  icon: LucideIcon;
  title: string;
  body: string;
  color: string;
  bg: string;
}

const PRESETS: Record<Preset, PresetConfig> = {
  network: {
    icon: WifiOff,
    title: 'No connection',
    body: 'Check your internet connection and try again.',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  auth: {
    icon: Lock,
    title: 'Session expired',
    body: 'Please log in again to continue.',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  server: {
    icon: ServerCrash,
    title: 'Something went wrong',
    body: 'Our servers hit a snag. This is usually temporary.',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
  empty: {
    icon: AlertTriangle,
    title: 'Nothing here yet',
    body: 'There is no data to display at the moment.',
    color: 'text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-800/50',
  },
};

function classify(error: unknown): Preset {
  if (!error) return 'server';
  const msg = String((error as Error)?.message ?? error).toLowerCase();
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline')) return 'network';
  if (msg.includes('401') || msg.includes('403') || msg.includes('unauthorized')) return 'auth';
  return 'server';
}

interface ErrorStateProps {
  error?: Error | string | null;
  preset?: Preset;
  title?: string;
  body?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export default function ErrorState({
  error,
  preset,
  title,
  body,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  const key = preset ?? classify(error);
  const cfg = PRESETS[key] ?? PRESETS.server;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-2xl p-6 flex flex-col items-center text-center gap-3 ${cfg.bg}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${cfg.bg}`}>
        <Icon className={`w-6 h-6 ${cfg.color}`} />
      </div>
      <div>
        <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{title ?? cfg.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{body ?? cfg.body}</p>
        {(error as Error)?.message && !title && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono truncate max-w-xs">
            {(error as Error).message}
          </p>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-700 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-500 px-4 py-2 rounded-full transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {retryLabel}
        </button>
      )}
    </div>
  );
}
