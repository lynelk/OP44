import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Tag, TrendingDown, ShoppingCart, X, Clock, CheckCircle2, Info } from 'lucide-react';
import {
  getListings, getMyPositions, getMyListings, listPosition, cancelListing, buyPosition,
  TRANSFER_FEE_PCT, SECONDARY_STUB,
} from '@/lib/backend/secondaryMarket';

const ugx = (n) => `UGX ${(n || 0).toLocaleString()}`;
const BAND = { A: 'bg-emerald-100 text-emerald-700', B: 'bg-blue-100 text-blue-700', C: 'bg-amber-100 text-amber-700', D: 'bg-red-100 text-red-700' };

export default function P2PSecondaryMarket() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('buy');
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [positions, setPositions] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [sellFor, setSellFor] = useState(null); // investment being listed
  const [askPrice, setAskPrice] = useState('');
  const [toast, setToast] = useState('');

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    setLoading(true);
    const me = await base44.auth.me().catch(() => null);
    setUser(me);
    const [ls, pos, mine] = await Promise.all([
      getListings(),
      me ? getMyPositions(me.id) : [],
      me ? getMyListings(me.id) : [],
    ]);
    setListings(ls);
    setPositions(pos);
    setMyListings(mine);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const buy = async (listing) => {
    setBusy(listing.id);
    try {
      const res = await buyPosition(listing.id);
      flash(`Purchased — paid ${ugx(res.total)} (incl. ${ugx(res.fee)} fee)`);
      load();
    } catch (e) {
      flash(e.message || 'Could not complete purchase');
    } finally {
      setBusy(null);
    }
  };

  const submitListing = async () => {
    const price = parseFloat(askPrice);
    if (!price || !sellFor) return;
    setBusy('list');
    try {
      await listPosition({ investment: sellFor, askingPrice: price, userId: user?.id });
      flash('Position listed for sale');
      setSellFor(null); setAskPrice('');
      load();
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (id) => {
    setBusy(id);
    try { await cancelListing(id); flash('Listing cancelled'); load(); }
    finally { setBusy(null); }
  };

  const outstanding = (inv) => (inv.amount_invested || 0) - (inv.principal_recovered || 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      <div className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-14 pb-8">
        <button onClick={() => navigate('/p2p')} className="flex items-center gap-1 text-blue-100 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to P2P
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Secondary Market</h1>
        <p className="text-blue-100 text-sm">Sell your investments early, or buy discounted positions from other lenders.</p>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {SECONDARY_STUB && (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 p-3 text-xs text-amber-700 dark:text-amber-400 flex gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-px" />
            Preview: trades are simulated locally. Live settlement (atomic transfer + {TRANSFER_FEE_PCT}% fee) activates when the p2pEngine actions are connected.
          </div>
        )}

        <div className="flex gap-2">
          {[['buy', 'Buy positions'], ['sell', 'Sell my positions']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${tab === id ? 'bg-[#0D1BFF] text-white' : 'bg-white dark:bg-gray-900 text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-28 animate-pulse" />)}</div>
        ) : tab === 'buy' ? (
          listings.length === 0 ? (
            <Empty icon={ShoppingCart} text="No positions for sale right now. Check back soon." />
          ) : (
            <div className="space-y-3">
              {listings.map(l => (
                <div key={l.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{l.loan_ref}</p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${BAND[l.risk_band] || BAND.B}`}>Band {l.risk_band}</span>
                    </div>
                    {l.discount_pct > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <TrendingDown className="w-3.5 h-3.5" /> {l.discount_pct}% off
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <Stat label="Outstanding" value={ugx(l.outstanding_principal)} />
                    <Stat label="Price" value={ugx(l.asking_price)} accent />
                    <Stat label="Term left" value={l.months_remaining ? `${l.months_remaining} mo` : '—'} />
                  </div>
                  <button onClick={() => buy(l)} disabled={busy === l.id}
                    className="w-full mt-3 h-11 bg-[#0D1BFF] disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5">
                    <ShoppingCart className="w-4 h-4" /> {busy === l.id ? 'Settling…' : `Buy for ${ugx(l.asking_price)}`}
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3">
            {/* My open listings */}
            {myListings.filter(l => l.status === 'open').map(l => (
              <div key={l.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{l.loan_ref}</p>
                    <p className="text-xs text-gray-400">Listed at {ugx(l.asking_price)} · <Clock className="w-3 h-3 inline" /> open</p>
                  </div>
                  <button onClick={() => cancel(l.id)} disabled={busy === l.id}
                    className="flex items-center gap-1 text-xs font-semibold text-red-500 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </div>
            ))}

            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">Eligible investments</p>
            {positions.length === 0 ? (
              <Empty icon={Tag} text="You have no active investments eligible to list. Active, on-time loans can be sold here." />
            ) : (
              positions.map(inv => (
                <div key={inv.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{inv.loan_id ? `P2P-${String(inv.loan_id).slice(-4)}` : 'Investment'}</p>
                      <p className="text-xs text-gray-400">Invested {ugx(inv.amount_invested)} · Outstanding {ugx(outstanding(inv))}</p>
                    </div>
                    <button onClick={() => { setSellFor(inv); setAskPrice(String(outstanding(inv))); }}
                      className="flex items-center gap-1 text-xs font-semibold text-[#0D1BFF] dark:text-[#32B4FF] px-3 py-1.5 rounded-full bg-[#0D1BFF]/10">
                      <Tag className="w-3 h-3" /> List for sale
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Sell modal */}
      {sellFor && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setSellFor(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">List position for sale</p>
            <p className="text-xs text-gray-400 mb-4">Outstanding principal: {ugx(outstanding(sellFor))}. Buyers see your asking price and the implied discount.</p>
            <label className="text-xs text-gray-500 font-medium">Asking price (UGX)</label>
            <input type="number" value={askPrice} onChange={e => setAskPrice(e.target.value)}
              className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent px-3 mt-1 text-sm dark:text-white" />
            {parseFloat(askPrice) > 0 && outstanding(sellFor) > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                {parseFloat(askPrice) < outstanding(sellFor)
                  ? `${(((outstanding(sellFor) - parseFloat(askPrice)) / outstanding(sellFor)) * 100).toFixed(1)}% discount — attracts buyers faster.`
                  : 'At or above outstanding — may sell slower.'}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setSellFor(null)} className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold">Cancel</button>
              <button onClick={submitListing} disabled={busy === 'list' || !(parseFloat(askPrice) > 0)}
                className="flex-1 h-11 rounded-xl bg-[#0D1BFF] disabled:opacity-50 text-white font-semibold">
                {busy === 'list' ? 'Listing…' : 'List'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg z-[110]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}

const Stat = ({ label, value, accent }) => (
  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl py-2">
    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
    <p className={`text-xs font-bold ${accent ? 'text-[#0D1BFF] dark:text-[#32B4FF]' : 'text-gray-900 dark:text-white'}`}>{value}</p>
  </div>
);

const Empty = ({ icon: Icon, text }) => (
  <div className="text-center py-16 text-gray-400">
    <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
    <p className="text-sm px-8">{text}</p>
  </div>
);
