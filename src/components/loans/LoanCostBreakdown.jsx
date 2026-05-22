import { AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

// Fee structure constants
export const DISBURSEMENT_FEE_RATE = 0.03;   // 3%
export const INSURANCE_RATE = 0.01;          // 1%
export const MONTHLY_INTEREST_RATE = 0.05;  // 5%
export const LATE_PENALTY_RATE = 0.05;       // 5% of overdue per month
export const ROLLOVER_FEE_RATE = 0.10;       // 10% of outstanding

export function calcLoanCosts(amount, tenureMonths) {
  const principal = parseFloat(amount) || 0;
  const months = parseInt(tenureMonths) || 1;
  const disbursementFee = principal * DISBURSEMENT_FEE_RATE;
  const insuranceCost = principal * INSURANCE_RATE;
  const netDisbursement = principal - disbursementFee - insuranceCost;
  const r = MONTHLY_INTEREST_RATE;
  const monthly = principal > 0
    ? (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
    : 0;
  const totalRepayable = monthly * months;
  return { disbursementFee, insuranceCost, netDisbursement, monthly, totalRepayable };
}

export default function LoanCostBreakdown({ amount, tenure }) {
  const [showPenalties, setShowPenalties] = useState(false);
  const { disbursementFee, insuranceCost, netDisbursement, monthly, totalRepayable } = calcLoanCosts(amount, tenure);
  const principal = parseFloat(amount) || 0;

  if (!principal) return null;

  return (
    <div className="space-y-3">
      {/* Cost Summary */}
      <div className="bg-blue-50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-3">Loan Breakdown</p>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Loan Amount Requested</span>
          <span className="font-medium">UGX {principal.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</span>
        </div>

        <div className="flex justify-between text-sm text-red-600">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3" /> Disbursement Fee (3%)
          </span>
          <span className="font-medium">– UGX {disbursementFee.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</span>
        </div>

        <div className="flex justify-between text-sm text-orange-600">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3" /> Loan Protection Insurance (1%)
          </span>
          <span className="font-medium">– UGX {insuranceCost.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</span>
        </div>

        <div className="border-t border-blue-200 pt-2 flex justify-between text-sm font-bold text-green-700">
          <span>You Will Receive</span>
          <span>UGX {netDisbursement.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</span>
        </div>

        <div className="border-t border-blue-200 pt-2 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Monthly Installment</span>
            <span className="font-bold text-blue-700">UGX {monthly.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Total Repayable</span>
            <span>UGX {totalRepayable.toLocaleString('en-UG', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>Interest Rate</span>
            <span>5% per month (flat)</span>
          </div>
        </div>
      </div>

      {/* Penalty Terms Toggle */}
      <button
        className="w-full flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium"
        onClick={() => setShowPenalties(!showPenalties)}
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Default & Penalty Terms
        </span>
        {showPenalties ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showPenalties && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2 text-xs text-gray-700">
          <p className="font-semibold text-red-700 mb-2">Terms & Conditions for Late/Default Payment</p>
          <ul className="space-y-2 list-disc ml-4">
            <li><span className="font-medium">Late Payment Penalty:</span> 5% of the overdue installment charged for every 30-day period the payment remains outstanding.</li>
            <li><span className="font-medium">Rollover Fee:</span> If a loan is rolled over, a 10% fee of the outstanding balance is applied immediately.</li>
            <li><span className="font-medium">Credit Score Impact:</span> Payments overdue by 7+ days will negatively affect your credit score and may reduce your future loan limit.</li>
            <li><span className="font-medium">Collections:</span> Accounts overdue by 90+ days may be referred to a collections agency and reported to the credit bureau.</li>
            <li><span className="font-medium">Loan Closure:</span> OpFin reserves the right to demand full repayment of the outstanding balance if 2 or more consecutive payments are missed.</li>
          </ul>
          <p className="text-gray-500 mt-2 italic">By submitting an application you confirm you have read and accepted these terms.</p>
        </div>
      )}
    </div>
  );
}