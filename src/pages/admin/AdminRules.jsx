import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Plus, Settings, ToggleLeft, ToggleRight, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const RULE_TYPES = ['loan_validation','kyc_requirement','interest_rate','credit_limit','repayment_schedule','eligibility','data_submission','compliance'];
const MODULES = ['loans','savings','insurance','investments','kyc','crb','reporting'];

const DEFAULT_RULES = [
  { name: 'Minimum Loan Amount', rule_type: 'loan_validation', module: 'loans', description: 'Minimum loan amount is UGX 50,000', is_active: true, priority: 10 },
  { name: 'Maximum Loan to Income Ratio', rule_type: 'loan_validation', module: 'loans', description: 'Loan amount must not exceed 3x monthly income', is_active: true, priority: 9 },
  { name: 'KYC Required for Loan', rule_type: 'kyc_requirement', module: 'kyc', description: 'Full KYC verification required before loan disbursement', is_active: true, priority: 10 },
  { name: 'Band A Interest Rate', rule_type: 'interest_rate', module: 'loans', description: 'Risk Band A: 2% per month', is_active: true, priority: 8 },
  { name: 'Band D Interest Rate', rule_type: 'interest_rate', module: 'loans', description: 'Risk Band D: 5% per month', is_active: true, priority: 8 },
  { name: 'Monthly CRB Submission', rule_type: 'data_submission', module: 'crb', description: 'Submit credit data to CRB by 5th of every month', is_active: true, priority: 7 },
];

export default function AdminRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterModule, setFilterModule] = useState('all');

  const load = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('adminManager', { action: 'list', entity: 'business_rules' });
    const loaded = res.data?.rules || [];
    // Seed defaults if empty
    if (loaded.length === 0) {
      setRules(DEFAULT_RULES.map((r, i) => ({ ...r, id: `default-${i}`, _default: true })));
    } else {
      setRules(loaded);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    if (editing.id && !editing._default) {
      await base44.functions.invoke('adminManager', { action: 'update', entity: 'business_rules', id: editing.id, data: editing });
    } else {
      const { id, _default, ...data } = editing;
      await base44.functions.invoke('adminManager', { action: 'create', entity: 'business_rules', data });
    }
    setSaving(false);
    setEditing(null);
    load();
  };

  const handleToggle = async (rule) => {
    if (rule._default) return;
    await base44.functions.invoke('adminManager', { action: 'toggle', entity: 'business_rules', id: rule.id });
    load();
  };

  const handleDelete = async (rule) => {
    if (rule._default) return;
    await base44.functions.invoke('adminManager', { action: 'delete', entity: 'business_rules', id: rule.id });
    load();
  };

  const filtered = rules.filter(r => filterModule === 'all' || r.module === filterModule);

  const moduleColors = {
    loans: 'bg-blue-100 text-blue-700', savings: 'bg-green-100 text-green-700',
    insurance: 'bg-purple-100 text-purple-700', investments: 'bg-indigo-100 text-indigo-700',
    kyc: 'bg-yellow-100 text-yellow-700', crb: 'bg-red-100 text-red-700',
    reporting: 'bg-gray-100 text-gray-700'
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3"><ChevronLeft className="w-4 h-4" /> Admin</Link>
        <h1 className="text-xl font-bold">Business Rules</h1>
        <p className="text-blue-200 text-xs">Configure lending, KYC, and compliance rules</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <div className="flex gap-2">
          <Button className="flex-1 bg-[#f97316] text-white" onClick={() => setEditing({ rule_type: 'loan_validation', module: 'loans', is_active: true, priority: 5 })}>
            <Plus className="w-4 h-4" /> New Rule
          </Button>
          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.map((rule, i) => (
          <Card key={rule.id || i} className={`${!rule.is_active ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Settings className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="font-semibold text-gray-800 text-sm">{rule.name}</span>
                    {rule._default && <Badge className="bg-gray-100 text-gray-500 text-xs">Default</Badge>}
                  </div>
                  {rule.description && <p className="text-xs text-gray-500 mt-1 ml-6">{rule.description}</p>}
                  <div className="flex gap-2 mt-2 ml-6 flex-wrap">
                    <Badge className={`text-xs ${moduleColors[rule.module] || 'bg-gray-100 text-gray-600'}`}>{rule.module}</Badge>
                    <Badge className="bg-orange-100 text-orange-700 text-xs">{rule.rule_type?.replace(/_/g,' ')}</Badge>
                    {rule.priority > 0 && <Badge className="bg-slate-100 text-slate-600 text-xs">P{rule.priority}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!rule._default && (
                    <>
                      <button onClick={() => handleToggle(rule)}>
                        {rule.is_active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                      </button>
                      <button onClick={() => setEditing({...rule})} className="text-blue-500"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(rule)} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                  {rule._default && (
                    <button onClick={() => setEditing({...rule})} className="text-blue-500 text-xs underline">Customise</button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white rounded-t-2xl w-full p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{editing.id && !editing._default ? 'Edit Rule' : 'New Business Rule'}</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400">✕</button>
            </div>
            <Input placeholder="Rule Name" value={editing.name || ''} onChange={e => setEditing(s => ({...s, name: e.target.value}))} />
            <Input placeholder="Description" value={editing.description || ''} onChange={e => setEditing(s => ({...s, description: e.target.value}))} />
            <Select value={editing.rule_type} onValueChange={v => setEditing(s => ({...s, rule_type: v}))}>
              <SelectTrigger><SelectValue placeholder="Rule Type" /></SelectTrigger>
              <SelectContent>{RULE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={editing.module} onValueChange={v => setEditing(s => ({...s, module: v}))}>
              <SelectTrigger><SelectValue placeholder="Module" /></SelectTrigger>
              <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" placeholder="Priority (higher = first)" value={editing.priority || ''} onChange={e => setEditing(s => ({...s, priority: parseInt(e.target.value)}))} />
            <Button className="w-full bg-[#1a3a6b] text-white" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Rule'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}