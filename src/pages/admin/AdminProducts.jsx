import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Plus, Shield, TrendingUp, Banknote, Pencil, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const TABS = ['Loans', 'Insurance', 'Investments'];

const DEMOGRAPHICS = ['women', 'youth', 'employed', 'self_employed', 'business_owner', 'student', 'all'];
const CRB_RATINGS   = ['AAA','AA+','AA','A+','A','BBB+','BBB','BB+','BB','B+','B','CCC','CC','C','D'];
const RISK_BANDS    = ['A','B','C','D'];

const statusColor = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  coming_soon: 'bg-yellow-100 text-yellow-700',
};

// ── Multi-select toggle chip ──────────────────────────────────────────────────
function ChipSelect({ label, options, selected = [], onChange }) {
  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              selected.includes(opt)
                ? 'bg-[#1a3a6b] text-white border-[#1a3a6b]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a3a6b]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Loan Product Form Modal ───────────────────────────────────────────────────
function LoanProductModal({ editing, setEditing, onSave, saving }) {
  const e = editing;
  const set = (field, val) => setEditing(s => ({ ...s, [field]: val }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-2xl w-full p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">{e.id ? 'Edit' : 'New'} Loan Product</h3>
          <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Basic Info */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Basic Info</p>
          <Input placeholder="Product Name *" value={e.name || ''} onChange={ev => set('name', ev.target.value)} />
          <Input placeholder="Description" value={e.description || ''} onChange={ev => set('description', ev.target.value)} />
          <Input placeholder="Icon emoji (e.g. 💰)" value={e.icon || ''} onChange={ev => set('icon', ev.target.value)} />
          <div className="flex gap-2">
            <Select value={e.status || 'active'} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 px-3 py-2 border rounded-md text-sm cursor-pointer flex-1 justify-center">
              <input type="checkbox" checked={!!e.popular} onChange={ev => set('popular', ev.target.checked)} />
              Popular
            </label>
          </div>
        </div>

        {/* Amounts & Rates */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Amounts & Rates</p>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Min Amount (UGX)" value={e.min_amount || ''} onChange={ev => set('min_amount', parseFloat(ev.target.value))} />
            <Input type="number" placeholder="Max Amount (UGX)" value={e.max_amount || ''} onChange={ev => set('max_amount', parseFloat(ev.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Rate Min (% / month)" value={e.interest_rate_min || ''} onChange={ev => set('interest_rate_min', parseFloat(ev.target.value))} />
            <Input type="number" placeholder="Rate Max (% / month)" value={e.interest_rate_max || ''} onChange={ev => set('interest_rate_max', parseFloat(ev.target.value))} />
          </div>
          <Input type="number" placeholder="Max Tenure (months)" value={e.max_tenure_months || ''} onChange={ev => set('max_tenure_months', parseFloat(ev.target.value))} />
        </div>

        {/* Financial Eligibility */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Financial Eligibility</p>
          <Input type="number" placeholder="Min Credit Score (300–850)" value={e.min_credit_score || ''} onChange={ev => set('min_credit_score', parseFloat(ev.target.value))} />
          <ChipSelect
            label="Allowed Risk Bands"
            options={RISK_BANDS}
            selected={e.risk_bands_allowed || []}
            onChange={v => set('risk_bands_allowed', v)}
          />
          <ChipSelect
            label="Required CRB Rating(s) — leave empty to allow any"
            options={CRB_RATINGS}
            selected={e.required_crb_rating || []}
            onChange={v => set('required_crb_rating', v)}
          />
        </div>

        {/* Demographic Targeting */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Demographic Targeting</p>
          <ChipSelect
            label="Target Groups — select 'all' for no restriction"
            options={DEMOGRAPHICS}
            selected={e.target_demographics || []}
            onChange={v => set('target_demographics', v)}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Min Age" value={e.min_age || ''} onChange={ev => set('min_age', parseInt(ev.target.value))} />
            <Input type="number" placeholder="Max Age" value={e.max_age || ''} onChange={ev => set('max_age', parseInt(ev.target.value))} />
          </div>
          <Input
            placeholder="Eligibility note (shown to users)"
            value={e.eligibility_criteria || ''}
            onChange={ev => set('eligibility_criteria', ev.target.value)}
          />
        </div>

        {/* Auto-Approval */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Auto-Approval Rules</p>
          <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={!!e.auto_approve_eligible}
              onChange={ev => set('auto_approve_eligible', ev.target.checked)}
            />
            <div>
              <p className="text-sm font-medium text-gray-800">Enable Auto-Approval</p>
              <p className="text-xs text-gray-500">Qualifying applications skip admin review and disburse instantly</p>
            </div>
            {e.auto_approve_eligible && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto flex-shrink-0" />}
          </label>
          {e.auto_approve_eligible && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Max Auto-Approve Amount"
                value={e.auto_approve_max_amount || ''}
                onChange={ev => set('auto_approve_max_amount', parseFloat(ev.target.value))}
              />
              <Input
                type="number"
                placeholder="Max Tenure (months)"
                value={e.auto_approve_max_tenure_months || ''}
                onChange={ev => set('auto_approve_max_tenure_months', parseFloat(ev.target.value))}
              />
            </div>
          )}
        </div>

        <Button className="w-full bg-[#1a3a6b] text-white" onClick={onSave} disabled={saving || !e.name}>
          {saving ? 'Saving...' : 'Save Product'}
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminProducts() {
  const [tab, setTab] = useState('Loans');
  const [loanProducts, setLoanProducts] = useState([]);
  const [insuranceProducts, setInsuranceProducts] = useState([]);
  const [investPools, setInvestPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [loans, ins, inv] = await Promise.all([
      base44.functions.invoke('adminManager', { action: 'list', entity: 'loan_products' }),
      base44.functions.invoke('adminManager', { action: 'list', entity: 'insurance_products' }),
      base44.functions.invoke('adminManager', { action: 'list', entity: 'investment_pools' }),
    ]);
    setLoanProducts(loans.data?.products || []);
    setInsuranceProducts(ins.data?.products || []);
    setInvestPools(inv.data?.pools || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── Loan product save ──────────────────────────────────────────────────────
  const handleSaveLoan = async () => {
    setSaving(true);
    if (editing.id) {
      await base44.functions.invoke('adminManager', { action: 'update', entity: 'loan_products', id: editing.id, data: editing });
    } else {
      await base44.functions.invoke('adminManager', { action: 'create', entity: 'loan_products', data: editing });
    }
    setSaving(false);
    setEditing(null);
    load();
  };

  const handleSaveInsurance = async () => {
    setSaving(true);
    if (editing.id) {
      await base44.functions.invoke('adminManager', { action: 'update', entity: 'insurance_products', id: editing.id, data: editing });
    } else {
      await base44.functions.invoke('adminManager', { action: 'create', entity: 'insurance_products', data: editing });
    }
    setSaving(false);
    setEditing(null);
    load();
  };

  const handleSavePool = async () => {
    setSaving(true);
    if (editing.id) {
      await base44.functions.invoke('adminManager', { action: 'update', entity: 'investment_pools', id: editing.id, data: editing });
    } else {
      await base44.functions.invoke('adminManager', { action: 'create', entity: 'investment_pools', data: editing });
    }
    setSaving(false);
    setEditing(null);
    load();
  };

  const handleSave = tab === 'Loans' ? handleSaveLoan : tab === 'Insurance' ? handleSaveInsurance : handleSavePool;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Admin
        </Link>
        <h1 className="text-xl font-bold">Products & Services</h1>
      </div>

      <div className="flex border-b bg-white sticky top-0 z-10">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium ${tab === t ? 'border-b-2 border-[#1a3a6b] text-[#1a3a6b]' : 'text-gray-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-3">
        <Button
          className="w-full bg-[#f97316] text-white"
          onClick={() => {
            if (tab === 'Loans') setEditing({ status: 'active', risk_bands_allowed: [], target_demographics: [], required_crb_rating: [] });
            else if (tab === 'Insurance') setEditing({ status: 'active', category: 'life', premium_frequency: 'monthly' });
            else setEditing({ status: 'open_for_funding' });
          }}
        >
          <Plus className="w-4 h-4" /> Add {tab === 'Loans' ? 'Loan Product' : tab === 'Insurance' ? 'Insurance Product' : 'Investment Pool'}
        </Button>

        {loading ? (
          <div className="text-center py-10"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
        ) : tab === 'Loans' ? (
          loanProducts.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{p.icon || '💰'}</span>
                    <div>
                      <p className="font-semibold text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={statusColor[p.status] || 'bg-gray-100'}>{p.status}</Badge>
                    {p.auto_approve_eligible && <Badge className="bg-emerald-100 text-emerald-700 text-xs">⚡ Auto</Badge>}
                    <button onClick={() => setEditing({ ...p })} className="text-blue-600 mt-1">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    UGX {(p.min_amount/1000).toFixed(0)}K–{p.max_amount >= 1000000 ? `${(p.max_amount/1000000).toFixed(1)}M` : `${(p.max_amount/1000).toFixed(0)}K`}
                  </span>
                  <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                    {p.interest_rate_min}–{p.interest_rate_max}%/mo
                  </span>
                  {(p.risk_bands_allowed || []).map(b => (
                    <span key={b} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Band {b}</span>
                  ))}
                  {(p.target_demographics || []).map(d => (
                    <span key={d} className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{d}</span>
                  ))}
                  {(p.required_crb_rating || []).length > 0 && (
                    <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                      CRB: {p.required_crb_rating.join(', ')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : tab === 'Insurance' ? (
          insuranceProducts.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <p className="font-semibold text-gray-800">{p.name}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{p.provider} · {p.category}</p>
                  <p className="text-xs text-gray-600 mt-1">Premium: UGX {p.premium_amount?.toLocaleString()} / {p.premium_frequency}</p>
                  <p className="text-xs text-gray-600">Coverage: UGX {p.coverage_amount?.toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={statusColor[p.status] || 'bg-gray-100'}>{p.status}</Badge>
                  <button onClick={() => setEditing({ ...p })} className="text-blue-600"><Pencil className="w-4 h-4" /></button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          investPools.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <p className="font-semibold text-gray-800">{p.pool_name}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{p.risk_level} risk · {p.interest_rate_offered}% p.a.</p>
                  <p className="text-xs text-gray-600">Target: UGX {p.target_amount?.toLocaleString()}</p>
                  <p className="text-xs text-gray-600">Raised: UGX {p.current_amount_raised?.toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className="bg-blue-100 text-blue-700">{p.status?.replace(/_/g, ' ')}</Badge>
                  <button onClick={() => setEditing({ ...p })} className="text-blue-600"><Pencil className="w-4 h-4" /></button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modals */}
      {editing && tab === 'Loans' && (
        <LoanProductModal editing={editing} setEditing={setEditing} onSave={handleSaveLoan} saving={saving} />
      )}
      {editing && tab === 'Insurance' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl w-full p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{editing.id ? 'Edit' : 'New'} Insurance Product</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400">✕</button>
            </div>
            <Input placeholder="Product Name" value={editing.name || ''} onChange={e => setEditing(s => ({...s, name: e.target.value}))} />
            <Input placeholder="Provider" value={editing.provider || ''} onChange={e => setEditing(s => ({...s, provider: e.target.value}))} />
            <Select value={editing.category} onValueChange={v => setEditing(s => ({...s, category: v}))}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {['life','health','loan_protection','crop_agriculture','asset','device','car'].map(c => <SelectItem key={c} value={c}>{c.replace(/_/g,' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Premium Amount (UGX)" value={editing.premium_amount || ''} onChange={e => setEditing(s => ({...s, premium_amount: parseFloat(e.target.value)}))} />
            <Input type="number" placeholder="Coverage Amount (UGX)" value={editing.coverage_amount || ''} onChange={e => setEditing(s => ({...s, coverage_amount: parseFloat(e.target.value)}))} />
            <Select value={editing.status} onValueChange={v => setEditing(s => ({...s, status: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="coming_soon">Coming Soon</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full bg-[#1a3a6b] text-white" onClick={handleSaveInsurance} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
      {editing && tab === 'Investments' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl w-full p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{editing.id ? 'Edit' : 'New'} Investment Pool</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400">✕</button>
            </div>
            <Input placeholder="Pool Name" value={editing.pool_name || ''} onChange={e => setEditing(s => ({...s, pool_name: e.target.value}))} />
            <Input type="number" placeholder="Target Amount (UGX)" value={editing.target_amount || ''} onChange={e => setEditing(s => ({...s, target_amount: parseFloat(e.target.value)}))} />
            <Input type="number" placeholder="Interest Rate (% p.a.)" value={editing.interest_rate_offered || ''} onChange={e => setEditing(s => ({...s, interest_rate_offered: parseFloat(e.target.value)}))} />
            <Input type="number" placeholder="Min Investment (UGX)" value={editing.min_investment_per_investor || ''} onChange={e => setEditing(s => ({...s, min_investment_per_investor: parseFloat(e.target.value)}))} />
            <Select value={editing.status} onValueChange={v => setEditing(s => ({...s, status: v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['open_for_funding','funding_closed','active_lending','completed','closed'].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g,' ')}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="w-full bg-[#1a3a6b] text-white" onClick={handleSavePool} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}