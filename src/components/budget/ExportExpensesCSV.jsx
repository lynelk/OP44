import { useState } from 'react';
import { Download } from 'lucide-react';

const CATEGORY_ICONS = {
  food: '🍔', transport: '🚌', housing: '🏠', health: '💊', education: '📚',
  entertainment: '🎬', utilities: '💡', clothing: '👗', savings: '💰',
  loan_repayment: '🏦', other: '📋'
};

export default function ExportExpensesCSV({ expenses }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    if (!expenses || expenses.length === 0) return;
    setExporting(true);

    const headers = ['Date', 'Category', 'Description', 'Amount (UGX)', 'Payment Method'];
    const rows = expenses.map(e => [
      e.date || '',
      e.category ? e.category.replace('_', ' ') : '',
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.amount || 0,
      e.payment_method || 'cash',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting || !expenses || expenses.length === 0}
      className="flex items-center gap-1.5 h-10 bg-[#00C48C] hover:bg-[#00a878] disabled:opacity-40 text-white text-sm font-medium px-4 rounded-full transition-colors"
    >
      <Download className="w-4 h-4" />
      {exporting ? 'Exporting…' : 'Export CSV'}
    </button>
  );
}