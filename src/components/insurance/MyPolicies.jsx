import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Calendar, AlertCircle } from 'lucide-react';

const STATUS_STYLES = {
  pending_review: 'bg-amber-100 text-amber-700',
  active:         'bg-emerald-100 text-emerald-700',
  lapsed:         'bg-red-100 text-red-700',
  cancelled:      'bg-slate-100 text-slate-500',
  claimed:        'bg-blue-100 text-blue-700',
  expired:        'bg-slate-100 text-slate-500',
};

const CATEGORY_EMOJI = {
  life: '❤️', health: '🏥', loan_protection: '🛡️',
  crop_agriculture: '🌾', asset: '🏠', device: '📱', car: '🚗',
};

export default function MyPolicies({ policies, products }) {
  if (policies.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No policies yet</p>
        <p className="text-xs mt-1">Browse the marketplace to get covered</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {policies.map(policy => {
        const product = products.find(p => p.id === policy.product_id);
        const daysLeft = policy.end_date
          ? Math.ceil((new Date(policy.end_date) - new Date()) / (1000 * 60 * 60 * 24))
          : null;
        const expiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft > 0;

        return (
          <Card key={policy.id} className={`border transition-all ${policy.status === 'active' ? 'border-emerald-200' : 'border-slate-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                  {CATEGORY_EMOJI[product?.category] || '🛡️'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{product?.name || 'Policy'}</p>
                      <p className="text-xs text-slate-400">{product?.provider || ''}</p>
                    </div>
                    <Badge className={`text-xs border-0 flex-shrink-0 ${STATUS_STYLES[policy.status] || STATUS_STYLES.pending_review}`}>
                      {policy.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 mt-2 text-xs text-slate-500">
                    <span>Coverage: <span className="font-medium text-slate-700">UGX {Number(policy.coverage_amount || 0).toLocaleString()}</span></span>
                    <span>Premium: <span className="font-medium text-slate-700">UGX {Number(policy.premium_amount || 0).toLocaleString()}/{policy.premium_frequency}</span></span>
                    {policy.start_date && <span>Started: <span className="font-medium text-slate-700">{new Date(policy.start_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: '2-digit' })}</span></span>}
                    {policy.end_date && <span>Expires: <span className="font-medium text-slate-700">{new Date(policy.end_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: '2-digit' })}</span></span>}
                  </div>

                  {policy.asset_description && (
                    <p className="text-xs text-slate-400 mt-1 truncate">📎 {policy.asset_description}</p>
                  )}

                  {expiringSoon && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                      <AlertCircle className="w-3 h-3" />
                      Expiring in {daysLeft} days — renew soon
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}