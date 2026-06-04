import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, TrendingUp, CreditCard, Sparkles, RefreshCw, Loader2, Info } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const TIP_STYLES = {
  warning: 'bg-amber-50 border-amber-100 text-amber-800',
  positive: 'bg-emerald-50 border-emerald-100 text-emerald-800',
  action: 'bg-blue-50 border-blue-100 text-blue-800',
  tip: 'bg-purple-50 border-purple-100 text-purple-800',
};

const EMPLOYMENT_OPTIONS = ['employed', 'self_employed', 'unemployed', 'student', 'retired'];
const GENDER_OPTIONS = ['male', 'female', 'other'];

export default function Benchmarking() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({});

  const load = async (customFilter) => {
    setLoading(true);
    const res = await base44.functions.invoke('benchmarkDataAggregator', {
      demographic_filter: customFilter || filter
    });
    setData(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const applyFilter = (key, val) => {
    const newFilter = { ...filter, [key]: val === 'all' ? undefined : val };
    setFilter(newFilter);
    load(newFilter);
  };

  const scoreChartData = data ? [
    { name: 'Peers (Avg)', score: data.peer_benchmarks.avg_credit_score, fill: '#94a3b8' },
    { name: 'You', score: data.my_metrics.credit_score, fill: '#006B3C' },
  ] : [];

  const savingsChartData = data ? [
    { name: 'Peers (Avg)', rate: parseFloat((data.peer_benchmarks.avg_savings_rate * 100).toFixed(1)), fill: '#94a3b8' },
    { name: 'You', rate: parseFloat((data.my_metrics.savings_rate * 100).toFixed(1)), fill: '#7BC943' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-5 pt-12 pb-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-green-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6" /> Peer Benchmarks
            </h1>
            <p className="text-green-200 text-sm mt-1">See how you compare — anonymized & private</p>
          </div>
          <button onClick={() => load()} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Privacy note */}
        <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl p-3 text-xs text-green-200">
          <Info className="w-4 h-4 shrink-0" />
          All comparisons use anonymized, aggregated data. No individual data is ever revealed.
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Filter Peer Group</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <select
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            onChange={e => applyFilter('employment_status', e.target.value)}
            value={filter.employment_status || 'all'}
          >
            <option value="all">All Employment</option>
            {EMPLOYMENT_OPTIONS.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
          </select>
          <select
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
            onChange={e => applyFilter('gender', e.target.value)}
            value={filter.gender || 'all'}
          >
            <option value="all">All Genders</option>
            {GENDER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#006B3C]" />
          <p className="text-sm">Analyzing peer data...</p>
        </div>
      ) : data ? (
        <div className="px-4 mt-4 space-y-4">
          {/* Sample size banner */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 flex items-center gap-2 shadow-sm">
            <Users className="w-4 h-4 text-[#006B3C]" />
            <p className="text-xs text-gray-500">Comparing against <span className="font-bold text-gray-800 dark:text-gray-100">{data.peer_benchmarks.sample_size}</span> anonymized peers in your demographic</p>
          </div>

          {/* Credit Score Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-5 h-5 text-[#006B3C]" />
              <p className="font-bold text-gray-900 dark:text-white">Credit Score</p>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreChartData} layout="vertical" barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 850]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v, 'Score']} />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                    {scoreChartData.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-[#006B3C]/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-[#006B3C]">{data.my_metrics.credit_score || '—'}</p>
                <p className="text-xs text-gray-500">Your Score</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-gray-700 dark:text-gray-200">{data.peer_benchmarks.avg_credit_score}</p>
                <p className="text-xs text-gray-500">Peer Average</p>
              </div>
            </div>
            <div className={`mt-3 rounded-xl p-3 text-center text-sm font-semibold ${data.gaps.score_gap > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {data.gaps.score_gap > 0
                ? `You're ${data.gaps.score_gap} points below average · Top ${100 - data.my_metrics.score_percentile}% of peers beat you`
                : `You're ${Math.abs(data.gaps.score_gap)} points above average · Better than ${data.my_metrics.score_percentile}% of peers 🎉`}
            </div>
          </div>

          {/* Savings Rate Comparison */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-[#7BC943]" />
              <p className="font-bold text-gray-900 dark:text-white">Savings Rate</p>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={savingsChartData} layout="vertical" barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Savings Rate']} />
                  <Bar dataKey="rate" radius={[0, 6, 6, 0]} fill="#7BC943" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-[#7BC943]/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-[#7BC943]">{(data.my_metrics.savings_rate * 100).toFixed(0)}%</p>
                <p className="text-xs text-gray-500">Your Rate</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-gray-700 dark:text-gray-200">{(data.peer_benchmarks.avg_savings_rate * 100).toFixed(0)}%</p>
                <p className="text-xs text-gray-500">Peer Average</p>
              </div>
            </div>
            <div className={`mt-3 rounded-xl p-3 text-center text-sm font-semibold ${data.gaps.savings_rate_gap > 0.02 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {data.gaps.savings_rate_gap > 0.02
                ? `Save ${(data.gaps.savings_rate_gap * 100).toFixed(0)}% more of income to match peers`
                : `Your savings rate is on par with or above peers 🎉`}
            </div>
          </div>

          {/* Percentile Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-3xl font-black text-[#006B3C]">{data.my_metrics.score_percentile}th</p>
              <p className="text-xs text-gray-500 mt-1">Credit Score Percentile</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-3xl font-black text-[#7BC943]">{data.my_metrics.savings_rate_percentile}th</p>
              <p className="text-xs text-gray-500 mt-1">Savings Rate Percentile</p>
            </div>
          </div>

          {/* AI Tips */}
          {data.tips && data.tips.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">Tips to Close the Gap</p>
              </div>
              <div className="space-y-2">
                {data.tips.map((tip, i) => (
                  <div key={i} className={`rounded-2xl p-4 border ${TIP_STYLES[tip.type] || TIP_STYLES.tip}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0">{tip.icon}</span>
                      <div>
                        <p className="font-semibold text-sm">{tip.title}</p>
                        <p className="text-xs mt-0.5 opacity-80 leading-relaxed">{tip.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400 px-6">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Not enough data yet. Complete your profile to see benchmarks.</p>
        </div>
      )}
    </div>
  );
}