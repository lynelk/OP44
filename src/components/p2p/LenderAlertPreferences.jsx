import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, BellOff, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BANDS = ['A', 'B', 'C', 'D'];
const BAND_META = {
  A: { label: 'Band A', desc: '8–12%/yr · Lowest risk', color: 'bg-emerald-100 border-emerald-400 text-emerald-800' },
  B: { label: 'Band B', desc: '14–18%/yr · Low-medium', color: 'bg-blue-100 border-blue-400 text-blue-800' },
  C: { label: 'Band C', desc: '20–26%/yr · Medium', color: 'bg-amber-100 border-amber-400 text-amber-700' },
  D: { label: 'Band D', desc: '28–35%/yr · Higher risk', color: 'bg-red-100 border-red-400 text-red-700' },
};

const PURPOSES = [
  { value: 'business', label: '🏪 Business' },
  { value: 'education', label: '📚 Education' },
  { value: 'medical', label: '🏥 Medical' },
  { value: 'agriculture', label: '🌾 Agriculture' },
  { value: 'housing', label: '🏠 Housing' },
  { value: 'personal', label: '👤 Personal' },
];

export default function LenderAlertPreferences({ profile, onSaved }) {
  const [bands, setBands] = useState(profile?.preferred_risk_bands || []);
  const [purposes, setPurposes] = useState(profile?.lender_notify_purpose_categories || []);
  const [notifyInApp, setNotifyInApp] = useState(profile?.lender_notify_in_app !== false);
  const [minInvest, setMinInvest] = useState(profile?.lender_min_investment || '');
  const [maxInvest, setMaxInvest] = useState(profile?.lender_max_investment || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleBand = (b) => setBands(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  const togglePurpose = (p) => setPurposes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await base44.entities.UserProfile.update(profile.id, {
      preferred_risk_bands: bands,
      lender_notify_purpose_categories: purposes,
      lender_notify_in_app: notifyInApp,
      lender_min_investment: minInvest ? parseFloat(minInvest) : null,
      lender_max_investment: maxInvest ? parseFloat(maxInvest) : null,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    if (onSaved) onSaved();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-900">Loan Alert Preferences</p>
          <p className="text-xs text-gray-500 mt-0.5">Get notified when matching loans are listed</p>
        </div>
        <button
          onClick={() => setNotifyInApp(!notifyInApp)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all border ${notifyInApp ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-100 border-gray-300 text-gray-500'}`}
        >
          {notifyInApp ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          {notifyInApp ? 'Alerts On' : 'Alerts Off'}
        </button>
      </div>

      {/* Risk Band Selection */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Preferred Risk Bands</p>
        <p className="text-xs text-gray-400 mb-2">Leave all unselected to receive alerts for any band</p>
        <div className="grid grid-cols-2 gap-2">
          {BANDS.map(b => {
            const meta = BAND_META[b];
            const selected = bands.includes(b);
            return (
              <button
                key={b}
                onClick={() => toggleBand(b)}
                className={`rounded-xl p-3 border-2 text-left transition-all ${selected ? meta.color + ' border-2' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
              >
                <p className="font-bold text-sm">{meta.label}</p>
                <p className="text-xs mt-0.5 opacity-80">{meta.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loan Purpose Filter */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Loan Purpose (optional)</p>
        <div className="flex flex-wrap gap-2">
          {PURPOSES.map(p => (
            <button
              key={p.value}
              onClick={() => togglePurpose(p.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${purposes.includes(p.value) ? 'bg-[#006B3C] text-white border-[#006B3C]' : 'bg-gray-100 text-gray-600 border-gray-200'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount Range */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Loan Amount Range (UGX, optional)</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Min Amount</label>
            <input
              type="number"
              value={minInvest}
              onChange={e => setMinInvest(e.target.value)}
              placeholder="e.g. 100000"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#006B3C]/30"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Max Amount</label>
            <input
              type="number"
              value={maxInvest}
              onChange={e => setMaxInvest(e.target.value)}
              placeholder="e.g. 5000000"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#006B3C]/30"
            />
          </div>
        </div>
      </div>

      {/* Deep-link note */}
      <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
        <p className="font-semibold mb-0.5">⚡ One-Click Invest</p>
        <p className="opacity-80">Each alert includes a direct link that takes you straight to the loan funding page — no searching required.</p>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#006B3C] hover:bg-[#005530] h-11 font-bold gap-2"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> :
          saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : 'Save Alert Preferences'}
      </Button>
    </div>
  );
}