import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Upload, FileText, Clock, CheckCircle, AlertCircle, DollarSign, X, Image } from 'lucide-react';
import ClaimTimeline from '@/components/insurance/ClaimTimeline';

const CLAIM_STATUS = {
  submitted:    { label: 'Submitted',    color: 'bg-blue-100 text-blue-700',    icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  approved:     { label: 'Approved',     color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  rejected:     { label: 'Rejected',     color: 'bg-red-100 text-red-700',       icon: X },
  paid:         { label: 'Paid',         color: 'bg-emerald-100 text-emerald-700', icon: DollarSign },
};

export default function Claims() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [products, setProducts] = useState([]);
  const [claims, setClaims] = useState([]);
  const [tab, setTab] = useState('history');
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [claimType, setClaimType] = useState('');
  const [description, setDescription] = useState('');
  const [amountClaimed, setAmountClaimed] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setUser(me);
      const [pols, prods, cls] = await Promise.all([
        base44.entities.InsurancePolicy.filter({ user_id: me.id, status: 'active' }),
        base44.entities.InsuranceProduct.filter({}),
        base44.entities.InsuranceClaim.filter({ user_id: me.id }),
      ]);
      setPolicies(pols);
      setProducts(prods);
      setClaims(cls.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setLoading(false);
    };
    load();
  }, []);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push(file_url);
    }
    setUploadedDocs(prev => [...prev, ...uploaded]);
    setUploading(false);
  };

  const handleSubmitClaim = async () => {
    if (!selectedPolicy || !claimType || !description || !amountClaimed) return;
    setSubmitting(true);
    const claim = await base44.entities.InsuranceClaim.create({
      user_id: user.id,
      policy_id: selectedPolicy,
      claim_type: claimType,
      description,
      amount_claimed: parseFloat(amountClaimed),
      status: 'submitted',
      supporting_docs: uploadedDocs,
    });
    setClaims(prev => [claim, ...prev]);
    setSubmitted(true);
    setSubmitting(false);
  };

  const resetForm = () => {
    setSelectedPolicy(''); setClaimType(''); setDescription('');
    setAmountClaimed(''); setUploadedDocs([]); setSubmitted(false);
    setTab('history');
  };

  const getProductName = (policyId) => {
    const policy = policies.find(p => p.id === policyId) || claims.find(c => c.policy_id === policyId && policies.find(p => p.id === c.policy_id));
    const productId = policy?.product_id;
    return products.find(p => p.id === productId)?.name || 'Insurance Policy';
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 pt-10 pb-6">
        <button onClick={() => navigate('/insurance')} className="flex items-center gap-1 text-slate-400 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Insurance
        </button>
        <h1 className="text-xl font-bold">Insurance Claims</h1>
        <p className="text-slate-400 text-sm">Submit and track your claims</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white sticky top-0 z-10">
        {[['history', `All Claims${claims.length ? ` (${claims.length})` : ''}`], ['new', 'New Claim']].map(([key, label]) => (
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
          <div className="flex justify-center h-32 items-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : tab === 'history' ? (
          claims.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No claims yet</p>
              <p className="text-sm mt-1">Submit a claim when you need to</p>
              <Button className="mt-4 bg-slate-800" onClick={() => setTab('new')}>Submit First Claim</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map(claim => {
                const cfg = CLAIM_STATUS[claim.status] || CLAIM_STATUS.submitted;
                const Icon = cfg.icon;
                return (
                  <Card key={claim.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-800">{claim.claim_type}</p>
                          <p className="text-xs text-slate-400">{getProductName(claim.policy_id)}</p>
                        </div>
                        <Badge className={cfg.color}><Icon className="w-3 h-3 mr-1" />{cfg.label}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-2 line-clamp-2">{claim.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{new Date(claim.created_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className="font-bold text-slate-700">UGX {claim.amount_claimed?.toLocaleString()}</span>
                      </div>
                      {claim.supporting_docs?.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                          <Image className="w-3 h-3" /> {claim.supporting_docs.length} document{claim.supporting_docs.length > 1 ? 's' : ''} attached
                        </div>
                      )}
                      {claim.reviewer_notes && (
                        <div className="mt-2 bg-blue-50 rounded-lg p-2 text-xs text-blue-700">
                          📋 {claim.reviewer_notes}
                        </div>
                      )}
                      <ClaimTimeline claim={claim} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : submitted ? (
          /* Success state */
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Claim Submitted!</h3>
            <p className="text-slate-500 text-sm text-center mb-6">Our team will review your claim within 2–5 business days.</p>
            <Button className="w-full bg-slate-800" onClick={resetForm}>View All Claims</Button>
          </div>
        ) : (
          /* New claim form */
          <div className="space-y-4">
            {policies.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No active policies to claim against</p>
                <Button variant="outline" className="mt-3" onClick={() => navigate('/insurance')}>Browse Insurance</Button>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">Select Policy *</label>
                  <div className="space-y-2">
                    {policies.map(policy => {
                      const product = products.find(p => p.id === policy.product_id);
                      return (
                        <button
                          key={policy.id}
                          onClick={() => setSelectedPolicy(policy.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${selectedPolicy === policy.id ? 'border-slate-800 bg-slate-50' : 'border-slate-200 bg-white'}`}
                        >
                          <p className="text-sm font-medium text-slate-700">{product?.name || 'Insurance Policy'}</p>
                          <p className="text-xs text-slate-400">Coverage: UGX {policy.coverage_amount?.toLocaleString()} · {policy.status}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">Claim Type *</label>
                  <Input placeholder="e.g. Death, Hospitalisation, Theft, Accident" value={claimType} onChange={e => setClaimType(e.target.value)} />
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">Description *</label>
                  <textarea
                    className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    rows={4}
                    placeholder="Describe what happened, when, and where..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">Amount Claimed (UGX) *</label>
                  <Input type="number" placeholder="e.g. 500000" value={amountClaimed} onChange={e => setAmountClaimed(e.target.value)} />
                </div>

                {/* File upload */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block font-medium">Supporting Documents</label>
                  <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploading ? 'border-slate-300 bg-slate-50' : 'border-slate-300 hover:border-slate-400 bg-white'}`}>
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <p className="text-xs text-slate-400">{uploading ? 'Uploading...' : 'Click to upload photos or PDFs'}</p>
                    <input type="file" className="hidden" multiple accept="image/*,.pdf" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                  {uploadedDocs.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {uploadedDocs.map((url, i) => (
                        <div key={i} className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2 text-xs text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          Document {i + 1} uploaded
                          <button onClick={() => setUploadedDocs(prev => prev.filter((_, j) => j !== i))} className="ml-auto text-red-400">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full bg-slate-800 text-white h-12"
                  disabled={submitting || !selectedPolicy || !claimType || !description || !amountClaimed}
                  onClick={handleSubmitClaim}
                >
                  {submitting ? 'Submitting...' : 'Submit Claim'}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}