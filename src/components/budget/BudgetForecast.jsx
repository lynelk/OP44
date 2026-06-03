import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const CATEGORY_ICONS = {
  food: '🍔', transport: '🚌', housing: '🏠', health: '💊', education: '📚',
  entertainment: '🎬', utilities: '💡', clothing: '👗', savings: '💰', loan_repayment: '🏦', other: '📋'
};

const TREND_CONFIG = {
  over_budget: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', icon: AlertTriangle, label: 'Over Budget' },
  at_risk: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: TrendingUp, label: 'At Risk' },
  on_track: { color: 'text-green-600', bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'On Track' },
};

const STATUS_CONFIG = {
  at_risk: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', label: '⚠️ At Risk' },
  caution: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: '🔶 Caution' },
  on_track: { color: 'text-green-700', bg: 'bg-green-50 border-green-200', label: '✅ On Track' },
};

export default function BudgetForecast() {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [ran, setRan] = useState(false);

  const runForecast = async () => {
    setLoading(true);
    setExpanded(true);
    const res = await base44.functions.invoke('predictBudgetShortfalls', {});
    setForecast(res.data);
    setLoading(false);
    setRan(true);
  };

  const statusCfg = forecast ? (STATUS_CONFIG[forecast.overall_status] || STATUS_CONFIG.on_track) : null;
  const atRiskItems = forecast?.forecasts?.filter(f => f.trend !== 'on_track') || [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => { if (!ran) runForecast(); else setExpanded(e => !e); }}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0D1BFF] to-[#32B4FF] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-gray-900 dark:text-white">AI Budget Forecast</p>
            <p className="text-xs text-gray-400">
              {ran ? (atRiskItems.length > 0 ? `${atRiskItems.length} categories need attention` : 'You\'re on track this month') : 'Tap to analyze your spending'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw className="w-4 h-4 text-[#0D1BFF] animate-spin" />}
          {ran && !loading && (expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />)}
          {!ran && !loading && (
            <span className="text-xs bg-[#0D1BFF]/10 text-[#0D1BFF] dark:bg-[#32B4FF]/10 dark:text-[#32B4FF] font-semibold px-3 py-1 rounded-full">Analyze</span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
          {loading && (
            <div className="flex flex-col items-center py-6 gap-2">
              <div className="w-8 h-8 border-4 border-blue-100 border-t-[#0D1BFF] rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Analyzing your spending patterns...</p>
            </div>
          )}

          {!loading && forecast && (
            <>
              {/* Overall status */}
              {statusCfg && (
                <div className={`rounded-xl p-3 border ${statusCfg.bg}`}>
                  <p className={`text-sm font-semibold ${statusCfg.color}`}>{statusCfg.label}</p>
                  {forecast.summary && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{forecast.summary}</p>}
                </div>
              )}

              {/* Top suggestion */}
              {forecast.top_suggestion && (
                <div className="bg-[#0D1BFF]/5 border border-[#0D1BFF]/20 rounded-xl p-3 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[#0D1BFF] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#0D1BFF] dark:text-[#32B4FF] font-medium">{forecast.top_suggestion}</p>
                </div>
              )}

              {/* Category forecasts */}
              {forecast.forecasts?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category Breakdown</p>
                  {forecast.forecasts.map((item, idx) => {
                    const cfg = TREND_CONFIG[item.trend] || TREND_CONFIG.on_track;
                    const Icon = cfg.icon;
                    const pct = item.budget_limit > 0
                      ? Math.min(100, Math.round((item.projected_month_end / item.budget_limit) * 100))
                      : null;
                    return (
                      <div key={idx} className={`rounded-xl p-3 border ${cfg.bg}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span>{CATEGORY_ICONS[item.category] || '📋'}</span>
                            <span className="text-sm font-medium text-gray-800 capitalize">{item.category?.replace('_', ' ')}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                          </div>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        {item.budget_limit > 0 && pct !== null && (
                          <div className="mt-2 mb-1">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>UGX {(item.current_spend / 1000).toFixed(0)}K spent</span>
                              <span>Projected: UGX {(item.projected_month_end / 1000).toFixed(0)}K / {(item.budget_limit / 1000).toFixed(0)}K limit</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${item.trend === 'over_budget' ? 'bg-red-500' : item.trend === 'at_risk' ? 'bg-amber-400' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {item.suggestion && (
                          <p className="text-xs text-gray-600 mt-1.5 italic">💡 {item.suggestion}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {forecast.message && (
                <p className="text-center text-sm text-gray-400 py-4">{forecast.message}</p>
              )}

              <button
                onClick={runForecast}
                className="w-full h-9 rounded-xl border border-[#0D1BFF]/30 text-[#0D1BFF] dark:text-[#32B4FF] text-sm font-medium flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Analysis
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}