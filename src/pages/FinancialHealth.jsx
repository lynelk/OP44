import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import HealthScoreRing from '@/components/health/HealthScoreRing';
import PillarBar from '@/components/health/PillarBar';
import AIAdviceCard from '@/components/health/AIAdviceCard';
import HealthMetricsGrid from '@/components/health/HealthMetricsGrid';
import RuleFlags from '@/components/health/RuleFlags';
import ExportReportsPanel from '@/components/reports/ExportReportsPanel';

export default function FinancialHealth() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadCachedReport(); }, []);

  const loadCachedReport = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    const reports = await base44.entities.FinancialHealthReport.filter({ user_id: me.id });
    const latest = reports.sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at))[0];
    setReport(latest || null);
    setLoading(false);
  };

  const runHealthCheck = async () => {
    setGenerating(true);
    const res = await base44.functions.invoke('financialHealthCheck', {});
    setReport(res.data.report);
    setGenerating(false);
  };

  const lastUpdated = report?.generated_at
    ? new Date(report.generated_at).toLocaleString('en-UG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-slate-900 text-white px-5 pt-12 pb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold">Financial Health</h1>
          </div>
          {report && (
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-white/10"
              onClick={runHealthCheck}
              disabled={generating}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Analysing...' : 'Refresh'}
            </Button>
          )}
        </div>
        {lastUpdated && <p className="text-slate-400 text-xs">Last updated {lastUpdated}</p>}
        <Link to="/health/projection" className="mt-3 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 text-sm text-white w-fit">
          <TrendingUp className="w-4 h-4 text-emerald-400" /> Future Health Projection
        </Link>

        {/* Score ring */}
        {report && !generating && (
          <div className="flex justify-center mt-6">
            <HealthScoreRing score={report.overall_score} grade={report.grade} />
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : generating ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
            <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-sm font-medium">Analysing your finances with AI...</p>
            <p className="text-xs text-slate-400">This takes about 10 seconds</p>
          </div>
        ) : !report ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
            <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center">
              <Activity className="w-8 h-8 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">Run Your Health Check</h2>
              <p className="text-sm text-slate-500">Get a personalised score across credit, savings, spending and debt — with AI-powered tips.</p>
            </div>
            <Button className="bg-slate-800 hover:bg-slate-700 px-8" onClick={runHealthCheck}>
              Start Health Check
            </Button>
          </div>
        ) : (
          <>
            {/* Metrics grid */}
            <HealthMetricsGrid report={report} />

            {/* Pillar breakdown */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
              <p className="text-sm font-semibold text-slate-700">Score Breakdown</p>
              <PillarBar pillar="credit"   score={report.credit_pillar_score   || 0} />
              <PillarBar pillar="savings"  score={report.savings_pillar_score  || 0} />
              <PillarBar pillar="spending" score={report.spending_pillar_score || 0} />
              <PillarBar pillar="debt"     score={report.debt_pillar_score     || 0} />
            </div>

            {/* Rule flags */}
            <RuleFlags flags={report.rule_flags || []} />

            {/* AI advice */}
            {(report.ai_summary || report.ai_tips?.length > 0) && (
              <AIAdviceCard summary={report.ai_summary} tips={report.ai_tips || []} />
            )}

            {/* Export Reports */}
            <ExportReportsPanel />
          </>
        )}
      </div>
    </div>
  );
}