import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, Plus, CheckCircle, AlertCircle, Wallet, CreditCard, ArrowLeft, Info,
  PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const ASSET_TYPES = [
  { value: 'real_estate', label: 'Real Estate', icon: '🏠' },
  { value: 'vehicle', label: 'Vehicle', icon: '🚗' },
  { value: 'external_cash', label: 'External Cash', icon: '💰' },
  { value: 'jewelry', label: 'Jewelry', icon: '💎' },
  { value: 'electronics', label: 'Electronics', icon: '📱' },
  { value: 'livestock', label: 'Livestock', icon: '🐄' },
  { value: 'business_equipment', label: 'Business Equipment', icon: '🏭' },
  { value: 'other', label: 'Other', icon: '📦' },
];

const LIABILITY_TYPES = [
  { value: 'mortgage', label: 'Mortgage', icon: '🏠' },
  { value: 'credit_card', label: 'Credit Card', icon: '💳' },
  { value: 'personal_loan', label: 'Personal Loan', icon: '📋' },
  { value: 'business_loan', label: 'Business Loan', icon: '💼' },
  { value: 'medical_debt', label: 'Medical Debt', icon: '🏥' },
  { value: 'student_loan', label: 'Student Loan', icon: '🎓' },
  { value: 'other', label: 'Other', icon: '📦' },
];

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'UGX 0';
  return `UGX ${amount.toLocaleString('en-UG')}`;
};

