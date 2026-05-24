import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, Loader2 } from 'lucide-react';

export default function LoyaltyPointsToggle({ loanAmount, enabled, onToggle }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      if (!loanAmount) { setLoading(false); return; }
      const res = await base44.functions.invoke('referralEngine', {
        action: 'calculate_redemption',
        points_to_redeem: 999999,
        loan_amount: loanAmount,
      });
      setData(res.data);
      setLoading(false);
    };
    fetch();
  }, [loanAmount]);

  if (loading) return (
    <div className="flex items-center gap-2 py-2">
      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      <span className="text-xs text-gray-400">Loading points...</span>
    </div>
  );

  if (!data || data.available_points === 0) return null;

  return (
    <div className={`rounded-xl border-2 p-3 transition-all cursor-pointer ${enabled ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}
      onClick={() => onToggle(!enabled)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${enabled ? 'bg-amber-400' : 'bg-gray-100'}`}>
            <Star className={`w-4 h-4 ${enabled ? 'text-white' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className={`text-sm font-bold ${enabled ? 'text-amber-800' : 'text-gray-700'}`}>Apply Loyalty Points</p>
            <p className="text-xs text-gray-500">{data.available_points?.toLocaleString()} pts available · {data.conversion_rate}</p>
          </div>
        </div>
        <div className={`w-11 h-6 rounded-full transition-colors relative ${enabled ? 'bg-amber-400' : 'bg-gray-200'}`}>
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-6' : 'left-1'}`} />
        </div>
      </div>
      {enabled && data.discount_ugx > 0 && (
        <div className="mt-2 pt-2 border-t border-amber-200">
          <p className="text-xs text-amber-700 font-medium">
            ✅ UGX {data.discount_ugx?.toLocaleString()} discount on processing fee · {data.points_to_redeem?.toLocaleString()} pts used · {data.remaining_points?.toLocaleString()} pts remaining
          </p>
        </div>
      )}
    </div>
  );
}