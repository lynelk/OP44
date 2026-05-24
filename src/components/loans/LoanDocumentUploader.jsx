import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, FileText, X, CheckCircle2, Loader2 } from 'lucide-react';

const DOC_TYPES = [
  { key: 'payslip_urls', label: 'Payslips', hint: 'Last 3 months (PDF/JPG)', accept: '.pdf,.jpg,.jpeg,.png', max: 3 },
  { key: 'national_id_urls', label: 'National ID / Passport', hint: 'Front & back (JPG/PNG)', accept: '.jpg,.jpeg,.png,.pdf', max: 2 },
  { key: 'bank_statement_urls', label: 'Bank Statements', hint: 'Last 3 months (PDF)', accept: '.pdf,.jpg,.jpeg,.png', max: 3 },
];

export default function LoanDocumentUploader({ value = {}, onChange }) {
  const [uploading, setUploading] = useState({});

  const handleFiles = async (key, files) => {
    if (!files.length) return;
    setUploading(u => ({ ...u, [key]: true }));
    const uploadedUrls = [];
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }
    const existing = value[key] || [];
    onChange({ ...value, [key]: [...existing, ...uploadedUrls] });
    setUploading(u => ({ ...u, [key]: false }));
  };

  const removeFile = (key, idx) => {
    const updated = [...(value[key] || [])];
    updated.splice(idx, 1);
    onChange({ ...value, [key]: updated });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Supporting Documents</p>
      {DOC_TYPES.map(({ key, label, hint, accept, max }) => {
        const files = value[key] || [];
        const isUploading = uploading[key];
        return (
          <div key={key} className="bg-gray-50 rounded-xl p-3 border border-dashed border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-700">{label}</p>
                <p className="text-xs text-gray-400">{hint}</p>
              </div>
              {files.length < max && (
                <label className="cursor-pointer flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {isUploading ? 'Uploading...' : 'Upload'}
                  <input
                    type="file"
                    accept={accept}
                    multiple
                    className="hidden"
                    disabled={isUploading}
                    onChange={e => handleFiles(key, e.target.files)}
                  />
                </label>
              )}
            </div>
            {files.length > 0 && (
              <div className="space-y-1 mt-2">
                {files.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <a href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline truncate flex-1">
                      {label} {idx + 1}
                    </a>
                    <button onClick={() => removeFile(key, idx)} className="text-gray-300 hover:text-red-400 ml-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {files.length === 0 && !isUploading && (
              <p className="text-xs text-gray-400 mt-1">No files uploaded yet</p>
            )}
          </div>
        );
      })}
    </div>
  );
}