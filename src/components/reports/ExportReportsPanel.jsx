import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, FileText, Loader2 } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'CBA', label: 'Credit Borrower Account', desc: 'Full loan account data (BOU CBA template)' },
  { id: 'CAP', label: 'Credit Application', desc: 'Loan application records (BOU CAP template)' },
  { id: 'FHR', label: 'Financial Health Report', desc: 'Your personal financial health summary' },
  { id: 'PI',  label: 'Participating Institution', desc: 'Institution data (BOU PI template)' },
  { id: 'IB',  label: 'Institution Branch',        desc: 'Branch data (BOU IB template)' },
  { id: 'BC',  label: 'Bounced Cheques',           desc: 'Bounced cheque records (BOU BC template)' },
  { id: 'PIS', label: 'PI Stakeholder',            desc: 'Institution stakeholder data (BOU PIS)' },
  { id: 'BS',  label: 'Borrower Stakeholder',      desc: 'Borrower stakeholder data (BOU BS)' },
  { id: 'CMC', label: 'Material Collateral',       desc: 'Collateral records (BOU CMC template)' },
  { id: 'CCG', label: 'Credit Guarantor',          desc: 'Guarantor records (BOU CCG template)' },
  { id: 'FRA', label: 'Financial Malpractice',     desc: 'Fraud/malpractice data (BOU FRA template)' },
];

export default function ExportReportsPanel({ loanId = null, compact = false }) {
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');

  const handleDownload = async (reportType) => {
    setDownloading(reportType);
    setError('');
    try {
      const response = await fetch(`/api/functions/exportCRBReports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ report_type: reportType, loan_id: loanId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Export failed');
      }

      const blob = await response.blob();
      const cd = response.headers.get('Content-Disposition') || '';
      const filenameMatch = cd.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `${reportType}_export.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      // Fallback: use SDK invoke
      try {
        const res = await base44.functions.invoke('exportCRBReports', { report_type: reportType, loan_id: loanId });
        const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_export.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e2) {
        setError(e2.message || 'Export failed');
      }
    }
    setDownloading(null);
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {REPORT_TYPES.slice(0, 3).map(r => (
            <button
              key={r.id}
              onClick={() => handleDownload(r.id)}
              disabled={!!downloading}
              className="flex items-center gap-1.5 text-xs font-medium px-3 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 transition-colors"
            >
              {downloading === r.id
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Download className="w-3 h-3" />}
              {r.id}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <FileText className="w-4 h-4 text-slate-500" />
        <p className="text-sm font-semibold text-slate-700">Export CRB Reports</p>
        <span className="ml-auto text-xs text-slate-400">BOU DVR v6.0</span>
      </div>
      {error && (
        <div className="px-4 pt-3 text-xs text-red-600 bg-red-50">{error}</div>
      )}
      <div className="divide-y divide-slate-50">
        {REPORT_TYPES.map(r => (
          <div key={r.id} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0 mr-3">
              <p className="text-sm font-medium text-slate-800 truncate">{r.label}</p>
              <p className="text-xs text-slate-400 truncate">{r.desc}</p>
            </div>
            <button
              onClick={() => handleDownload(r.id)}
              disabled={!!downloading}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-50 transition-colors"
            >
              {downloading === r.id
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Download className="w-3 h-3" />}
              {r.id}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function getAuthHeaders() {
  try {
    const token = localStorage.getItem('base44_token') || sessionStorage.getItem('base44_token') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}