export default function NetWorthCalculator() {
  const [user, setUser] = useState(null);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [liabilityDialogOpen, setLiabilityDialogOpen] = useState(false);
  const [showComprehensive, setShowComprehensive] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: 'other',
    current_value: '',
    original_value: '',
    purchase_date: '',
    description: '',
    location: '',
  });
  const [newLiability, setNewLiability] = useState({
    name: '',
    type: 'other',
    outstanding_balance: '',
    original_amount: '',
    interest_rate: '',
    monthly_payment: '',
    due_date: '',
    start_date: '',
    description: '',
    lender_name: '',
  });
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [assetDocs, setAssetDocs] = useState([]);
  const [liabilityDocs, setLiabilityDocs] = useState([]);

  const queryClient = useQueryClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  };

  const { data: netWorthData, isLoading, refetch } = useQuery({
    queryKey: ['netWorth'],
    queryFn: () => base44.functions.invoke('calculateNetWorth', {}).then(r => r.data),
    enabled: !!user,
  });

  const handleUploadDocuments = async (files, type) => {
    setUploadingDocs(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      if (type === 'asset') {
        setAssetDocs(prev => [...prev, ...uploadedUrls]);
      } else {
        setLiabilityDocs(prev => [...prev, ...uploadedUrls]);
      }
      toast.success('Documents uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload documents');
    }
    setUploadingDocs(false);
  };

  const handleCreateAsset = async () => {
    if (!newAsset.name || !newAsset.current_value) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      await base44.entities.UserAsset.create({
        user_id: user.id,
        name: newAsset.name,
        type: newAsset.type,
        current_value: parseFloat(newAsset.current_value),
        original_value: newAsset.original_value ? parseFloat(newAsset.original_value) : null,
        purchase_date: newAsset.purchase_date || null,
        description: newAsset.description || '',
        location: newAsset.location || '',
        is_verified: assetDocs.length > 0,
        verification_document_urls: assetDocs,
        last_updated_date: new Date().toISOString(),
      });

      toast.success('Asset added successfully!');
      setAssetDialogOpen(false);
      setNewAsset({
        name: '',
        type: 'other',
        current_value: '',
        original_value: '',
        purchase_date: '',
        description: '',
        location: '',
      });
      setAssetDocs([]);
      queryClient.invalidateQueries(['netWorth']);
      refetch();
    } catch (error) {
      toast.error('Failed to add asset');
    }
  };

  const handleCreateLiability = async () => {
    if (!newLiability.name || !newLiability.outstanding_balance) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      await base44.entities.UserLiability.create({
        user_id: user.id,
        name: newLiability.name,
        type: newLiability.type,
        outstanding_balance: parseFloat(newLiability.outstanding_balance),
        original_amount: newLiability.original_amount ? parseFloat(newLiability.original_amount) : null,
        interest_rate: newLiability.interest_rate ? parseFloat(newLiability.interest_rate) : null,
        monthly_payment: newLiability.monthly_payment ? parseFloat(newLiability.monthly_payment) : null,
        due_date: newLiability.due_date || null,
        start_date: newLiability.start_date || null,
        description: newLiability.description || '',
        lender_name: newLiability.lender_name || '',
        is_verified: liabilityDocs.length > 0,
        verification_document_urls: liabilityDocs,
        last_updated_date: new Date().toISOString(),
      });

      toast.success('Liability added successfully!');
      setLiabilityDialogOpen(false);
      setNewLiability({
        name: '',
        type: 'other',
        outstanding_balance: '',
        original_amount: '',
        interest_rate: '',
        monthly_payment: '',
        due_date: '',
        start_date: '',
        description: '',
        lender_name: '',
      });
      setLiabilityDocs([]);
      queryClient.invalidateQueries(['netWorth']);
      refetch();
    } catch (error) {
      toast.error('Failed to add liability');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-100 border-t-[#006B3C] rounded-full animate-spin"></div>
      </div>
    );
  }

  const netWorth = netWorthData?.netWorth || 0;
  const totalAssets = netWorthData?.totalAssets || 0;
  const totalLiabilities = netWorthData?.totalLiabilities || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-4 pt-10 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/dashboard">
            <button className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Net Worth Calculator</h1>
            <p className="text-green-200 text-sm">Track your financial position</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Main Net Worth Display */}
        <Card className="bg-gradient-to-br from-[#006B3C] to-[#007a44] text-white border-0">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <p className="text-green-100 text-sm mb-1">Your Net Worth</p>
              <p className={`text-4xl font-bold ${netWorth >= 0 ? 'text-white' : 'text-red-300'}`}>
                {formatCurrency(netWorth)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-200" />
                  <p className="text-xs text-green-100">Total Assets</p>
                </div>
                <p className="text-lg font-bold">{formatCurrency(totalAssets)}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-200" />
                  <p className="text-xs text-green-100">Total Liabilities</p>
                </div>
                <p className="text-lg font-bold">{formatCurrency(totalLiabilities)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-16 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <div className="flex flex-col items-center gap-1">
                  <Plus className="w-6 h-6" />
                  <span className="text-xs font-semibold">Add Asset</span>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
                <DialogDescription>
                  Add an external asset not already tracked in the app
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Asset Name *</Label>
                  <Input
                    placeholder="e.g., Land Plot in Kampala"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Asset Type *</Label>
                  <Select
                    value={newAsset.type}
                    onValueChange={(value) => setNewAsset({ ...newAsset, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Current Value (UGX) *</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 5000000"
                    value={newAsset.current_value}
                    onChange={(e) => setNewAsset({ ...newAsset, current_value: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Original Value (UGX)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 6000000"
                    value={newAsset.original_value}
                    onChange={(e) => setNewAsset({ ...newAsset, original_value: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Purchase Date</Label>
                  <Input
                    type="date"
                    value={newAsset.purchase_date}
                    onChange={(e) => setNewAsset({ ...newAsset, purchase_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., Kampala, Uganda"
                    value={newAsset.location}
                    onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    placeholder="Additional details"
                    value={newAsset.description}
                    onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Verification Documents (Optional)</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={(e) => handleUploadDocuments(e.target.files, 'asset')}
                      className="text-sm"
                    />
                    {assetDocs.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 text-emerald-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>{assetDocs.length} document(s) uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssetDialogOpen(false)}>Cancel</Button>
                <Button className="bg-[#006B3C] hover:bg-[#005a32]" onClick={handleCreateAsset}>
                  Add Asset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={liabilityDialogOpen} onOpenChange={setLiabilityDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-16 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                <div className="flex flex-col items-center gap-1">
                  <Plus className="w-6 h-6" />
                  <span className="text-xs font-semibold">Add Liability</span>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Liability</DialogTitle>
                <DialogDescription>
                  Add an external liability not already tracked in the app
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Liability Name *</Label>
                  <Input
                    placeholder="e.g., Home Mortgage"
                    value={newLiability.name}
                    onChange={(e) => setNewLiability({ ...newLiability, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Liability Type *</Label>
                  <Select
                    value={newLiability.type}
                    onValueChange={(value) => setNewLiability({ ...newLiability, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIABILITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Outstanding Balance (UGX) *</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 15000000"
                    value={newLiability.outstanding_balance}
                    onChange={(e) => setNewLiability({ ...newLiability, outstanding_balance: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Original Amount (UGX)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 20000000"
                    value={newLiability.original_amount}
                    onChange={(e) => setNewLiability({ ...newLiability, original_amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g., 12.5"
                    value={newLiability.interest_rate}
                    onChange={(e) => setNewLiability({ ...newLiability, interest_rate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Monthly Payment (UGX)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 500000"
                    value={newLiability.monthly_payment}
                    onChange={(e) => setNewLiability({ ...newLiability, monthly_payment: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Next Due Date</Label>
                  <Input
                    type="date"
                    value={newLiability.due_date}
                    onChange={(e) => setNewLiability({ ...newLiability, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Lender Name</Label>
                  <Input
                    placeholder="e.g., ABC Bank"
                    value={newLiability.lender_name}
                    onChange={(e) => setNewLiability({ ...newLiability, lender_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    placeholder="Additional details"
                    value={newLiability.description}
                    onChange={(e) => setNewLiability({ ...newLiability, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Verification Documents (Optional)</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={(e) => handleUploadDocuments(e.target.files, 'liability')}
                      className="text-sm"
                    />
                    {liabilityDocs.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 text-emerald-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        <span>{liabilityDocs.length} document(s) uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLiabilityDialogOpen(false)}>Cancel</Button>
                <Button className="bg-[#006B3C] hover:bg-[#005a32]" onClick={handleCreateLiability}>
                  Add Liability
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Verified vs Unverified Info */}
        {(netWorthData?.unverifiedAssets > 0 || netWorthData?.unverifiedLiabilities > 0) && (
          <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                    Unverified Items
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {netWorthData.unverifiedAssets > 0 && (
                      <span>UGX {netWorthData.unverifiedAssets.toLocaleString('en-UG')} in assets </span>
                    )}
                    {netWorthData.unverifiedLiabilities > 0 && (
                      <span>and UGX {netWorthData.unverifiedLiabilities.toLocaleString('en-UG')} in liabilities </span>
                    )}
                    are not verified. Upload documents to increase reliability.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comprehensive View Toggle */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            {showComprehensive ? 'Detailed Breakdown' : 'Summary'}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComprehensive(!showComprehensive)}
            className="text-xs"
          >
            {showComprehensive ? 'Show Simple' : 'Show Comprehensive'}
          </Button>
        </div>

        {showComprehensive ? (
          <>
            {/* Asset Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    Assets Breakdown
                  </h3>
                  <span className="text-xs text-gray-500">
                    {Object.values(netWorthData?.assetCount || {}).reduce((a, b) => a + b, 0)} items
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {netWorthData?.assetBreakdown && Object.entries(netWorthData.assetBreakdown).map(([key, value]) => {
                  if (value === 0) return null;
                  const count = netWorthData.assetCount[key] || 0;
                  return (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">
                        {key.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{count} item{count !== 1 ? 's' : ''}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(value)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Liability Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-orange-600" />
                    Liabilities Breakdown
                  </h3>
                  <span className="text-xs text-gray-500">
                    {Object.values(netWorthData?.liabilityCount || {}).reduce((a, b) => a + b, 0)} items
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {netWorthData?.liabilityBreakdown && Object.entries(netWorthData.liabilityBreakdown).map(([key, value]) => {
                  if (value === 0) return null;
                  const count = netWorthData.liabilityCount[key] || 0;
                  return (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">
                        {key.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{count} item{count !== 1 ? 's' : ''}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(value)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Total Assets</p>
                      <p className="text-xs text-gray-500">
                        {Object.values(netWorthData?.assetCount || {}).reduce((a, b) => a + b, 0)} items tracked
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">
                    {formatCurrency(totalAssets)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Total Liabilities</p>
                      <p className="text-xs text-gray-500">
                        {Object.values(netWorthData?.liabilityCount || {}).reduce((a, b) => a + b, 0)} items tracked
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-orange-600">
                    {formatCurrency(totalLiabilities)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                  About Net Worth
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  Your net worth is calculated by subtracting total liabilities from total assets. 
                  This includes in-app data (loans, savings, investments, devices, insurance) plus 
                  any external assets and liabilities you manually add. Verified items (with uploaded 
                  documents) are marked for reliability.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}