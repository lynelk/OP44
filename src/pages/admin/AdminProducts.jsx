import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Plus, Shield, TrendingUp, Pencil, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const TABS = ['Insurance', 'Investments'];

export default function AdminProducts() {
  const [tab, setTab] = useState('Insurance');
  const [insuranceProducts, setInsuranceProducts] = useState([]);
  const [investPools, setInvestPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [ins, inv] = await Promise.all([
      base44.functions.invoke('adminManager', { action: 'list', entity: 'insurance_products' }),
      base44.functions.invoke('adminManager', { action: 'list', entity: 'investment_pools' }),
    ]);
    setInsuranceProducts(ins.data?.products || []);
    setInvestPools(inv.data?.pools || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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

  const statusColor = { active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-500', coming_soon: 'bg-yellow-100 text-yellow-700' };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3"><ChevronLeft className="w-4 h-4" /> Admin</Link>
        <h1 className="text-xl font-bold">Products & Services</h1>
      </div>

      <div className="flex border-b bg-white sticky top-0 z-10">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-sm font-medium ${tab === t ? 'border-b-2 border-[#1a3a6b] text-[#1a3a6b]' : 'text-gray-500'}`}>{t}</button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-3">
        <Button className="w-full bg-[#f97316] text-white" onClick={() => setEditing({ status: 'active', category: 'life', premium_frequency: 'monthly' })}>
          <Plus className="w-4 h-4" /> Add {tab === 'Insurance' ? 'Insurance Product' : 'Investment Pool'}
        </Button>

        {loading ? (
          <div className="text-center py-10"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
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
                  <button onClick={() => setEditing({...p})} className="text-blue-600"><Pencil className="w-4 h-4" /></button>
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
                  <button onClick={() => setEditing({...p})} className="text-blue-600"><Pencil className="w-4 h-4" /></button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl w-full p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{editing.id ? 'Edit' : 'New'} {tab === 'Insurance' ? 'Insurance Product' : 'Investment Pool'}</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400">✕</button>
            </div>
            {tab === 'Insurance' ? (
              <>
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
              </>
            ) : (
              <>
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
              </>
            )}
            <Button className="w-full bg-[#1a3a6b] text-white" onClick={tab === 'Insurance' ? handleSaveInsurance : handleSavePool} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}