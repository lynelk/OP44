import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ChevronLeft, RefreshCw, Settings, TrendingUp, Users, Banknote, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STATUS_COLOR = {
  pending_approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  awaiting_funding: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  funded: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  closed: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  defaulted: 'bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200',
  written_off: 'bg-gray-300 text-gray-700',
};

export default function AdminP2P() {
  const [loans, setLoans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('loans');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    const [loansRes, profilesRes, revenueRes] = await Promise.all([
      base44.entities.P2PLoan.list('-created_date', 100),
      base44.entities.UserProfile.list('-created_date', 100),
      base44.entities.RevenueTransaction.list('-created_date', 50)
    ]);
    setLoans(loansRes || []);
    setProfiles(profilesRes || []);
    setRevenue(revenueRes || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateLoanStatus = async (loanId, status, extraData = {}) => {
    setProcessing(true);
    await base44.entities.P2PLoan.update(loanId, { status, admin_notes: adminNote, ...extraData });
    setProcessing(false);
    setSelectedLoan(null);
    setAdminNote('');
    load();
  };

  const listForFunding = async (loanId) => {
    await base44.entities.P2PLoan.update(loanId, {
      status: 'awaiting_funding',
      is_marketplace_listed: true
    });
    load();
  };

  const disburseLoan = async (loanId) => {
    setProcessing(true);
    await base44.functions.invoke('p2pEngine', { action: 'disburse_loan', loan_id: loanId, method: 'mobile_money' });
    setProcessing(false);
    load();
  };

  // Analytics
  const totalPortfolio = loans.filter(l => ['active', 'disbursed'].includes(l.status)).reduce((s, l) => s + (l.outstanding_balance || 0), 0);
  const totalRevenue = revenue.reduce((s, r) => s + (r.platform_share || 0), 0);
  const defaultRate = loans.length > 0 ? (loans.filter(l => l.status === 'defaulted').length / loans.length * 100).toFixed(1) : 0;
  const pendingApproval = loans.filter(l => l.status === 'pending_approval').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-10 font-sans">
      <div className="bg-gradient-to-br from-[#0f2a55] to-[#1e4480] text-white px-5 pt-12 pb-6">
        <Link to="/admin" className="flex items-center gap-1 text-blue-300 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Admin Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">P2P Lending Admin</h1>
          <button onClick={load} className="w-9 h-9 bg-white dark:bg-gray-800/10 rounded-full flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-blue-200" />
          </button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white dark:bg-gray-800/10 rounded-2xl p-3">
            <p className="text-blue-300 text-xs">Portfolio</p>
            <p className="font-black text-lg">UGX {(totalPortfolio / 1000000).toFixed(1)}M</p>
          </div>
          <div className="bg-white dark:bg-gray-800/10 rounded-2xl p-3">
            <p className="text-blue-300 text-xs">Platform Revenue</p>
            <p className="font-black text-lg">UGX {(totalRevenue / 1000).toFixed(0)}K</p>
          </div>
          <div className="bg-white dark:bg-gray-800/10 rounded-2xl p-3">
            <p className="text-blue-300 text-xs">Default Rate</p>
            <p className={`font-black text-lg ${parseFloat(defaultRate) > 5 ? 'text-red-300' : 'text-emerald-300'}`}>{defaultRate}%</p>
          </div>
          <div className="bg-white dark:bg-gray-800/10 rounded-2xl p-3 relative">
            <p className="text-blue-300 text-xs">Pending Approval</p>
            <p className="font-black text-lg text-amber-300">{pendingApproval}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        {[
          { id: 'loans', label: 'Loans' },
          { id: 'profiles', label: 'Profiles' },
          { id: 'revenue', label: 'Revenue' },
          { id: 'config', label: 'Config' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* LOANS TAB */}
        {activeTab === 'loans' && (
          <div className="space-y-2">
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl h-24 animate-pulse" />)}</div>
            ) : loans.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><Banknote className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No P2P loans yet</p></div>
            ) : (
              loans.map(loan => (
                <div key={loan.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{loan.loan_ref}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">UGX {loan.amount_requested?.toLocaleString()} · {loan.tenure_months}mo · Band {loan.risk_band}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLOR[loan.status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                      {loan.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {loan.status === 'pending_approval' && (
                      <>
                        <button onClick={() => listForFunding(loan.id)} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-semibold">
                          ✓ Approve & List
                        </button>
                        <button onClick={() => { setSelectedLoan(loan); }} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-semibold">
                          ✗ Reject
                        </button>
                      </>
                    )}
                    {loan.status === 'funded' && (
                      <button onClick={() => disburseLoan(loan.id)} disabled={processing} className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold">
                        💸 Disburse
                      </button>
                    )}
                    {loan.status === 'active' && (
                      <button onClick={() => { setSelectedLoan(loan); }} className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-semibold">
                        ⚠️ Flag / Default
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PROFILES TAB */}
        {activeTab === 'profiles' && (
          <div className="space-y-2">
            {profiles.map(p => (
              <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm capitalize">{p.account_type} · {p.district || 'N/A'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{p.employment_status} · UGX {p.monthly_income?.toLocaleString()}/mo</p>
                  <p className="text-xs text-gray-400 mt-0.5">KYC: {p.kyc_status} · Trust: {p.trust_score || 0}/100</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.account_status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : p.account_status === 'pending_verification' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                    {p.account_status?.replace(/_/g, ' ')}
                  </span>
                  <div className="flex gap-1 mt-2 justify-end">
                    {p.kyc_status !== 'verified' && (
                      <button
                        onClick={async () => {
                          await base44.entities.UserProfile.update(p.id, { kyc_status: 'verified', account_status: 'active', verified_at: new Date().toISOString() });
                          load();
                        }}
                        className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg"
                      >
                        Verify KYC
                      </button>
                    )}
                    {p.account_status === 'active' && (
                      <button
                        onClick={async () => {
                          await base44.entities.UserProfile.update(p.id, { account_status: 'suspended' });
                          load();
                        }}
                        className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {profiles.length === 0 && (
              <div className="text-center py-12 text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No P2P profiles yet</p></div>
            )}
          </div>
        )}

        {/* REVENUE TAB */}
        {activeTab === 'revenue' && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Lender Share</p>
                <p className="font-black text-emerald-600">UGX {(revenue.reduce((s, r) => s + (r.lender_share || 0), 0) / 1000).toFixed(0)}K</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Platform</p>
                <p className="font-black text-blue-600">UGX {(totalRevenue / 1000).toFixed(0)}K</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Reserve</p>
                <p className="font-black text-orange-600">UGX {(revenue.reduce((s, r) => s + (r.reserve_share || 0), 0) / 1000).toFixed(0)}K</p>
              </div>
            </div>
            {revenue.map(r => (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
                <div className="flex justify-between mb-1">
                  <p className="text-sm font-bold capitalize">{r.transaction_type?.replace(/_/g, ' ')}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'distributed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>{r.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>Lender: UGX {r.lender_share?.toLocaleString()}</span>
                  <span className="text-center">Platform: UGX {r.platform_share?.toLocaleString()}</span>
                  <span className="text-right">Reserve: UGX {r.reserve_share?.toLocaleString()}</span>
                </div>
              </div>
            ))}
            {revenue.length === 0 && (
              <div className="text-center py-12 text-gray-400"><TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No revenue transactions yet</p></div>
            )}
          </div>
        )}

        {/* CONFIG TAB */}
        {activeTab === 'config' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-4">
            <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Settings className="w-4 h-4" /> Revenue Split Configuration</p>
            <div className="space-y-3">
              {[
                { label: 'Lender Share %', key: 'lender_pct', default: '55', hint: 'Default 55%' },
                { label: 'Platform Share %', key: 'platform_pct', default: '30', hint: 'Default 30%' },
                { label: 'Reserve Fund %', key: 'reserve_pct', default: '15', hint: 'Default 15%' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">{field.label}</label>
                  <Input defaultValue={field.default} type="number" min="0" max="100" className="text-sm" />
                  <p className="text-xs text-gray-400 mt-0.5">{field.hint}</p>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-3">
              <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Shield className="w-4 h-4" /> Risk & Rate Config</p>
              {[
                { label: 'Base Rate (% monthly)', default: '3.5' },
                { label: 'Grace Period (days)', default: '3' },
                { label: 'Late Fee (%)', default: '2' },
                { label: 'Max Lender Exposure per Loan (%)', default: '40' },
                { label: 'Funding Threshold (%)', default: '80' },
              ].map((f, i) => (
                <div key={i}>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">{f.label}</label>
                  <Input defaultValue={f.default} type="number" className="text-sm" />
                </div>
              ))}
            </div>
            <Button className="w-full">Save Configuration</Button>
            <p className="text-xs text-gray-400 text-center">Config persistence via P2PConfig entity — wire save handler to activate.</p>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white dark:bg-gray-800 w-full rounded-t-3xl p-6 space-y-4">
            <h3 className="font-black text-lg">Admin Action: {selectedLoan.loan_ref}</h3>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Admin Notes</label>
              <Input value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Reason for action..." />
            </div>
            <div className="flex gap-3">
              {selectedLoan.status === 'pending_approval' && (
                <Button
                  onClick={() => updateLoanStatus(selectedLoan.id, 'pending_approval', { rejection_reason: adminNote })}
                  variant="destructive" className="flex-1"
                >
                  Reject Application
                </Button>
              )}
              {selectedLoan.status === 'active' && (
                <Button
                  onClick={() => updateLoanStatus(selectedLoan.id, 'defaulted')}
                  variant="destructive" className="flex-1"
                >
                  Mark as Default
                </Button>
              )}
              <Button variant="outline" onClick={() => setSelectedLoan(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}