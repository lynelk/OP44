import { Sparkles, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function AIAdviceCard({ summary, tips }) {
  return (
    <div className="space-y-3">
      {/* AI Summary */}
      <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-600 mb-1">AI Financial Coach</p>
              <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Personalised Tips</p>
        {tips.map((tip, i) => (
          <Card key={i} className="border-slate-100">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lightbulb className="w-3 h-3 text-amber-600" />
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}