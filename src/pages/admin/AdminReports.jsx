import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ChevronLeft, Download, Mail, RefreshCw, FileText, TrendingUp, Users, Banknote, Filter, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

const REPORT_TYPES = [
  { id: 'loan_summary',       label: 'Loan Portfolio Summary',      icon: Banknote,   desc: 'All loans, disbursements, repayments & NPL' },
  { id: 'user_activity',      label: 'User Activity Report',         icon: Users,      desc: 'Registrations, KYC status, active users' },
  { id: 'investment_returns', label: 'Investment Returns',           icon: TrendingUp, desc: 'Lender earnings, P2P returns & reserve fund' },
  { id: 'crb_monthly',        label: 'CRB Monthly Submission',       icon: FileText,   desc: 'Formatted for Credit Reference Bureau submission' },
  { id: 'regulatory_summary', label: 'Regulatory Summary',           icon: FileText,   desc: 'Compliance report for regulatory bodies' },
  { id: 'collections',        label: 'Collections & Overdue Report', icon: Banknote,   desc: 'Overdue loans, collections, write-offs' },
];

export default function AdminReports() {
  const [selectedType, setSelectedType] = useState('loan_summary');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState('custom');
  const [loading, setLoading] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const applyPeriod = (p) => {
    setPeriod(p);
    const now = new Date();
    const from = new Date();
    if (p === 'this_month') { from.setDate(1); }
    else if (p === 'last_month') { from.setMonth(now.getMonth() - 1); from.setDate(1); now.setDate(0); }
    else if (p === 'last_7') { from.setDate(now.getDate() - 7); }
    else if (p === 'last_90') { from.setDate(now.getDate() - 90); }
    else if (p === 'ytd') { from.setMonth(0); from.setDate(1); }
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(now.toISOString().split('T')[0]);
  };

  const generateReport = async () => {
    setLoading(true);
    setReportData(null);
    const res = await base44.functions.invoke('adminReports', {
      action: 'generate',
      report_type: selectedType,
      date_from: dateFrom,
      date_to: dateTo,
    });
    setReportData(res.data);
    setLoading(false);
  };

  const downloadCSV = () => {
    if (!reportData?.csv) return;
    const blob = new Blob([reportData.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType}_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    if (!reportData?.records) return;
    const blob = new Blob([JSON.stringify(reportData.records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType}_${dateFrom}_${dateTo}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendEmail = async () => {
    if (!emailTo || !reportData) return;
    setSendingEmail(true);
    await base44.functions.invoke('adminReports', {
      action: 'send_email',
      report_type: selectedType,
      date_from: dateFrom,
      date_to: dateTo,
      email_to: emailTo,
      report_data: reportData,
    });
    setSendingEmail(false);
    setSuccessMsg(`Report sent to ${emailTo}`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const selectedReportMeta = REPORT_TYPES.find(r => r.id === selectedType);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Admin
        </Link>
        <h1 className="text-xl font-bold">Reports</h1>
        <p className="text-blue-200 text-xs mt-0.5">Generate, download & email platform reports</p>
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* Report Type Selection */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Report Type</p>
          <div className="grid grid-cols-1 gap-2">
            {REPORT_TYPES.map(rt => {
              const Icon = rt.icon;
              return (
                <button
                  key={rt.id}
                  onClick={() => { setSelectedType(rt.id); setReportData(null); }}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    selectedType === rt.id
                      ? 'border-[#1a3a6b] bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-200'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    selectedType === rt.id ? 'bg-[#1a3a6b] text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${selectedType === rt.id ? 'text-[#1a3a6b]' : 'text-gray-800'}`}>{rt.label}</p>
                    <p className="text-xs text-gray-400 truncate">{rt.desc}</p>
                  </div>
                  {selectedType === rt.id && <CheckCircle2 className="w-4 h-4 text-[#1a3a6b] flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Period Filter */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Period
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { id: 'last_7', label: 'Last 7 days' },
              { id: 'this_month', label: 'This month' },
              { id: 'last_month', label: 'Last month' },
              { id: 'last_90', label: 'Last 90 days' },
              { id: 'ytd', label: 'Year to date' },
              { id: 'custom', label: 'Custom' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyPeriod(p.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  period === p.id ? 'bg-[#1a3a6b] text-white border-[#1a3a6b]' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">From</label>
              <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPeriod('custom'); }} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">To</label>
              <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPeriod('custom'); }} />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          className="w-full bg-[#1a3a6b] text-white h-11"
          onClick={generateReport}
          disabled={loading}
        >
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Generating...</> : 'Generate Report'}
        </Button>

        {/* Report Results */}
        {reportData && (
          <div className="space-y-3">
            {/* Summary Cards */}
            {reportData.summary && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Summary</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(reportData.summary).map(([key, val]) => (
                    <Card key={key}>
                      <CardContent className="p-3">
                        <p className="text-xs text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-base font-bold text-gray-900 mt-0.5">
                          {typeof val === 'number' && val > 10000
                            ? `UGX ${val.toLocaleString()}`
                            : typeof val === 'number' && String(val).includes('.')
                            ? `${val.toFixed(1)}%`
                            : val?.toLocaleString?.() ?? val}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Download & Email Actions */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Export & Share</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-xs" onClick={downloadCSV}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download CSV
                  </Button>
                  <Button variant="outline" className="flex-1 text-xs" onClick={downloadJSON}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download JSON
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Email address to send report"
                    value={emailTo}
                    onChange={e => setEmailTo(e.target.value)}
                    type="email"
                    className="flex-1 text-sm"
                  />
                  <Button
                    className="bg-[#006B3C] text-white text-xs px-4"
                    onClick={sendEmail}
                    disabled={sendingEmail || !emailTo}
                  >
                    {sendingEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                {successMsg && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2.5 text-xs text-green-700">
                    <CheckCircle2 className="w-4 h-4" /> {successMsg}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Records Preview */}
            {reportData.records && reportData.records.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Preview ({reportData.records.length} records)
                </p>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {Object.keys(reportData.records[0]).slice(0, 6).map(k => (
                            <th key={k} className="text-left px-3 py-2 text-gray-500 font-medium capitalize whitespace-nowrap">
                              {k.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reportData.records.slice(0, 20).map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {Object.values(row).slice(0, 6).map((val, j) => (
                              <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                {typeof val === 'number' ? val.toLocaleString() : String(val ?? '—')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {reportData.records.length > 20 && (
                    <p className="text-xs text-gray-400 text-center py-2 border-t">
                      Showing 20 of {reportData.records.length} — download for full data
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}