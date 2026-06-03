import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Copy, Check, Share2, Gift, Clock, CheckCircle2 } from 'lucide-react';

// Derives a stable, human-friendly referral code from the user id.
const codeFromUser = (u) => {
  const base = (u?.referral_code || u?.id || '').toString().replace(/[^a-zA-Z0-9]/g, '');
  return (u?.referral_code || `PIP${base.slice(-6).toUpperCase()}`);
};

const STATUS = {
  pending: { label: 'Pending', icon: Clock, cls: 'bg-amber-100 text-amber-700' },
  awarded: { label: 'Awarded', icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', icon: Clock, cls: 'bg-gray-100 text-gray-500' },
};

export default function Referrals() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      base44.entities.ReferralEvent.filter({ referrer_id: u.id }, '-created_date')
        .then(setEvents)
        .finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, []);

  const code = user ? codeFromUser(user) : '';
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${code}` : '';
  const totalPoints = events.filter(e => e.status === 'awarded').reduce((s, e) => s + (e.points_awarded || 0), 0);
  const awardedCount = events.filter(e => e.status === 'awarded').length;
  const pendingCount = events.filter(e => e.status === 'pending').length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl || code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const share = async () => {
    const text = `Join me on Pipiya and get started with smart loans & savings. Use my code ${code}: ${shareUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Join Pipiya', text, url: shareUrl }); } catch { /* cancelled */ }
    } else {
      copy();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      <div className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-14 pb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Refer &amp; Earn</h1>
        <p className="text-blue-100 text-sm">Invite friends — earn points when their first loan is disbursed.</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Points', value: totalPoints },
            { label: 'Joined', value: awardedCount },
            { label: 'Pending', value: pendingCount },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-[#0D1BFF] dark:text-[#32B4FF]">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Code card */}
        <div className="bg-gradient-to-r from-[#0D1BFF] to-[#32B4FF] text-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-blue-100">Your referral code</p>
          <p className="text-3xl font-bold tracking-wider mt-1">{code || '—'}</p>
          <div className="flex gap-2 mt-4">
            <button onClick={copy} className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-semibold transition-colors">
              {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy link</>}
            </button>
            <button onClick={share} className="flex-1 flex items-center justify-center gap-1.5 h-10 bg-white text-[#0D1BFF] rounded-xl text-sm font-semibold">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
            <Gift className="w-4 h-4 text-[#F4B400]" /> How it works
          </p>
          <ol className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
            <li>1. Share your code with friends.</li>
            <li>2. They sign up and take their first loan.</li>
            <li>3. You earn reward points once it’s disbursed.</li>
          </ol>
        </div>

        {/* Referral list */}
        <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2">Your referrals</p>
        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-16 animate-pulse" />)}</div>
        ) : events.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No referrals yet — share your code to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map(e => {
              const st = STATUS[e.status] || STATUS.pending;
              const Icon = st.icon;
              return (
                <div key={e.id} className="bg-white dark:bg-gray-900 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Invitee {e.invitee_id ? `#${e.invitee_id.toString().slice(-5)}` : '—'}</p>
                    <p className="text-xs text-gray-400">{e.awarded_date ? new Date(e.awarded_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : 'Awaiting first loan'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.points_awarded > 0 && <span className="text-sm font-bold text-[#0D1BFF] dark:text-[#32B4FF]">+{e.points_awarded}</span>}
                    <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${st.cls}`}>
                      <Icon className="w-3 h-3" /> {st.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
