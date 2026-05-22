import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Lock } from 'lucide-react';

export default function ConsentItem({ def, record, saving, onToggle }) {
  const granted = record?.granted === true;
  const hasRecord = !!record;

  return (
    <Card className={`border transition-all ${granted ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            granted ? 'bg-emerald-100' : 'bg-slate-100'
          }`}>
            {saving ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            ) : granted ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-slate-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-800">{def.label}</p>
              {def.required && (
                <Badge className="bg-slate-100 text-slate-500 border-slate-200 border text-xs py-0">
                  <Lock className="w-2.5 h-2.5 mr-1" /> Required
                </Badge>
              )}
              <Badge variant="outline" className="text-xs py-0">{def.version}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">{def.description}</p>
            {record?.granted_at && granted && (
              <p className="text-xs text-emerald-600 mt-1">
                Granted {new Date(record.granted_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
            {record?.withdrawn_at && !granted && (
              <p className="text-xs text-slate-400 mt-1">
                Withdrawn {new Date(record.withdrawn_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Toggle */}
          <button
            disabled={saving}
            onClick={() => onToggle(def, !granted)}
            className={`flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              granted ? 'bg-emerald-500' : 'bg-slate-200'
            } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              granted ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}