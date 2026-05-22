import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, FileText, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from '@/components/insurance/ProductCard';
import MyPolicies from '@/components/insurance/MyPolicies';
import EnrollModal from '@/components/insurance/EnrollModal';

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans">
      <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-slate-900 text-white px-5 pt-14 pb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h1 className="text-2xl font-bold tracking-tight">Insurance</h1>
        </div>
        <p className="text-slate-400 text-sm mb-5">Protect what matters most</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-xs text-slate-400 mb-0.5">Active</p>
            <p className="text-2xl font-bold">{activePoliciesCount}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-3">
            <p className="text-xs text-slate-400 mb-0.5">Products</p>
            <p className="text-2xl font-bold">{products.length}</p>
          </div>
          <Link to="/insurance/claims">
            <div className="bg-white/10 hover:bg-white/20 rounded-2xl p-3 flex flex-col items-center justify-center transition-colors h-full">
              <FileText className="w-5 h-5 text-slate-300 mb-1" />
              <p className="text-xs text-slate-300 font-medium">Claims</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        {[['marketplace','Marketplace'],['my_policies',`Policies${policies.length ? ` (${policies.length})` : ''}`],['claims','Claims']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === key ? 'text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white' : 'text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

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
                    category === c.key ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
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
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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