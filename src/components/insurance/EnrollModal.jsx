import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Shield, X, ExternalLink, CheckCircle } from 'lucide-react';

const CATEGORY_NEEDS_ASSET = ['device', 'car', 'asset'];

export default function EnrollModal({ product, user, onClose, onSuccess }) {
  const [step, setStep] = useState('form'); // form | success
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    beneficiary_name: '',
    beneficiary_relationship: '',
    beneficiary_phone: '',
    asset_description: '',
    asset_value: '',
  });

  const needsAsset = CATEGORY_NEEDS_ASSET.includes(product.category);

  const handleExternalLink = () => {
    window.open(product.external_url, '_blank');
    onClose();
  };

  const handleSubmit = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (product.duration_months || 12));

    await base44.entities.InsurancePolicy.create({
      user_id: user.id,
      product_id: product.id,
      status: product.enrollment_type === 'instant' ? 'active' : 'pending_review',
      coverage_amount: product.coverage_amount,
      premium_amount: product.premium_amount,
      premium_frequency: product.premium_frequency,
      start_date: today,
      end_date: endDate.toISOString().split('T')[0],
      beneficiary_name: form.beneficiary_name,
      beneficiary_relationship: form.beneficiary_relationship,
      beneficiary_phone: form.beneficiary_phone,
      asset_description: needsAsset ? form.asset_description : null,
      asset_value: needsAsset && form.asset_value ? parseFloat(form.asset_value) : null,
      total_premiums_paid: 0,
    });

    setLoading(false);
    setStep('success');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-700" />
            <h2 className="font-semibold text-slate-800">{product.name}</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {step === 'success' ? (
          <div className="p-6 text-center">
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              {product.enrollment_type === 'instant' ? 'Policy Activated!' : 'Application Submitted!'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {product.enrollment_type === 'instant'
                ? 'Your policy is now active. You are covered!'
                : 'Your application is under review. We\'ll notify you within 24-48 hours.'}
            </p>
            <Button className="w-full bg-slate-800" onClick={() => { onSuccess(); onClose(); }}>Done</Button>
          </div>
        ) : product.enrollment_type === 'external_link' ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">🔗</div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Continue on {product.provider}</h3>
            <p className="text-sm text-slate-500 mb-6">You'll be redirected to {product.provider}'s platform to complete enrollment.</p>
            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-left text-sm text-slate-600">
              <p><span className="font-medium">Coverage:</span> UGX {Number(product.coverage_amount).toLocaleString()}</p>
              <p><span className="font-medium">Premium:</span> UGX {Number(product.premium_amount).toLocaleString()}/{product.premium_frequency}</p>
            </div>
            <Button className="w-full bg-slate-800 flex items-center gap-2" onClick={handleExternalLink}>
              <ExternalLink className="w-4 h-4" /> Go to {product.provider}
            </Button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Product summary */}
            <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Coverage</span><span className="font-semibold">UGX {Number(product.coverage_amount).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Premium</span><span className="font-semibold">UGX {Number(product.premium_amount).toLocaleString()}/{product.premium_frequency}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Duration</span><span className="font-semibold">{product.duration_months || 12} months</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Provider</span><span className="font-semibold">{product.provider}</span></div>
            </div>

            {/* Beneficiary */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Beneficiary Details</p>
              <div className="space-y-2">
                {[
                  { key: 'beneficiary_name', placeholder: 'Full name', label: 'Beneficiary Name' },
                  { key: 'beneficiary_relationship', placeholder: 'e.g. Spouse, Parent, Child', label: 'Relationship' },
                  { key: 'beneficiary_phone', placeholder: '+256 7XX XXX XXX', label: 'Phone Number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-slate-500 mb-0.5 block">{f.label}</label>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Asset details */}
            {needsAsset && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Asset Details</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-0.5 block">Description</label>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder={product.category === 'car' ? 'e.g. Toyota Corolla 2018 - UBD 123A' : product.category === 'device' ? 'e.g. Samsung Galaxy S22' : 'e.g. Plot 12, Kampala'}
                      value={form.asset_description}
                      onChange={e => setForm(prev => ({ ...prev, asset_description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-0.5 block">Estimated Value (UGX)</label>
                    <input
                      type="number"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="0"
                      value={form.asset_value}
                      onChange={e => setForm(prev => ({ ...prev, asset_value: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full bg-slate-800 hover:bg-slate-700"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'Submitting...' : product.enrollment_type === 'instant' ? 'Activate Policy' : 'Submit Application'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}