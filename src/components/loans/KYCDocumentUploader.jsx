import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, CheckCircle2, Loader2, FileText, Camera, X, Sparkles, AlertCircle } from 'lucide-react';

const DOC_TYPES = [
  { id: 'national_id',        label: 'National ID',          icon: '🪪', hint: 'Front & back of your NIN card' },
  { id: 'selfie',             label: 'Selfie / Photo',       icon: '🤳', hint: 'Clear face photo for identity verification' },
  { id: 'employment_letter',  label: 'Employment Letter',    icon: '📄', hint: 'Proof of employment from your employer' },
  { id: 'bank_statement',     label: 'Bank Statement',       icon: '🏦', hint: 'Last 3 months bank or mobile money statement' },
  { id: 'utility_bill',       label: 'Utility Bill',         icon: '📋', hint: 'Proof of residence (electricity, water, etc.)' },
];

export default function KYCDocumentUploader({ userId, onExtracted }) {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState({});
  const [scanning, setScanning] = useState({});
  const [extractedData, setExtractedData] = useState({});

  useEffect(() => { loadDocs(); }, [userId]);

  const loadDocs = async () => {
    if (!userId) return;
    const existing = await base44.entities.KYCDocument.filter({ user_id: userId });
    setDocs(existing);
  };

  const handleUpload = async (docType, file) => {
    if (!file) return;
    setUploading(p => ({ ...p, [docType]: true }));

    // Upload file
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Save KYC record
    const existingDoc = docs.find(d => d.document_type === docType);
    if (existingDoc) {
      await base44.entities.KYCDocument.update(existingDoc.id, { file_url, status: 'pending', reviewer_notes: null });
    } else {
      await base44.entities.KYCDocument.create({ user_id: userId, document_type: docType, file_url, status: 'pending' });
    }

    setUploading(p => ({ ...p, [docType]: false }));

    // Auto-scan with AI for data extraction (especially useful for ID and bank statements)
    if (['national_id', 'bank_statement', 'employment_letter'].includes(docType)) {
      setScanning(p => ({ ...p, [docType]: true }));
      const result = await base44.functions.invoke('scanReceipt', { file_url, document_type: docType });
      if (result?.data?.extracted) {
        setExtractedData(p => ({ ...p, [docType]: result.data.extracted }));
        if (onExtracted) onExtracted(docType, result.data.extracted);
      }
      setScanning(p => ({ ...p, [docType]: false }));
    }

    // After NIN upload: run live GnuGrid NIN validation
    if (docType === 'national_id') {
      // Try to extract NIN from scanned data or fallback gracefully
      const scanned = extractedData['national_id'];
      const nin = scanned?.nin || scanned?.national_id || scanned?.id_number;
      if (nin) {
        setScanning(p => ({ ...p, national_id_validation: true }));
        const valRes = await base44.functions.invoke('gnugridValidation', { action: 'validate_nin', nin });
        if (valRes?.data?.nin_status === 'VALID') {
          setExtractedData(p => ({ ...p, national_id_validation: { status: 'VALID', name: valRes.data.name, dob: valRes.data.date_of_birth } }));
        } else {
          setExtractedData(p => ({ ...p, national_id_validation: { status: valRes?.data?.nin_status || 'UNVERIFIED' } }));
        }
        setScanning(p => ({ ...p, national_id_validation: false }));
      }
    }

    loadDocs();
  };

  const getDoc = (type) => docs.find(d => d.document_type === type);

  const statusColor = (status) => ({
    approved: 'text-emerald-600 bg-emerald-50',
    rejected:  'text-red-600 bg-red-50',
    pending:   'text-amber-600 bg-amber-50',
  }[status] || 'text-gray-500 bg-gray-50');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4 text-[#1a3a6b]" />
        <h3 className="text-sm font-bold text-gray-800">KYC Documents</h3>
        <span className="text-xs text-gray-400">({docs.filter(d => d.status === 'approved').length}/{DOC_TYPES.length} verified)</span>
      </div>

      {DOC_TYPES.map(({ id, label, icon, hint }) => {
        const doc = getDoc(id);
        const isUploading = uploading[id];
        const isScanning = scanning[id];
        const extracted = extractedData[id];

        return (
          <div key={id} className="bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-400 leading-tight">{hint}</p>
              </div>

              {doc ? (
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor(doc.status)}`}>
                    {doc.status}
                  </span>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*,application/pdf" className="hidden"
                      onChange={e => handleUpload(id, e.target.files[0])} />
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={e => handleUpload(id, e.target.files[0])} disabled={isUploading} />
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    isUploading ? 'bg-gray-100 text-gray-400' : 'bg-[#1a3a6b] text-white hover:bg-[#152f5a]'
                  }`}>
                    {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </div>
                </label>
              )}
            </div>

            {/* AI Scan Status */}
            {isScanning && (
              <div className="mt-2.5 flex items-center gap-2 bg-purple-50 rounded-xl px-3 py-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                <span className="text-xs text-purple-700 font-medium">AI scanning document…</span>
              </div>
            )}

            {/* NIN Validation Status (for national_id doc) */}
            {id === 'national_id' && extractedData['national_id_validation'] && !scanning['national_id_validation'] && (
              <div className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2 ${extractedData['national_id_validation'].status === 'VALID' ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
                {extractedData['national_id_validation'].status === 'VALID'
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  : <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                <div>
                  <p className={`text-xs font-semibold ${extractedData['national_id_validation'].status === 'VALID' ? 'text-green-700' : 'text-amber-700'}`}>
                    NIN {extractedData['national_id_validation'].status === 'VALID' ? 'Verified via GnuGrid' : `Status: ${extractedData['national_id_validation'].status}`}
                  </p>
                  {extractedData['national_id_validation'].name && (
                    <p className="text-xs text-green-600">{extractedData['national_id_validation'].name}</p>
                  )}
                </div>
              </div>
            )}
            {id === 'national_id' && scanning['national_id_validation'] && (
              <div className="mt-2 flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
                <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                <span className="text-xs text-blue-700 font-medium">Validating NIN with GnuGrid…</span>
              </div>
            )}

            {/* Extracted Data Preview */}
            {extracted && !isScanning && (
              <div className="mt-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3" /> Data extracted automatically
                </p>
                <div className="space-y-0.5">
                  {Object.entries(extracted).slice(0, 4).map(([k, v]) => v ? (
                    <p key={k} className="text-xs text-emerald-600">
                      <span className="capitalize">{k.replace(/_/g, ' ')}</span>: <span className="font-medium">{String(v)}</span>
                    </p>
                  ) : null)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}