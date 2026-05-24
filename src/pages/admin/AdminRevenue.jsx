import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ChevronLeft, Download, TrendingUp, Wallet, CreditCard, Users, Filter, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PRODUCT_COLORS = {
  rental: '#006B3C',
  loan: '#1a3a6b',
  p2p_loan: '#F4B400',
  insurance: '#7BC943',
  savings: '#06b6d4',
  other: '#6b7280',
};

const REVENUE_TYPES = {
  rental_fee: 'Rental Fees',
  loan_disbursement_fee: 'Loan Fees',
  p2p_investment_fee: 'P2P Fees',
  insurance_premium: 'Insurance',
  sms_fee: 'SMS Fees',
  whatsapp_fee: 'WhatsApp Fees',
  crb_fee: 'CRB Fees',
  validation_fee: 'Validation',
  transaction_fee: 'Transaction Fees',
  partner_fee: 'Partner Fees',
  other: 'Other',
};

export default function AdminRevenue() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [productType, setProductType] = useState('all');
  const [partnerId, setPartnerId] = useState('all');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    const users = await base44.asServiceRole.entities.User.filter({});
    const lenders = users.filter(u => u.role === 'user'); // Simplified - in reality check UserProfile
    setPartners(lenders);
  };

  const generateReport = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('revenueManager', {
      action: 'generate_report',
      date_from: dateFrom,
      date_to: dateTo,
      product_type: productType === 'all' ? undefined : productType,
      partner_id: partnerId === 'all' ? undefined : partnerId,
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
    a.download = `revenue_report_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const revenueByTypeData = reportData?.revenue_by_type ? 
    Object.entries(reportData.revenue_by_type).map(([key, value]) => ({
      name: REVENUE_TYPES[key] || key,
      value,
    })) : [];

  const revenueByProductData = reportData?.records ? 
    Object.entries(reportData.records.reduce((acc, r) => {
      acc[r.product_type] = (acc[r.product_type] || 0) + (r.amount || 0);
      return acc;
    }, {})).map(([key, value]) => ({
      name: key.replace('_', ' ').toUpperCase(),
      value,
    })) : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Admin
        </Link>
        <h1 className="text-xl font-bold">Revenue Tracking</h1>
        <p className="text-blue-200 text-xs mt-0.5">Track income lines, expenses & partner portfolios</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">From</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">To</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Product Type</label>
                <Select value={productType} onValueChange={setProductType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    <SelectItem value="rental">Rental</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="p2p_loan">P2P Loan</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Partner</label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Partners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Partners</SelectItem>
                    {partners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full bg-[#1a3a6b] text-white" onClick={generateReport} disabled={loading}>
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Generating...</> : 'Generate Report'}
            </Button>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {reportData && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-gray-400">Total Revenue</p>
                  <p className="text-lg font-bold text-[#006B3C]">UGX {(reportData.summary?.total_revenue || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-gray-400">Total Expenses</p>
                  <p className="text-lg font-bold text-orange-600">UGX {(reportData.summary?.total_expenses || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-gray-400">Net Revenue</p>
                  <p className="text-lg font-bold text-[#1a3a6b]">UGX {(reportData.summary?.net_revenue || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3">Revenue by Type</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={revenueByTypeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {revenueByTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={Object.values(PRODUCT_COLORS)[index % Object.values(PRODUCT_COLORS).length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3">Revenue by Product</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={revenueByProductData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#006B3C" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Partner Breakdown */}
            {reportData.partner_breakdown && reportData.partner_breakdown.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3">Partner Performance</p>
                  <div className="space-y-2">
                    {reportData.partner_breakdown.slice(0, 10).map((partner, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{partner.partner_id}</p>
                          <p className="text-xs text-gray-400">Revenue: UGX {partner.revenue.toLocaleString()} | Net: UGX {partner.net.toLocaleString()}</p>
                        </div>
                        <Link to={`/admin/revenue?partner=${partner.partner_id}`}>
                          <Button variant="outline" size="sm" className="text-xs">View Details</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Export */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={downloadCSV}>
                    <Download className="w-4 h-4 mr-2" /> Download CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}