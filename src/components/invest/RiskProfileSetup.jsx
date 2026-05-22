import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Shield, TrendingUp, Zap, Check } from 'lucide-react';

const RISK_OPTIONS = [
  {
    id: 'conservative',
    label: 'Conservative',
    subtitle: '8–10% annual return',
    icon: Shield,
    color: 'border-emerald-500 bg-emerald-50',
    iconColor: 'text-emerald-600',
    allocation: 'Bonds 50% · Money Market 30% · P2P 15% · SACCO 5%',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    subtitle: '12–16% annual return',
    icon: TrendingUp,
    color: 'border-blue-500 bg-blue-50',
    iconColor: 'text-blue-600',
    allocation: 'Bonds 25% · Money Market 25% · P2P 35% · SACCO 15%',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    subtitle: '18–24% annual return',
    icon: Zap,
    color: 'border-orange-500 bg-orange-50',
    iconColor: 'text-orange-600',
    allocation: 'Bonds 10% · Money Market 10% · P2P 60% · SACCO 20%',
  },
];

export default function RiskProfileSetup({ existing, onSaved }) {
  const [selected, setSelected] = useState(existing?.risk_level || 'moderate');
  const [surplus, setSurplus] = useState(existing?.monthly_surplus?.toString() || '');
  const [pct, setPct] = useState(existing?.auto_invest_percentage?.toString() || '20');
  const [autoInvest, setAutoInvest] = useState(existing?.auto_invest_enabled || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const res = await base44.functions.invoke('portfolioAllocator', {
      action: 'save_profile',
      risk_level: selected,
      auto_invest_enabled: autoInvest,
      auto_invest_percentage: parseFloat(pct) || 20,
      monthly_surplus: parseFloat(surplus) || 0,
    });
    setSaving(false);
    if (onSaved) onSaved(res.data?.profile);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-gray-800 mb-1 text-sm">Choose your risk appetite</p>
        <div className="space-y-2">
          {RISK_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = selected === opt.id;
            return (
              <button key={opt.id} onClick={() => setSelected(opt.id)}
                className={`w-full border-2 rounded-xl p-3 text-left transition-all ${active ? opt.color : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${active ? 'bg-white' : 'bg-gray-100'}`}>
                    <Icon className={`w-5 h-5 ${active ? opt.iconColor : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{opt.label}</p>
                      {active && <Check className="w-4 h-4 text-green-600" />}
                    </div>
                    <p className="text-xs text-gray-500">{opt.subtitle}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.allocation}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">Monthly surplus (UGX)</p>
        <Input type="number" placeholder="e.g. 200,000" value={surplus} onChange={e => setSurplus(e.target.value)} />
        <p className="text-xs text-gray-400 mt-1">Your income after expenses and savings goals</p>
      </div>

      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
        <div className="flex-1">
          <p className="text-sm font-medium">Auto-invest surplus</p>
          <p className="text-xs text-gray-400">Automatically invest {pct}% of your monthly surplus</p>
        </div>
        <button onClick={() => setAutoInvest(v => !v)}
          className={`w-12 h-6 rounded-full transition-colors ${autoInvest ? 'bg-[#1a3a6b]' : 'bg-gray-300'}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${autoInvest ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {autoInvest && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Invest what % of surplus?</p>
          <div className="flex items-center gap-3">
            <input type="range" min="5" max="80" step="5" value={pct} onChange={e => setPct(e.target.value)} className="flex-1" />
            <span className="font-bold text-[#1a3a6b] w-12 text-right">{pct}%</span>
          </div>
          {surplus && <p className="text-xs text-green-600 mt-1">≈ UGX {((parseFloat(surplus) * parseFloat(pct)) / 100).toLocaleString()} / month will be auto-invested</p>}
        </div>
      )}

      <Button className="w-full bg-[#1a3a6b] text-white" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving profile...' : 'Save Risk Profile'}
      </Button>
    </div>
  );
}