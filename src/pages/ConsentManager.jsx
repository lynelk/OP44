import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, XCircle, ChevronRight, Info } from 'lucide-react';
import ConsentItem from '@/components/consent/ConsentItem';

const CONSENT_DEFINITIONS = [
  {
    type: 'terms_and_conditions',
    label: 'Terms & Conditions',
    description: 'You agree to the general terms governing use of OpFin services.',
    version: 'v1.0',
    required: true,
  },
  {
    type: 'privacy_policy',
    label: 'Privacy Policy',
    description: 'You agree to how we collect, store, and use your personal data.',
    version: 'v1.0',
    required: true,
  },
  {
    type: 'data_processing',
    label: 'Data Processing',
    description: 'You consent to processing your financial data to provide OpFin services.',
    version: 'v1.0',
    required: true,
  },
  {
    type: 'credit_bureau_check',
    label: 'Credit Bureau Check',
    description: 'You authorise OpFin to query credit reference bureaus when assessing loan applications.',
    version: 'v1.0',
    required: false,
  },
  {
    type: 'kyc_data_retention',
    label: 'KYC Data Retention',
    description: 'You consent to retaining your identity documents for regulatory compliance purposes.',
    version: 'v1.0',
    required: true,
  },
  {
    type: 'third_party_data_sharing',
    label: 'Third-Party Data Sharing',
    description: 'You allow sharing of anonymised data with trusted financial partners to improve services.',
    version: 'v1.0',
    required: false,
  },
  {
    type: 'marketing_communications',
    label: 'Marketing Communications',
    description: 'You agree to receive product updates, offers, and financial tips from OpFin.',
    version: 'v1.0',
    required: false,
  },
  {
    type: 'investment_risk_disclosure',
    label: 'Investment Risk Disclosure',
    description: 'You acknowledge that P2P investments carry risk and returns are not guaranteed.',
    version: 'v1.0',
    required: false,
  },
];

export default function ConsentManager() {
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);
    const records = await base44.entities.UserConsent.filter({ user_id: me.id });
    setConsents(records);
    setLoading(false);
  };

  const getConsentRecord = (type) =>
    consents.find(c => c.consent_type === type);

  const handleToggle = async (consentDef, grant) => {
    setSaving(consentDef.type);
    const existing = getConsentRecord(consentDef.type);
    const now = new Date().toISOString();

    if (existing) {
      await base44.entities.UserConsent.update(existing.id, {
        granted: grant,
        granted_at: grant ? now : existing.granted_at,
        withdrawn_at: !grant ? now : null,
      });
    } else {
      await base44.entities.UserConsent.create({
        user_id: user.id,
        consent_type: consentDef.type,
        version: consentDef.version,
        granted: grant,
        granted_at: grant ? now : null,
        channel: 'app',
      });
    }

    await loadData();
    setSaving(null);
  };

  const grantedCount = CONSENT_DEFINITIONS.filter(d => getConsentRecord(d.type)?.granted).length;
  const requiredMissing = CONSENT_DEFINITIONS.filter(d => d.required && !getConsentRecord(d.type)?.granted);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-slate-900 text-white px-5 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold">Data & Consent</h1>
        </div>
        <p className="text-slate-400 text-sm">Control how your data is used</p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-400">Consents Granted</p>
            <p className="text-lg font-bold">{grantedCount} / {CONSENT_DEFINITIONS.length}</p>
          </div>
          <div className={`rounded-xl p-3 ${requiredMissing.length > 0 ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
            <p className="text-xs text-slate-400">Required Pending</p>
            <p className={`text-lg font-bold ${requiredMissing.length > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
              {requiredMissing.length}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {requiredMissing.length > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>{requiredMissing.length} required consent(s)</strong> are pending. Some features may be restricted until these are accepted.
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Required</p>
            {CONSENT_DEFINITIONS.filter(d => d.required).map(def => (
              <ConsentItem
                key={def.type}
                def={def}
                record={getConsentRecord(def.type)}
                saving={saving === def.type}
                onToggle={handleToggle}
              />
            ))}

            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide pt-2">Optional</p>
            {CONSENT_DEFINITIONS.filter(d => !d.required).map(def => (
              <ConsentItem
                key={def.type}
                def={def}
                record={getConsentRecord(def.type)}
                saving={saving === def.type}
                onToggle={handleToggle}
              />
            ))}

            <div className="bg-slate-100 rounded-xl p-4 text-xs text-slate-500 mt-2">
              <p className="font-semibold text-slate-700 mb-1">Your Rights</p>
              <p>You may withdraw optional consents at any time. Required consents are necessary to use core OpFin services. All consent changes are logged with a timestamp for your records.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}