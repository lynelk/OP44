import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Search, User, Building2, CheckCircle2, XCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

// Mask all but the last two digits for list/detail display (Uganda DPA / data minimisation).
function maskPhone(phone) {
  if (!phone) return '—';
  const s = String(phone);
  if (s.length <= 4) return s;
  return s.slice(0, 4).replace(/\d/g, (d, i) => (i < 1 ? d : '•')) + '••••••' + s.slice(-2);
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [phoneRevealed, setPhoneRevealed] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('adminManager', { action: 'list', entity: 'users' });
    setUsers(res.data?.users || []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.phone_number?.includes(search);
    const matchType = filterType === 'all' || (filterType === 'business' && u.business_profile) || (filterType === 'individual' && !u.business_profile);
    return matchSearch && matchType;
  });

  const handleSave = async () => {
    setSaving(true);
    await base44.functions.invoke('adminManager', { action: 'update', entity: 'users', id: selected.id, data: { role: selected.role, current_risk_band: selected.current_risk_band, admin_tier: selected.admin_tier || null } });
    setSaving(false);
    setSelected(null);
    loadUsers();
  };

  const riskColor = { A: 'bg-green-100 text-green-700', B: 'bg-blue-100 text-blue-700', C: 'bg-yellow-100 text-yellow-700', D: 'bg-red-100 text-red-700' };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3"><ChevronLeft className="w-4 h-4" /> Admin</Link>
        <h1 className="text-xl font-bold">User Management</h1>
        <p className="text-blue-200 text-xs">{users.length} total users</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input className="pl-9" placeholder="Search name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : filtered.map(u => (
          <Card key={u.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelected({...u}); setPhoneRevealed(false); }}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1a3a6b] flex items-center justify-center text-white font-bold text-sm">
                {u.full_name?.[0] || u.email?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{u.full_name || 'No name'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                {u.business_profile && <p className="text-xs text-blue-600 truncate">{u.business_profile.business_name}</p>}
              </div>
              <div className="text-right space-y-1">
                <Badge className={`text-xs ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{u.role}</Badge>
                {u.current_risk_band && <div className="mt-1"><Badge className={`text-xs ${riskColor[u.current_risk_band] || 'bg-gray-100'}`}>Band {u.current_risk_band}</Badge></div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl w-full p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{selected.full_name}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400">✕</button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
              <span>{selected.email}</span>
              <span>•</span>
              <span className="font-mono">{phoneRevealed ? selected.phone_number : maskPhone(selected.phone_number)}</span>
              {selected.phone_number && (
                <button
                  onClick={() => setPhoneRevealed(v => !v)}
                  className="inline-flex items-center gap-0.5 text-xs text-[#1a3a6b] font-medium"
                >
                  {phoneRevealed ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Reveal</>}
                </button>
              )}
            </div>
            {selected.business_profile && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="font-semibold text-blue-700 flex items-center gap-1"><Building2 className="w-4 h-4" /> {selected.business_profile.business_name}</p>
                <p className="text-blue-600 text-xs mt-1">{selected.business_profile.business_type} · {selected.business_profile.industry}</p>
                <p className="text-blue-600 text-xs">KYC: {selected.business_profile.kyc_status}</p>
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Role</label>
                <Select value={selected.role} onValueChange={v => setSelected(s => ({...s, role: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Back-office Tier <span className="font-normal text-gray-400">(optional)</span></label>
                <Select value={selected.admin_tier || 'none'} onValueChange={v => setSelected(s => ({...s, admin_tier: v === 'none' ? null : v}))}>
                  <SelectTrigger><SelectValue placeholder="No staff access" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No staff access</SelectItem>
                    <SelectItem value="reviewer">Reviewer (read-only)</SelectItem>
                    <SelectItem value="approver">Approver (status changes)</SelectItem>
                    <SelectItem value="ops">Ops (disbursement & collections)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400 mt-1">Grants scoped back-office access without full admin. Ignored if Role is Admin.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">Risk Band</label>
                <Select value={selected.current_risk_band || ''} onValueChange={v => setSelected(s => ({...s, current_risk_band: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select band" /></SelectTrigger>
                  <SelectContent>
                    {['A','B','C','D'].map(b => <SelectItem key={b} value={b}>Band {b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full bg-[#1a3a6b] text-white" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}