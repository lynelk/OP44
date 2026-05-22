import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield } from 'lucide-react';
import ProductCard from '@/components/insurance/ProductCard';
import MyPolicies from '@/components/insurance/MyPolicies';
import EnrollModal from '@/components/insurance/EnrollModal';

const CATEGORIES = [
  { key: 'all',             label: 'All' },
  { key: 'life',            label: '❤️ Life' },
  { key: 'health',          label: '🏥 Health' },
  { key: 'loan_protection', label: '🛡️ Loan' },
  { key: 'device',          label: '📱 Device' },
  { key: 'car',             label: '🚗 Car' },
  { key: 'crop_agriculture',label: '🌾 Agri' },
  { key: 'asset',           label: '🏠 Asset' },
];

export default function Insurance() {
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
    setProducts(prods);
    setPolicies(pols);
    setLoading(false);
  };

  const filteredProducts = category === 'all' ? products : products.filter(p => p.category === category);
  const activePoliciesCount = policies.filter(p => p.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-slate-900 text-white px-5 pt-12 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold">Insurance</h1>
        </div>
        <p className="text-slate-400 text-sm">Protect what matters most</p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-400">Active Policies</p>
            <p className="text-2xl font-bold">{activePoliciesCount}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xs text-slate-400">Available Products</p>
            <p className="text-2xl font-bold">{products.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white sticky top-0 z-10">
        {[['marketplace', 'Marketplace'], ['my_policies', `My Policies${policies.length ? ` (${policies.length})` : ''}`]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === key ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : tab === 'marketplace' ? (
          <>
            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 scrollbar-hide">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    category === c.key ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No products in this category yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEnroll={setSelectedProduct}
                    hasActivePolicy={policies.some(p => p.product_id === product.id && p.status === 'active')}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <MyPolicies policies={policies} products={products} />
        )}
      </div>

      {selectedProduct && user && (
        <EnrollModal
          product={selectedProduct}
          user={user}
          onClose={() => setSelectedProduct(null)}
          onSuccess={() => { loadData(); setTab('my_policies'); }}
        />
      )}
    </div>
  );
}