import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, AlertCircle, ChevronRight, Loader2, Info, BarChart2, X, Check } from 'lucide-react';
import { monthlyInstallment } from '@/lib/finance';

const RISK_COLORS = {
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  B: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  C: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  D: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
};

export default function LoanPreQualify() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const toggleCompare = (product) => {
    setCompareList(prev => {
      const exists = prev.find(p => p.name === product.name);
      if (exists) return prev.filter(p => p.name !== product.name);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, product];
    });
  };

  useEffect(() => {
    base44.auth.me().then(() => handleCheck());
  }, []);

  const handleCheck = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('loanPreQualifier', {});
    setData(res.data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white px-5 pt-14 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-6 h-6" />
          <h1 className="text-2xl font-bold tracking-tight">Pre-Qualification</h1>
        </div>
        <p className="text-orange-100 text-sm">See how much you're eligible to borrow instantly</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-10 h-10 mx-auto mb-3 text-orange-500 animate-spin" />
            <p className="text-gray-400 text-sm">Analysing your financial profile…</p>
          </div>
        ) : data ? (
          <>
            {!data.income_declared && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-700 dark:text-amber-200 text-sm">Income not declared</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Update your monthly income in Profile to improve your pre-qualification capacity.</p>
                  <Link to="/profile">
                    <button className="mt-2 h-8 px-4 bg-amber-500 text-white rounded-xl text-xs font-semibold">Update Profile</button>
                  </Link>
                </div>
              </div>
            )}

            {/* Max Borrowing Capacity */}
            <div className="bg-gradient-to-br from-[#0f2952] via-[#1a3a6b] to-[#1e4d8c] text-white rounded-2xl p-6 text-center">
              <p className="text-blue-200 text-sm mb-2 font-medium">Maximum Borrowing Capacity</p>
              <p className="text-4xl font-bold tracking-tight mb-3">UGX {data.max_borrowing_capacity?.toLocaleString()}</p>
              <div className="flex justify-center gap-2">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${RISK_COLORS[data.risk_band] || 'bg-white/20 text-white'}`}>
                  Risk Band {data.risk_band}
                </span>
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/20 text-white">
                  Score: {data.credit_score}
                </span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">How we calculated this</p>
              </div>
              {[
                { label: 'Monthly Income', value: data.monthly_income, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Avg Monthly Expenses', value: -data.avg_monthly_spending, color: 'text-red-500' },
                { label: 'Disposable Income', value: data.disposable_income, color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Active Loan Repayments', value: -data.active_loan_installments, color: 'text-orange-500' },
                { label: 'Net Disposable', value: data.net_disposable, color: 'text-gray-900 dark:text-white', bold: true },
              ].map((row, i) => (
                <div key={i} className={`flex justify-between items-center px-4 py-3 border-b border-gray-50 dark:border-gray-700 last:border-0 ${row.bold ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}>
                  <span className={`text-sm ${row.bold ? 'font-semibold text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>{row.label}</span>
                  <span className={`text-sm font-semibold ${row.color}`}>
                    {row.value < 0 ? '-' : ''}UGX {Math.abs(row.value || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Eligible Products */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                {data.eligible_products?.length > 0
                  ? `${data.eligible_products.length} Products You Qualify For`
                  : 'Loan Products'}
              </p>
              {data.eligible_products?.length === 0 ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl p-5 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                  <p className="text-sm text-red-600 dark:text-red-300 font-semibold">No products currently match your profile</p>
                  <p className="text-xs text-red-400 dark:text-red-500 mt-1">Improve your credit score or declare income to unlock loan products</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.eligible_products.map((product, i) => (
                    <div key={i} className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm ${product.popular ? 'ring-2 ring-orange-400' : ''}`}>
                      {product.popular && (
                        <span className="text-xs font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300 rounded-full px-2.5 py-1 mb-3 inline-block">⭐ Popular</span>
                      )}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{product.icon || '💰'}</span>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{product.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{product.description}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">UGX {product.qualified_amount?.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">{product.interest_rate?.toFixed(1)}%/mo</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-400 dark:text-gray-500">Up to {product.max_tenure_months} months</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleCompare(product)}
                            className={`text-xs font-semibold rounded-xl h-8 px-3 flex items-center gap-1 border transition-all active:scale-95 ${
                              compareList.find(p => p.name === product.name)
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <BarChart2 className="w-3 h-3" />
                            {compareList.find(p => p.name === product.name) ? 'Added' : 'Compare'}
                          </button>
                          <Link to="/loans">
                            <button className="text-xs bg-orange-500 text-white font-semibold rounded-xl h-8 px-4 flex items-center gap-1 active:scale-95 transition-all">
                              Apply <ChevronRight className="w-3 h-3" />
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              className="w-full h-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              onClick={handleCheck}
            >
              <TrendingUp className="w-4 h-4" /> Refresh Pre-Qualification
            </button>
          </>
        ) : (
          <div className="text-center py-20">
            <button
              className="h-14 px-8 bg-orange-500 text-white rounded-2xl font-semibold flex items-center gap-2 mx-auto transition-all active:scale-95"
              onClick={handleCheck}
            >
              <Zap className="w-5 h-5" /> Check My Eligibility
            </button>
          </div>
        )}
      </div>
      {/* Compare sticky bar */}
      {compareList.length > 0 && !showCompare && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <button
            onClick={() => setShowCompare(true)}
            className="w-full h-12 bg-[#0f2952] text-white font-bold rounded-2xl text-sm shadow-xl flex items-center justify-center gap-2"
          >
            <BarChart2 className="w-4 h-4" />
            Compare {compareList.length} Product{compareList.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Comparison modal */}
      {showCompare && compareList.length > 0 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Product Comparison</h3>
              <button onClick={() => setShowCompare(false)} className="text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-gray-400 font-normal pb-2 pr-3 min-w-[100px]">Feature</th>
                    {compareList.map((p, i) => (
                      <th key={i} className="text-center pb-2 px-2 min-w-[90px]">
                        <span className="text-sm">{p.icon || '💰'}</span>
                        <p className="font-semibold text-gray-800 dark:text-white text-xs mt-0.5 leading-tight">{p.name}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    { label: 'Max Amount', fn: p => `UGX ${p.qualified_amount?.toLocaleString() || '—'}` },
                    { label: 'Interest/mo', fn: p => `${p.interest_rate?.toFixed(1) || '—'}%` },
                    { label: 'Max Tenure', fn: p => `${p.max_tenure_months || '—'} mo` },
                    { label: 'Monthly Est.', fn: p => {
                      if (!p.qualified_amount || !p.interest_rate || !p.max_tenure_months) return '—';
                      const est = monthlyInstallment(p.qualified_amount, p.interest_rate / 100, p.max_tenure_months);
                      return `UGX ${est.toLocaleString()}`;
                    }},
                    { label: 'Popular', fn: p => p.popular ? '✓' : '—' },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td className="py-2.5 pr-3 text-gray-500 dark:text-gray-400">{row.label}</td>
                      {compareList.map((p, j) => (
                        <td key={j} className="py-2.5 px-2 text-center font-semibold text-gray-800 dark:text-white">{row.fn(p)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => { setShowCompare(false); setCompareList([]); }}
              className="w-full mt-4 h-11 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300"
            >
              Clear Comparison
            </button>
          </div>
        </div>
      )}
    </div>
  );
}