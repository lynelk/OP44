import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronRight, RefreshCw, TrendingUp, AlertTriangle, Lightbulb, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

const TYPE_CONFIG = {
  warning: { bg: 'bg-red-50 border-red-200', iconBg: 'bg-red-100', icon: AlertTriangle, iconColor: 'text-red-500', titleColor: 'text-red-800' },
  tip:     { bg: 'bg-blue-50 border-blue-200', iconBg: 'bg-blue-100', icon: Lightbulb, iconColor: 'text-blue-500', titleColor: 'text-blue-800' },
  action:  { bg: 'bg-amber-50 border-amber-200', iconBg: 'bg-amber-100', icon: TrendingUp, iconColor: 'text-amber-500', titleColor: 'text-amber-800' },
  positive:{ bg: 'bg-emerald-50 border-emerald-200', iconBg: 'bg-emerald-100', icon: Trophy, iconColor: 'text-emerald-500', titleColor: 'text-emerald-800' },
};

export default function FinancialHealthTips() {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const res = await base44.functions.invoke('financialTipsGenerator', {}).catch(() => ({ data: null }));
    setTips(res.data?.tips || []);
    if (isRefresh) setRefreshing(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="space-y-2">
      {[1, 2].map(i => <div key={i} className="bg-gray-100 rounded-2xl h-16 animate-pulse" />)}
    </div>
  );

  if (!tips.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Financial Tips</p>
        <button onClick={() => load(true)} className="text-gray-400 hover:text-gray-600">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {tips.map((tip, i) => {
        const cfg = TYPE_CONFIG[tip.type] || TYPE_CONFIG.tip;
        const Icon = cfg.icon;
        return (
          <div key={i} className={`border rounded-2xl p-3.5 flex items-start gap-3 ${cfg.bg}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
              <span className="text-lg">{tip.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${cfg.titleColor}`}>{tip.title}</p>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{tip.body}</p>
            </div>
            {tip.type === 'action' && (
              <Link to="/financial-health">
                <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}