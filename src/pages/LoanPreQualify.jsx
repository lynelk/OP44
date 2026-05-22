import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, AlertCircle, CheckCircle, ChevronRight, Loader2, Info } from 'lucide-react';

const RISK_COLORS = { A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700', C: 'bg-yellow-100 text-yellow-700', D: 'bg-red-100 text-red-700' };

export default function LoanPreQualify() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      handleCheck();
    });
  }, []);

  const handleCheck = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('loanPreQualifier', {});
    setData(res.data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white px-4 pt-10 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Pre-Qualification</h1>
        </div>
        <p className="text-orange-100 text-sm">See how much you're eligible to borrow instantly</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-10 h-10 mx-auto mb-3 text-orange-500 animate-spin" />
            <p className="text-gray-500 text-sm">Analyzing your financial profile...</p>
          </div>
        ) : data ? (
          <>
            {!data.income_declared && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4 flex gap-3 items-start">
                  <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-orange-700 text-sm">Income not declared</p>
                    <p className="text-xs text-orange-600 mt-1">Update your monthly income in Profile to improve your pre-qualification capacity.</p>
                    <Link to="/profile"><Button size="sm" className="mt-2 bg-orange-500 text-white text-xs h-7">Update Profile</Button></Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Max Borrowing Capacity */}
            <Card className="bg-gradient-to-br from-[#1a3a6b] to-[#0d2a52] text-white">
              <CardContent className="p-6 text-center">
                <p className="text-blue-200 text-sm mb-2">Maximum Borrowing Capacity</p>
                <p className="text-4xl font-bold mb-2">UGX {data.max_borrowing_capacity?.toLocaleString()}</p>
                <div className="flex justify-center gap-2 mt-2">
                  <Badge className={RISK_COLORS[data.risk_band] || 'bg-gray-100 text-gray-700'}>
                    Risk Band {data.risk_band}
                  </Badge>
                  <Badge className="bg-white/20 text-white">Score: {data.credit_score}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Financial Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                  <Info className="w-4 h-4" /> How we calculated this
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { label: 'Monthly Income', value: data.monthly_income, color: 'text-green-600' },
                  { label: 'Avg Monthly Expenses', value: -data.avg_monthly_spending, color: 'text-red-500' },
                  { label: 'Disposable Income', value: data.disposable_income, color: 'text-blue-600' },
                  { label: 'Active Loan Repayments', value: -data.active_loan_installments, color: 'text-orange-500' },
                  { label: 'Net Disposable', value: data.net_disposable, color: 'text-gray-800', bold: true },
                ].map((row, i) => (
                  <div key={i} className={`flex justify-between items-center py-1 border-b last:border-0 ${row.bold ? 'font-semibold' : ''}`}>
                    <span className="text-gray-600">{row.label}</span>
                    <span className={row.color}>
                      {row.value < 0 ? '-' : ''}UGX {Math.abs(row.value || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Eligible Products */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">
                {data.eligible_products?.length > 0
                  ? `${data.eligible_products.length} Loan Products You Qualify For`
                  : 'Loan Products'}
              </p>
              {data.eligible_products?.length === 0 ? (
                <Card className="border-red-100 bg-red-50">
                  <CardContent className="p-4 text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                    <p className="text-sm text-red-600 font-medium">No products currently match your profile</p>
                    <p className="text-xs text-red-400 mt-1">Improve your credit score or declare income to unlock loan products</p>
                  </CardContent>
                </Card>
              ) : (
                data.eligible_products.map((product, i) => (
                  <Card key={i} className={`mb-3 ${product.popular ? 'ring-2 ring-orange-400' : ''}`}>
                    <CardContent className="p-4">
                      {product.popular && (
                        <Badge className="bg-orange-100 text-orange-600 text-xs mb-2">⭐ Popular</Badge>
                      )}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{product.icon || '💰'}</span>
                          <div>
                            <p className="font-semibold text-gray-800">{product.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{product.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600 text-sm">UGX {product.qualified_amount?.toLocaleString()}</p>
                          <p className="text-xs text-gray-400">{product.interest_rate?.toFixed(1)}%/mo</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex gap-2 text-xs text-gray-500">
                          <span>Up to {product.max_tenure_months} months</span>
                          {product.risk_bands_allowed && (
                            <span>· {product.risk_bands_allowed.join(', ')} bands</span>
                          )}
                        </div>
                        <Link to="/loans">
                          <Button size="sm" className="bg-[#f97316] text-white text-xs h-7 px-3">
                            Apply <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <Button variant="outline" className="w-full text-sm" onClick={handleCheck}>
              <TrendingUp className="w-4 h-4 mr-2" /> Refresh Pre-Qualification
            </Button>
          </>
        ) : (
          <div className="text-center py-16">
            <Button className="bg-[#f97316] text-white" onClick={handleCheck}>
              <Zap className="w-4 h-4 mr-2" /> Check My Eligibility
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}