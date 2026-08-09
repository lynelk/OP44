import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDashboardTasks } from '@/lib/taskEngine';
import { Loader2, CheckCircle2, ChevronRight } from 'lucide-react';

const PRIORITY_STYLES = {
  high:     { bg: 'bg-red-50 dark:bg-red-900/20',      border: 'border-red-100 dark:border-red-800',     text: 'text-red-700 dark:text-red-300',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  medium:   { bg: 'bg-amber-50 dark:bg-amber-900/20',  border: 'border-amber-100 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  low:      { bg: 'bg-blue-50 dark:bg-blue-900/20',    border: 'border-blue-100 dark:border-blue-800',   text: 'text-blue-700 dark:text-blue-300',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  positive: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

export default function TaskHub({ userId }) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['dashboardTasks', userId],
    queryFn: () => getDashboardTasks(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Checking your tasks…</span>
      </div>
    );
  }

  const taskList = tasks || [];

  if (taskList.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-sm">
        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <p className="font-semibold text-sm text-gray-900 dark:text-white">You're all caught up!</p>
        <p className="text-xs text-gray-400 mt-1">No pending tasks right now. Explore modules below to grow your finances.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {taskList.map((task) => {
        const style = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.low;
        return (
          <Link
            key={`${task.type}-${task.id}`}
            to={task.actionUrl}
            className={`block rounded-2xl p-4 border ${style.bg} ${style.border} transition-transform active:scale-[0.98]`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none mt-0.5">{task.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`text-sm font-semibold ${style.text}`}>{task.title}</p>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${style.badge}`}>
                    {task.priority}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{task.description}</p>
                {task.ctaLabel && (
                  <span className={`text-xs font-bold mt-1.5 inline-flex items-center gap-0.5 ${style.text}`}>
                    {task.ctaLabel} <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}