import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

const POSITIVE_PATTERNS = ['EXCELLENT', 'GOOD', 'BOOST', 'REPAID', 'SAVINGS'];
const NEGATIVE_PATTERNS = ['POOR', 'OVERDUE', 'DEFAULT', 'NO_KYC', 'NO_REPAYMENT', 'NO_INCOME'];

function humanize(code) {
  const map = {
    NO_KYC_VERIFIED: 'No KYC documents verified yet',
    PARTIAL_KYC: 'KYC documents partially verified',
    EXCELLENT_REPAYMENT_HISTORY: 'Excellent repayment track record',
    GOOD_REPAYMENT_HISTORY: 'Good repayment history',
    POOR_REPAYMENT_HISTORY: 'Repayment history needs improvement',
    NO_REPAYMENT_HISTORY: 'No repayment history found',
    NO_INCOME_DECLARED: 'No income declared in profile',
  };
  if (map[code]) return map[code];
  if (code.startsWith('OVERDUE_PAYMENTS:')) return `${code.split(':')[1]} overdue payment(s) on record`;
  if (code.startsWith('LOAN_DEFAULTS:')) return `${code.split(':')[1]} loan default(s) detected`;
  if (code.startsWith('LOANS_FULLY_REPAID:')) return `${code.split(':')[1]} loan(s) fully repaid`;
  if (code.startsWith('SAVINGS_BOOST:')) return `Savings activity boosted your score by ${code.split(':')[1]}`;
  if (code.startsWith('RESPONSIBLE_SPENDING_BOOST:')) return `Responsible spending boosted your score by ${code.split(':')[1]}`;
  return code.toLowerCase().replace(/_/g, ' ');
}

function getType(code) {
  if (POSITIVE_PATTERNS.some(p => code.includes(p))) return 'positive';
  if (NEGATIVE_PATTERNS.some(p => code.includes(p))) return 'negative';
  return 'neutral';
}

export default function ReasonCodes({ codes }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Score Factors
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {codes.map((code, i) => {
          const type = getType(code);
          return (
            <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${
              type === 'positive' ? 'bg-emerald-50 text-emerald-700' :
              type === 'negative' ? 'bg-red-50 text-red-700' :
              'bg-slate-50 text-slate-600'
            }`}>
              {type === 'positive'
                ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                : type === 'negative'
                ? <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                : <div className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 rounded-full bg-slate-300" />
              }
              <span>{humanize(code)}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}