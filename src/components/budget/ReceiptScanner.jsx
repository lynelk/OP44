import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, CheckCircle, ScanLine, Upload } from 'lucide-react';

const CATEGORIES = ['food', 'transport', 'housing', 'health', 'education', 'entertainment', 'utilities', 'clothing', 'savings', 'loan_repayment', 'other'];

export default function ReceiptScanner({ userId, onExpenseAdded, onClose }) {
  const [step, setStep] = useState('capture'); // capture | scanning | confirm | done
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState(new Date().toISOString().split('T')[0]);
  const fileRef = useRef();
  const cameraRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
    setStep('preview');
  };

  const handleScan = async () => {
    if (!imageFile) return;
    setScanning(true);
    setStep('scanning');

    const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });
    const result = await base44.functions.invoke('scanReceipt', { image_url: file_url });

    const data = result.data;
    setScanned(data);
    setEditAmount(data?.amount?.toString() || '');
    setEditCategory(data?.category || 'other');
    setEditDesc(data?.description || data?.merchant || '');
    setEditDate(data?.date || new Date().toISOString().split('T')[0]);
    setScanning(false);
    setStep('confirm');
  };

  const handleSave = async () => {
    if (!editAmount || !editCategory) return;
    setSaving(true);
    const expense = await base44.entities.Expense.create({
      user_id: userId,
      amount: parseFloat(editAmount),
      category: editCategory,
      description: editDesc,
      date: editDate,
    });
    setSaving(false);
    setStep('done');
    if (onExpenseAdded) onExpenseAdded(expense);
    setTimeout(() => onClose?.(), 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center">
      <div className="bg-white rounded-t-3xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-[#1a3a6b]" /> Scan Receipt
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {step === 'capture' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Take a photo or upload a receipt image to auto-extract the expense</p>
            <button onClick={() => cameraRef.current?.click()}
              className="w-full h-36 border-2 border-dashed border-[#1a3a6b] rounded-2xl flex flex-col items-center justify-center gap-2 text-[#1a3a6b] hover:bg-blue-50 transition-colors">
              <Camera className="w-10 h-10" />
              <span className="text-sm font-medium">Take a Photo</span>
            </button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-3 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-500 text-sm hover:bg-gray-50">
              <Upload className="w-4 h-4" /> Upload from gallery
            </button>
            <input ref={fileRef} type="file" accept="image/*"
              className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-3">
            <img src={imagePreview} alt="Receipt" className="w-full max-h-48 object-contain rounded-xl border" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="text-sm" onClick={() => { setStep('capture'); setImagePreview(null); }}>
                Retake
              </Button>
              <Button className="bg-[#1a3a6b] text-white text-sm" onClick={handleScan}>
                <ScanLine className="w-4 h-4 mr-1" /> Scan Receipt
              </Button>
            </div>
          </div>
        )}

        {step === 'scanning' && (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="w-12 h-12 border-4 border-[#1a3a6b] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Extracting expense details with AI…</p>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-xs text-green-700">Receipt scanned! Review and confirm below.</p>
            </div>
            {imagePreview && <img src={imagePreview} alt="Receipt" className="w-full max-h-28 object-contain rounded-lg border" />}
            <div className="space-y-2">
              <Input type="number" placeholder="Amount (UGX)" value={editAmount} onChange={e => setEditAmount(e.target.value)} />
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Description" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
              <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
            </div>
            <Button className="w-full bg-[#f97316] text-white" onClick={handleSave} disabled={saving || !editAmount}>
              {saving ? 'Saving...' : 'Add to Budget'}
            </Button>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center py-8 gap-2">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <p className="font-semibold text-gray-800">Expense Added!</p>
            <p className="text-sm text-gray-400">UGX {parseFloat(editAmount).toLocaleString()} • {editCategory}</p>
          </div>
        )}
      </div>
    </div>
  );
}