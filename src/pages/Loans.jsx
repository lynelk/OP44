import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Plus, Calculator, FileText, ArrowUpCircle, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoanCostBreakdown, { calcLoanCosts } from '@/components/loans/LoanCostBreakdown';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-600' },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-600' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-600' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-600' },
  disbursed: { label: 'Disbursed', color: 'bg-green-100 text-green-600' },
  active: { label: 'Active', color: 'bg-blue-100 text-blue-600' },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600' },
  defaulted: { label: 'Defaulted', color: 'bg-red-100 text-red-600' },
};

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [showApply, setShowApply] = useState(false);
  const [amount, setAmount] = useState('');
  const [tenure, setTenure] = useState('3');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      base44.entities.LoanApplication.filter({}).then(setLoans);
    });
  }, []);

  const { monthly, totalRepayable, disbursementFee, insuranceCost, netDisbursement } = calcLoanCosts(amount, tenure);

  const handleApply = async () => {
    if (!amount || !purpose) return;
    setSubmitting(true);
    const loan = await base44.entities.LoanApplication.create({
      user_id: user?.id,
      amount_requested: parseFloat(amount),
      tenure_months: parseInt(tenure),
      purpose,
      status: 'submitted',
      monthly_installment: monthly,
      total_repayable: totalRepayable,
      disbursement_fee: disbursementFee,
      insurance_cost: insuranceCost,
      net_disbursement: netDisbursement,
    });
    setLoans(prev => [loan, ...prev]);
    setShowApply(false);
    setAmount('');
    setPurpose('');
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold mb-1">My Loans</h1>
        <p className="text-blue-200 text-sm">Fast, instant, transparent credit</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Quick action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            className="bg-[#f97316] hover:bg-orange-600 text-white col-span-1"
            onClick={() => setShowApply(!showApply)}
          >
            <Plus className="w-4 h-4" />
            Apply
          </Button>
          <Link to="/loans/statement" className="col-span-1">
            <Button variant="outline" className="w-full border-[#1a3a6b] text-[#1a3a6b]">
              <FileText className="w-4 h-4" /> Statement
            </Button>
          </Link>
          <Link to="/loans/repay" className="col-span-1">
            <Button variant="outline" className="w-full border-green-600 text-green-700">
              <ArrowUpCircle className="w-4 h-4" /> Repay
            </Button>
          </Link>
        </div>
        <Link to="/loans/planner">
          <Button variant="outline" className="w-full border-purple-500 text-purple-700 text-sm">
            <TrendingDown className="w-4 h-4" /> Repayment Planner
          </Button>
        </Link>

        {/* Apply Form */}
        {showApply && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-4 h-4" /> Loan Calculator & Application
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Loan Amount (UGX)</label>
                <Input
                  type="number"
                  placeholder="e.g. 500000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Repayment Period</label>
                <Select value={tenure} onValueChange={setTenure}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Month</SelectItem>
                    <SelectItem value="2">2 Months</SelectItem>
                    <SelectItem value="3">3 Months</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                    <SelectItem value="12">12 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Purpose</label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                    <SelectItem value="School Fees">School Fees</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Medical">Medical</SelectItem>
                    <SelectItem value="Daily Expenses">Daily Expenses</SelectItem>
                    <SelectItem value="Asset Acquisition">Asset Acquisition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <LoanCostBreakdown amount={amount} tenure={tenure} />
              <Button
                className="w-full bg-[#1a3a6b] text-white"
                onClick={handleApply}
                disabled={submitting || !amount || !purpose}
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loan List */}
        {loans.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No loan applications yet</p>
            <p className="text-sm mt-1">Apply for your first instant loan above</p>
          </div>
        ) : (
          loans.map(loan => {
            const cfg = STATUS_CONFIG[loan.status] || STATUS_CONFIG.draft;
            return (
              <Card key={loan.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">UGX {(loan.amount_requested / 1000).toFixed(0)}K</p>
                      <p className="text-xs text-gray-500 mt-0.5">{loan.purpose || 'Personal Loan'} · {loan.tenure_months} months</p>
                      {loan.monthly_installment > 0 && (
                        <p className="text-xs text-blue-600 mt-1">UGX {loan.monthly_installment.toLocaleString('en-UG', { maximumFractionDigits: 0 })}/month</p>
                      )}
                    </div>
                    <Badge className={cfg.color}>{cfg.label}</Badge>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    {loan.outstanding_balance > 0 ? (
                      <div className="text-xs text-gray-500">Outstanding: <span className="font-semibold text-gray-700">UGX {(loan.outstanding_balance / 1000).toFixed(0)}K</span></div>
                    ) : <div />}
                    {['active', 'disbursed'].includes(loan.status) && (
                      <div className="flex gap-2">
                        <Link to={`/loans/statement?loan_id=${loan.id}`}>
                          <Button size="sm" variant="ghost" className="text-xs text-[#1a3a6b] h-7 px-2"><FileText className="w-3 h-3 mr-1" />Statement</Button>
                        </Link>
                        <Link to={`/loans/repay?loan_id=${loan.id}`}>
                          <Button size="sm" className="text-xs bg-[#f97316] text-white h-7 px-2"><ArrowUpCircle className="w-3 h-3 mr-1" />Repay</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}