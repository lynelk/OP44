import { base44 } from '@/api/base44Client';
import { Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const TYPE_STYLES = {
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800',
  action:  'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',
  positive:'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800',
  tip:     'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700',
};

export default function InsightsSection() {
  const queryClient = useQueryClient();

  const { data: tipsData, isLoading: loading } = useQuery({
    queryKey: ['financialTips'],
    queryFn: () => base44.functions.invoke('financialTipsGenerator', {}).then(r => r.data),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const tips = tipsData?.tips || [];
  const load = () => queryClient.invalidateQueries({ queryKey: ['financialTips'] });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" /> Financial Insights
        </h2>
        <button onClick={load} className="text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl p-4 animate-pulse">
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3 mt-1" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {tips.map((tip, i) => (
            <div key={i} className={`rounded-2xl p-4 border ${TYPE_STYLES[tip.type] || TYPE_STYLES.tip}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{tip.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{tip.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{tip.body}</p>
                </div>
              </div>
            </div>
          ))}
          <Link to="/budget/insights">
            <div className="flex items-center justify-center gap-1 py-2 text-blue-500 text-sm font-medium">
              Full spending analysis <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}