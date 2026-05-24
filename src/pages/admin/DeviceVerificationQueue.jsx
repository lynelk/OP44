import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, CheckCircle2, XCircle, RefreshCw, Eye, FileText, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const STATUS_CONFIG = {
  Pending: { color: 'bg-amber-100 text-amber-700', icon: Clock },
  'Under Review': { color: 'bg-blue-100 text-blue-700', icon: Eye },
  Approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  Rejected: { color: 'bg-red-100 text-red-700', icon: XCircle },
  'Needs Revision': { color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
};

function DeviceDetailModal({ device, onClose, onDecision }) {
  const [decision, setDecision] = useState('');
  const [notes, setNotes] = useState('');
  const [revisionFields, setRevisionFields] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [docUrls, setDocUrls] = useState({});

  const getSignedUrl = async (uri) => {
    if (docUrls[uri]) { window.open(docUrls[uri], '_blank'); return; }
    const res = await base44.functions.invoke('deviceVerificationManager', { action: 'get_signed_url', file_uri: uri });
    if (res.data?.signed_url) { setDocUrls(p => ({ ...p, [uri]: res.data.signed_url })); window.open(res.data.signed_url, '_blank'); }
  };

  const handleSubmit = async () => {
    if (!decision || !notes) return;
    setSubmitting(true);
    await onDecision(device.id, decision, notes, revisionFields);
    setSubmitting(false);
    onClose();
  };

  const cfg = STATUS_CONFIG[device.admin_verification_status] || STATUS_CONFIG.Pending;
  // CfgIcon not used inline here — icons rendered in list

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center md:justify-center">
      <div className="bg-white w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl overflow-y-auto max-h-[90vh]">
        <div className="bg-gradient-to-r from-[#004d2b] to-[#006B3C] text-white p-5 rounded-t-3xl md:rounded-t-2xl">
          <div className="flex items-center justify-between mb-2">
            <button onClick={onClose} className="text-green-200 text-sm flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Back</button>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${cfg.color}`}>{device.admin_verification_status}</span>
          </div>
          <h2 className="text-lg font-black">{device.make} {device.model} {device.year || ''}</h2>
          <p className="text-green-200 text-sm">{device.device_type} · {device.condition_type}</p>
        </div>

        <div className="p-5 space-y-5">
          {/* Device Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Serial / VIN', device.serial_number],
              ['District', device.district],
              ['Daily Rate', device.daily_rate ? `UGX ${device.daily_rate?.toLocaleString()}` : 'N/A'],
              ['Condition', device.condition_type],
            ].map(([label, val]) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-gray-400 text-xs">{label}</p>
                <p className="font-semibold">{val || '—'}</p>
              </div>
            ))}
          </div>

          {device.condition_description && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              <p className="text-gray-400 text-xs mb-1">Condition Notes</p>
              <p>{device.condition_description}</p>
            </div>
          )}

          {/* Device Images */}
          {device.image_urls?.length > 0 && (
            <div>
              <p className="font-bold text-sm mb-2">Device Photos</p>
              <div className="grid grid-cols-3 gap-2">
                {device.image_urls.map((url, i) => (
                  <img key={i} src={url} alt={`Device photo ${i + 1}`} className="rounded-xl object-cover h-24 w-full cursor-pointer" onClick={() => window.open(url, '_blank')} />
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {(device.ownership_document_urls?.length > 0 || device.condition_report_urls?.length > 0) && (
            <div>
              <p className="font-bold text-sm mb-2">Submitted Documents</p>
              <div className="space-y-2">
                {device.ownership_document_urls?.map((url, i) => (
                  <button key={i} onClick={() => getSignedUrl(url)} className="w-full flex items-center gap-3 bg-blue-50 rounded-xl p-3 text-sm text-blue-700 font-semibold hover:bg-blue-100 transition-colors">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    Ownership Document {i + 1}
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                ))}
                {device.condition_report_urls?.map((url, i) => (
                  <button key={i} onClick={() => getSignedUrl(url)} className="w-full flex items-center gap-3 bg-purple-50 rounded-xl p-3 text-sm text-purple-700 font-semibold hover:bg-purple-100 transition-colors">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    Condition Report {i + 1}
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Admin Decision */}
          {device.admin_verification_status !== 'Approved' && (
            <div className="border-t border-gray-100 pt-4">
              <p className="font-bold text-sm mb-3">Admin Decision</p>
              <div className="flex gap-2 mb-3">
                {['Under Review', 'Approved', 'Needs Revision', 'Rejected'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDecision(d)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      decision === d
                        ? d === 'Approved' ? 'bg-green-500 text-white border-green-500'
                        : d === 'Rejected' ? 'bg-red-500 text-white border-red-500'
                        : d === 'Needs Revision' ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-blue-500 text-white border-blue-500'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >{d}</button>
                ))}
              </div>
              {decision === 'Needs Revision' && (
                <textarea
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-2 resize-none"
                  rows={2}
                  placeholder="Specify which documents or details need revision..."
                  value={revisionFields}
                  onChange={e => setRevisionFields(e.target.value)}
                />
              )}
              <textarea
                className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-3 resize-none"
                rows={3}
                placeholder={`Admin notes / reason for ${decision || 'decision'}...`}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              <Button
                onClick={handleSubmit}
                disabled={!decision || !notes || submitting}
                className={`w-full font-bold ${
                  decision === 'Approved' ? 'bg-green-600 hover:bg-green-700'
                  : decision === 'Rejected' ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[#006B3C] hover:bg-[#005530]'
                }`}
              >
                {submitting ? 'Submitting...' : `Submit: ${decision || 'Select decision first'}`}
              </Button>
            </div>
          )}

          {/* Prior decision info */}
          {device.admin_verification_notes && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              <p className="text-gray-400 text-xs mb-1">Admin Notes</p>
              <p>{device.admin_verification_notes}</p>
              {device.admin_verification_date && (
                <p className="text-xs text-gray-400 mt-1">{new Date(device.admin_verification_date).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeviceVerificationQueue() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [filterStatus, setFilterStatus] = useState('Pending');

  const load = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('deviceVerificationManager', { action: 'get_queue' });
    const all = [...(res.data?.pending || []), ...(res.data?.underReview || []), ...(res.data?.needsRevision || [])];
    setDevices(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDecision = async (deviceId, decision, notes, revisionFields) => {
    await base44.functions.invoke('deviceVerificationManager', {
      action: 'admin_review', device_id: deviceId, decision, notes, revision_fields: revisionFields
    });
    load();
  };

  const filtered = devices.filter(d => filterStatus === 'All' ? true : d.admin_verification_status === filterStatus);

  const counts = {
    Pending: devices.filter(d => d.admin_verification_status === 'Pending').length,
    'Under Review': devices.filter(d => d.admin_verification_status === 'Under Review').length,
    'Needs Revision': devices.filter(d => d.admin_verification_status === 'Needs Revision').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-5 pt-12 pb-6">
        <Link to="/admin" className="flex items-center gap-1 text-green-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Admin
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black">Device Verification</h1>
            <p className="text-green-200 text-xs mt-0.5">Review lender submissions before marketplace listing</p>
          </div>
          <button onClick={load} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {Object.entries(counts).map(([label, count]) => (
            <div key={label} className="bg-white/10 rounded-xl p-2 text-center">
              <p className="text-lg font-black">{count}</p>
              <p className="text-green-200 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-white border-b border-gray-100">
        {['All', 'Pending', 'Under Review', 'Needs Revision'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${filterStatus === s ? 'bg-[#006B3C] text-white' : 'bg-gray-100 text-gray-600'}`}
          >{s} {s !== 'All' && counts[s] != null ? `(${counts[s]})` : ''}</button>
        ))}
      </div>

      <div className="px-4 py-4 pb-24 space-y-3">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">No devices in this queue</p>
          </div>
        ) : filtered.map(device => {
          const cfg2 = STATUS_CONFIG[device.admin_verification_status] || STATUS_CONFIG.Pending;
          return (
            <button key={device.id} onClick={() => setSelectedDevice(device)} className="w-full bg-white rounded-2xl p-4 shadow-sm text-left border border-gray-100 hover:border-[#006B3C] transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {device.image_urls?.[0] ? (
                    <img src={device.image_urls[0]} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-sm">{device.make} {device.model}</p>
                    <p className="text-xs text-gray-500">{device.device_type} · {device.condition_type}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg2.color}`}>
                        {device.admin_verification_status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {device.ownership_document_urls?.length || 0} docs
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
              </div>
            </button>
          );
        })}
      </div>

      {selectedDevice && (
        <DeviceDetailModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
          onDecision={handleDecision}
        />
      )}
    </div>
  );
}