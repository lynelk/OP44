import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, FileText, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const TEMPLATES = [
  { id: 'crb_monthly', label: 'CRB Monthly Submission', desc: 'Account performance data for Credit Reference Bureau', badge: 'CRB' },
  { id: 'regulatory_summary', label: 'Regulatory Summary Report', desc: 'Summary stats for regulator (BOU / UMRA)', badge: 'Regulatory' },
];

export default function AdminSubmissions() {
  const [template, setTemplate] = useState('crb_monthly');
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const generate = async () => {
    setLoading(true);
    setReport(null);
    const res = await base44.functions.invoke('adminManager', {
      action: 'generate', entity: 'data_submission',
      data: { template_type: template, date_from: dateFrom, date_to: dateTo }
    });
    setReport(res.data?.submission);
    setLoading(false);
  };

  const downloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.submission_type}_${dateFrom}_${dateTo}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (!report?.records?.length) return;
    const headers = Object.keys(report.records[0]).join(',');
    const rows = report.records.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.submission_type}_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3"><ChevronLeft className="w-4 h-4" /> Admin</Link>
        <h1 className="text-xl font-bold">Data Submissions</h1>
        <p className="text-blue-200 text-xs">Regulatory & CRB standardised reports</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Generate Submission</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
            <Button className="w-full bg-[#1a3a6b] text-white" onClick={generate} disabled={loading}>
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Generating...</> : <><FileText className="w-4 h-4 mr-2" /> Generate Report</>}
            </Button>
          </CardContent>
        </Card>

        {/* Template descriptions */}
        <div className="space-y-2">
          {TEMPLATES.map(t => (
            <Card key={t.id} className={`cursor-pointer border-2 ${template === t.id ? 'border-[#1a3a6b]' : 'border-transparent'}`} onClick={() => setTemplate(t.id)}>
              <CardContent className="p-3 flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-500 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">{t.label}</p>
                  <p className="text-xs text-gray-500">{t.desc}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 text-xs">{t.badge}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {report && (
          <Card className="border-2 border-green-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Report Generated
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {JSON.stringify(report, null, 2).slice(0, 1000)}{JSON.stringify(report).length > 1000 ? '\n...[truncated]' : ''}
              </div>
              {report.total_accounts !== undefined && (
                <p className="text-sm text-gray-600">📊 {report.total_accounts} account records ready</p>
              )}
              <div className="flex gap-2">
                <Button className="flex-1 bg-green-600 text-white text-sm" onClick={downloadJSON}>
                  <Download className="w-4 h-4 mr-1" /> JSON
                </Button>
                {report.records?.length > 0 && (
                  <Button className="flex-1 bg-blue-600 text-white text-sm" onClick={downloadCSV}>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}