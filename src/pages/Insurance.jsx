import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, FileText, ChevronRight, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '@/components/insurance/ProductCard';
import MyPolicies from '@/components/insurance/MyPolicies';
import EnrollModal from '@/components/insurance/EnrollModal';
import { usePageTitle } from '@/lib/usePageTitle';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'life', label: '❤️ Life' },
  { key: 'health', label: '🏥 Health' },
  { key: 'loan_protection', label: '🛡️ Loan' },
  { key: 'device', label: '📱 Device' },
  { key: 'car', label: '🚗 Car' },
  { key: 'crop_agriculture', label: '🌾 Agri' },
  { key: 'asset', label: '🏠 Asset' },
];

export default function Insurance() {
  usePageTitle('Insurance');
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [tab, setTab] = useState('marketplace');
  const [category, setCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);
    const [prods, pols] = await Promise.all([
      base44.entities.InsuranceProduct.filter({ status: 'active' }),
      base44.entities.InsurancePolicy.filter({ user_id: me.id }),
    ]);
    setProducts(prods); setPolicies(pols); setLoading(false);
  };

  const filteredProducts = category === 'all' ? products : products.filter(p => p.category === category);
  const activePoliciesCount = policies.filter(p => p.status === 'active').length;

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringPolicies = policies.filter(p => {
    if (p.status !== 'active' || !p.end_date) return false;
    const end = new Date(p.end_date);
    return end >= now && end <= thirtyDaysLater;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      <div className="bg-gradient-to-br from-[#1A1D29] via-[#0D1BFF] to-[#32B4FF] text-white px-5 pt-14 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-[#00C48C]" />
          <h1 className="text-2xl font-bold tracking-tight">Insurance</h1>
        </div>
        <p className="text-blue-100 text-sm mb-5">Protect what matters most</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-xs text-blue-100 mb-0.5">Active</p>
            <p className="text-2xl font-bold">{activePoliciesCount}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-xs text-blue-100 mb-0.5">Products</p>
            <p className="text-2xl font-bold">{products.length}</p>
          </div>
          <Link to="/insurance/claims">
            <div className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 flex flex-col items-center justify-center transition-colors h-full">
              <FileText className="w-5 h-5 text-blue-100 mb-1" />
              <p className="text-xs text-blue-100 font-medium">Claims</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        {[['marketplace','Marketplace'],['my_policies',`Policies${policies.length ? ` (${policies.length})` : ''}`],['claims','Claims']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === key ? 'text-[#0D1BFF] dark:text-[#32B4FF] border-b-2 border-[#0D1BFF] dark:border-[#32B4FF]' : 'text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Renewal reminders banner */}
      {!loading && expiringPolicies.length > 0 && (
        <div className="mx-4 mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
              {expiringPolicies.length} polic{expiringPolicies.length > 1 ? 'ies expire' : 'y expires'} within 30 days
            </p>
          </div>
          {expiringPolicies.map(p => {
            const product = products.find(pr => pr.id === p.product_id);
            const daysLeft = Math.ceil((new Date(p.end_date) - now) / (1000 * 60 * 60 * 24));
            return (
              <div key={p.id} className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-amber-600 dark:text-amber-400 truncate flex-1">
                  {product?.name || 'Policy'} · expires {new Date(p.end_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                </p>
                <span className={`text-xs font-semibold ml-2 px-2 py-0.5 rounded-full flex-shrink-0 ${daysLeft <= 7 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                  {daysLeft}d left
                </span>
              </div>
            );
          })}
          <button
            onClick={() => setTab('my_policies')}
            className="mt-2.5 w-full h-8 bg-amber-500 text-white text-xs font-semibold rounded-xl"
          >
            Renew Now
          </button>
        </div>
      )}

      <div className="px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl h-24 animate-pulse" />)}
          </div>
        ) : tab === 'marketplace' ? (
          <>
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setCategory(c.key)}
                  className={`flex-shrink-0 px-3 h-8 rounded-full text-xs font-medium transition-colors ${
                    category === c.key ? 'bg-[#0D1BFF] text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No products in this category yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} onEnroll={setSelectedProduct}
                    hasActivePolicy={policies.some(p => p.product_id === product.id && p.status === 'active')} />
                ))}
              </div>
            )}
          </>
        ) : tab === 'my_policies' ? (
          <MyPolicies policies={policies} products={products} />
        ) : (
          <Link to="/insurance/claims">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 flex items-center justify-between shadow-sm mt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0D1BFF]/10 dark:bg-[#0D1BFF]/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#0D1BFF] dark:text-[#32B4FF]" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">View Claims</p>
                  <p className="text-xs text-gray-400">Manage your insurance claims</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </Link>
        )}
      </div>

      {selectedProduct && user && (
        <EnrollModal product={selectedProduct} user={user}
          onClose={() => setSelectedProduct(null)}
          onSuccess={() => { loadData(); setTab('my_policies'); }} />
      )}
    </div>
  );
}