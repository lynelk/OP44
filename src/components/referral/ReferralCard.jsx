import { useState } from 'react';
import { Copy, Share2, Gift, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReferralCard({ data }) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const copyLink = () => {
    navigator.clipboard.writeText(data.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on OpFin!',
          text: `Use my referral code ${data.referral_code} to sign up on OpFin and we both earn loyalty points when you get your first loan!`,
          url: data.referral_link,
        });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#1A1D29] to-[#0D1BFF] text-white rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-yellow-300" />
          <h3 className="font-bold text-base">Invite & Earn</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-200">Your Points</p>
          <p className="text-lg font-black text-yellow-300">{(data.loyalty_points || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/10 rounded-xl py-2">
          <p className="text-lg font-black">{data.successful_referrals || 0}</p>
          <p className="text-xs text-blue-200">Successful</p>
        </div>
        <div className="bg-white/10 rounded-xl py-2">
          <p className="text-lg font-black">{data.pending_referrals || 0}</p>
          <p className="text-xs text-blue-200">Pending</p>
        </div>
        <div className="bg-white/10 rounded-xl py-2">
          <p className="text-sm font-black text-yellow-300">UGX {(data.points_value_ugx || 0).toLocaleString()}</p>
          <p className="text-xs text-blue-200">Points Value</p>
        </div>
      </div>

      {/* Referral Code Box */}
      <div className="bg-white/10 rounded-xl p-3">
        <p className="text-xs text-blue-200 mb-1">Your Referral Code</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-black tracking-widest">{data.referral_code}</span>
          <button onClick={copyLink} className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-semibold transition-colors">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-yellow-300" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Reward breakdown */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white/10 rounded-xl p-2.5 text-center">
          <p className="text-yellow-300 font-bold text-base">500 pts</p>
          <p className="text-blue-200">You earn per referral</p>
        </div>
        <div className="bg-white/10 rounded-xl p-2.5 text-center">
          <p className="text-yellow-300 font-bold text-base">250 pts</p>
          <p className="text-blue-200">Friend earns on join</p>
        </div>
      </div>

      <Button onClick={share} className="w-full bg-[#00C48C] hover:bg-[#00a878] text-white font-bold gap-2 h-10">
        <Share2 className="w-4 h-4" /> Share Referral Link
      </Button>
    </div>
  );
}