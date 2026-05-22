import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, ExternalLink, Zap, Clock } from 'lucide-react';

const CATEGORY_META = {
  life:             { label: 'Life',            emoji: '❤️',  color: 'bg-red-100 text-red-700' },
  health:           { label: 'Health',          emoji: '🏥',  color: 'bg-blue-100 text-blue-700' },
  loan_protection:  { label: 'Loan Protection', emoji: '🛡️',  color: 'bg-purple-100 text-purple-700' },
  crop_agriculture: { label: 'Agriculture',     emoji: '🌾',  color: 'bg-green-100 text-green-700' },
  asset:            { label: 'Asset',           emoji: '🏠',  color: 'bg-amber-100 text-amber-700' },
  device:           { label: 'Device',          emoji: '📱',  color: 'bg-slate-100 text-slate-700' },
  car:              { label: 'Car',             emoji: '🚗',  color: 'bg-orange-100 text-orange-700' },
};

const ENROLL_ICON = {
  instant:         <Zap className="w-3 h-3 text-emerald-500" />,
  review_required: <Clock className="w-3 h-3 text-amber-500" />,
  external_link:   <ExternalLink className="w-3 h-3 text-blue-500" />,
};
const ENROLL_LABEL = {
  instant:         'Instant',
  review_required: 'Review',
  external_link:   'External',
};

export default function ProductCard({ product, onEnroll, hasActivePolicy }) {
  const meta = CATEGORY_META[product.category] || { label: product.category, emoji: '🛡️', color: 'bg-slate-100 text-slate-700' };

  return (
    <Card className={`border transition-all ${hasActivePolicy ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-2xl flex-shrink-0">
            {meta.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                  {product.popular && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs py-0">Popular</Badge>}
                  {hasActivePolicy && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs py-0">Active</Badge>}
                </div>
                <p className="text-xs text-slate-400">{product.provider}</p>
              </div>
              <Badge className={`text-xs border-0 flex-shrink-0 ${meta.color}`}>{meta.label}</Badge>
            </div>

            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{product.description}</p>

            {product.features?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {product.features.slice(0, 3).map(f => (
                  <span key={f} className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{f}</span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-base font-bold text-slate-800">
                  UGX {Number(product.premium_amount).toLocaleString()}
                  <span className="text-xs font-normal text-slate-400">/{product.premium_frequency}</span>
                </p>
                <p className="text-xs text-slate-400">Covers UGX {Number(product.coverage_amount).toLocaleString()}</p>
              </div>

              {hasActivePolicy ? (
                <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200" onClick={() => onEnroll(product)}>
                  View Policy
                </Button>
              ) : (
                <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white" onClick={() => onEnroll(product)}>
                  <span className="flex items-center gap-1">
                    {ENROLL_ICON[product.enrollment_type]}
                    {ENROLL_LABEL[product.enrollment_type]}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}