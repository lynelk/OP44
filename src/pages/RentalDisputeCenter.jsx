import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, Scale, Upload, MessageSquare, CheckCircle2, AlertTriangle, Clock, Shield, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useSearchParams } from 'react-router-dom';

const DISPUTE_STATUS_CONFIG = {
  None: { color: 'bg-gray-100 text-gray-600', label: 'No Dispute' },
  Open: { color: 'bg-orange-100 text-orange-700', label: 'Open' },
  'Under Mediation': { color: 'bg-blue-100 text-blue-700', label: 'Under Mediation' },
  Resolved: { color: 'bg-green-100 text-green-700', label: 'Resolved' },
  Escalated: { color: 'bg-red-100 text-red-700', label: 'Escalated' },
};

const OUTCOME_CONFIG = {
  'Favour Borrower': { color: 'bg-blue-100 text-blue-700', emoji: '🏆' },
  'Favour Lender': { color: 'bg-purple-100 text-purple-700', emoji: '🏆' },
  Compromise: { color: 'bg-amber-100 text-amber-700', emoji: '🤝' },
  'No Action': { color: 'bg-gray-100 text-gray-600', emoji: '➖' },
  Pending: { color: 'bg-gray-100 text-gray-500', emoji: '⏳' },
};

const ACTION_ICON = {
  'Dispute Opened': '🚨',
  'Evidence Submitted': '📎',
  'Mediation Requested': '🧑‍⚖️',
  'Admin Assigned': '👤',
  'Status Updated': '🔄',
  'Resolution Applied': '✅',
  'Dispute Closed': '🔒',
  Escalated: '📢',
  'Comment Added': '💬',
};

export default function RentalDisputeCenter() {
  const [searchParams] = useSearchParams();
  const rentalIdParam = searchParams.get('rental_id');

  const [user, setUser] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [selectedRental, setSelectedRental] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [submitting, setSubmitting] = useState(false);

  // Open dispute form
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');

  // Evidence form
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceType, setEvidenceType] = useState('Photo');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Comment
  const [comment, setComment] = useState('');

  // Admin resolution
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resOutcome, setResOutcome] = useState('');
  const [resNotes, setResNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    const me = await base44.auth.me();
    setUser(me);

    // Load rentals that involve current user and have/had disputes
    const [borrowerRentals, lenderRentals] = await Promise.all([
      base44.entities.RentalAgreement.filter({ borrower_id: me.id }),
      base44.entities.RentalAgreement.filter({ lender_id: me.id })
    ]);
    const allRentals = [...borrowerRentals, ...lenderRentals].filter(r => r.dispute_status && r.dispute_status !== 'None' || r.status === 'Disputed');
    setRentals(allRentals);

    if (rentalIdParam) {
      const all = [...borrowerRentals, ...lenderRentals];
      const found = all.find(r => r.id === rentalIdParam);
      if (found) { setSelectedRental(found); loadRentalDetails(found.id); }
    }
    setLoading(false);
  };

  const loadRentalDetails = async (rentalId) => {
    const [logs, evid] = await Promise.all([
      base44.entities.DisputeAuditLog.filter({ rental_agreement_id: rentalId }, 'timestamp'),
      base44.entities.DisputeEvidence.filter({ rental_agreement_id: rentalId }, '-submitted_at')
    ]);
    setAuditLog(logs || []);
    setEvidence(evid || []);
  };

  useEffect(() => { loadData(); }, []);

  const selectRental = (rental) => {
    setSelectedRental(rental);
    loadRentalDetails(rental.id);
    setActiveTab('overview');
  };

  const handleOpenDispute = async () => {
    if (!disputeReason || !selectedRental) return;
    setSubmitting(true);
    await base44.functions.invoke('rentalDisputeManager', {
      action: 'open_dispute',
      rental_id: selectedRental.id,
      reason: disputeReason,
      description: disputeDesc
    });
    setShowOpenForm(false);
    setDisputeReason(''); setDisputeDesc('');
    await loadData();
    const updated = await base44.entities.RentalAgreement.filter({ id: selectedRental.id });
    if (updated.length) { setSelectedRental(updated[0]); loadRentalDetails(updated[0].id); }
    setSubmitting(false);
  };

  const handleUploadFiles = async (files) => {
    setUploadingFiles(true);
    const urls = [];
    for (const file of files) {
      const res = await base44.integrations.Core.UploadFile({ file });
      if (res.file_url) urls.push(res.file_url);
    }
    setEvidenceFiles(urls);
    setUploadingFiles(false);
  };

  const handleSubmitEvidence = async () => {
    if (!evidenceTitle || !selectedRental) return;
    setSubmitting(true);
    await base44.functions.invoke('rentalDisputeManager', {
      action: 'submit_evidence',
      rental_id: selectedRental.id,
      evidence_type: evidenceType,
      title: evidenceTitle,
      description: evidenceDesc,
      file_urls: evidenceFiles
    });
    setShowEvidenceForm(false);
    setEvidenceTitle(''); setEvidenceDesc(''); setEvidenceFiles([]);
    loadRentalDetails(selectedRental.id);
    setSubmitting(false);
  };

  const handleRequestMediation = async () => {
    await base44.functions.invoke('rentalDisputeManager', {
      action: 'request_mediation', rental_id: selectedRental.id
    });
    const updated = await base44.entities.RentalAgreement.filter({ id: selectedRental.id });
    if (updated.length) { setSelectedRental(updated[0]); loadRentalDetails(updated[0].id); }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    await base44.functions.invoke('rentalDisputeManager', {
      action: 'add_comment', rental_id: selectedRental.id, notes: comment
    });
    setComment('');
    loadRentalDetails(selectedRental.id);
  };

  const handleResolve = async () => {
    if (!resOutcome || !resNotes || !user || user.role !== 'admin') return;
    setSubmitting(true);
    await base44.functions.invoke('rentalDisputeManager', {
      action: 'resolve_dispute', rental_id: selectedRental.id, outcome: resOutcome, resolution_notes: resNotes
    });
    setShowResolveForm(false);
    const updated = await base44.entities.RentalAgreement.filter({ id: selectedRental.id });
    if (updated.length) { setSelectedRental(updated[0]); loadRentalDetails(updated[0].id); }
    setSubmitting(false);
  };

  const isBorrower = !!(selectedRental && user && selectedRental.borrower_id === user.id);
  const isLender = !!(selectedRental && user && selectedRental.lender_id === user.id);
  const disputeStatusCfg = selectedRental ? (DISPUTE_STATUS_CONFIG[selectedRental.dispute_status] || DISPUTE_STATUS_CONFIG.None) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-5 pt-14 pb-6">
        <Link to="/p2p" className="flex items-center gap-1 text-green-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-xl font-black flex items-center gap-2"><Scale className="w-5 h-5" /> Dispute Center</h1>
        <p className="text-green-200 text-xs mt-0.5">Submit evidence and resolve rental disputes fairly</p>
      </div>

      <div className="px-4 py-5 pb-24 space-y-4">
        {/* Rental selector or detail */}
        {!selectedRental ? (
          <>
            <p className="text-sm font-bold text-gray-700 mb-2">Active Disputes</p>
            {loading ? (
              [1, 2].map(i => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)
            ) : rentals.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Scale className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">No active disputes</p>
                <p className="text-xs mt-1">All your rental agreements are in good standing</p>
              </div>
            ) : rentals.map(rental => {
              const cfg = DISPUTE_STATUS_CONFIG[rental.dispute_status] || DISPUTE_STATUS_CONFIG.None;
              return (
                <button key={rental.id} onClick={() => selectRental(rental)} className="w-full bg-white rounded-2xl p-4 shadow-sm text-left border border-gray-100 hover:border-orange-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{rental.rental_ref || `Rental #${rental.id.slice(-6)}`}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{rental.dispute_reason || 'Rental dispute'}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${cfg.color}`}>{rental.dispute_status}</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-gray-300 rotate-180" />
                  </div>
                </button>
              );
            })}

            {/* Allow starting a dispute from a rental search */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
              <p className="font-bold mb-1">📋 File a New Dispute</p>
              <p className="text-xs mb-3">To open a dispute, go to your active rental agreement and tap "Open Dispute".</p>
              <Link to="/p2p"><Button size="sm" variant="outline" className="text-blue-700 border-blue-200">Go to Rentals</Button></Link>
            </div>
          </>
        ) : (
          <>
            {/* Back to list */}
            <button onClick={() => setSelectedRental(null)} className="flex items-center gap-1 text-sm text-gray-500 mb-2">
              <ChevronLeft className="w-4 h-4" /> All Disputes
            </button>

            {/* Dispute Header */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="font-black text-base">{selectedRental.rental_ref || `Rental #${selectedRental.id.slice(-6)}`}</p>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${disputeStatusCfg?.color}`}>{selectedRental.dispute_status}</span>
              </div>
              {selectedRental.dispute_reason && (
                <p className="text-sm text-gray-600 mb-1"><span className="font-semibold">Reason:</span> {selectedRental.dispute_reason}</p>
              )}
              {selectedRental.dispute_description && (
                <p className="text-xs text-gray-500">{selectedRental.dispute_description}</p>
              )}
              {selectedRental.dispute_opened_at && (
                <p className="text-xs text-gray-400 mt-1">Opened {new Date(selectedRental.dispute_opened_at).toLocaleDateString()}</p>
              )}
              {selectedRental.dispute_outcome && selectedRental.dispute_outcome !== 'Pending' && (
                <div className={`mt-3 rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-bold ${OUTCOME_CONFIG[selectedRental.dispute_outcome]?.color}`}>
                  <span>{OUTCOME_CONFIG[selectedRental.dispute_outcome]?.emoji}</span>
                  Outcome: {selectedRental.dispute_outcome}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {selectedRental.dispute_status === 'None' && (isBorrower || isLender) && (
              <Button onClick={() => setShowOpenForm(true)} className="w-full bg-orange-500 hover:bg-orange-600 font-bold">
                <AlertTriangle className="w-4 h-4 mr-2" /> Open Dispute
              </Button>
            )}
            {['Open', 'Under Mediation'].includes(selectedRental.dispute_status) && (
              <div className="flex gap-2">
                <Button onClick={() => setShowEvidenceForm(true)} variant="outline" className="flex-1 text-sm">
                  <Upload className="w-4 h-4 mr-1" /> Submit Evidence
                </Button>
                {selectedRental.dispute_status === 'Open' && (
                  <Button onClick={handleRequestMediation} className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm">
                    <Shield className="w-4 h-4 mr-1" /> Request Mediation
                  </Button>
                )}
              </div>
            )}
            {user?.role === 'admin' && ['Open', 'Under Mediation'].includes(selectedRental.dispute_status) && (
              <Button onClick={() => setShowResolveForm(true)} className="w-full bg-[#006B3C] hover:bg-[#005530] font-bold">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Resolve Dispute
              </Button>
            )}

            {/* Tabs */}
            <div className="flex gap-2">
              {[
                { key: 'overview', label: 'Audit Trail', icon: Clock },
                { key: 'evidence', label: `Evidence (${evidence.length})`, icon: FileText },
                { key: 'comment', label: 'Add Comment', icon: MessageSquare },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                    activeTab === key ? 'bg-[#006B3C] text-white' : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />{label}
                </button>
              ))}
            </div>

            {/* Audit Trail */}
            {activeTab === 'overview' && (
              <div className="space-y-2">
                {auditLog.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">No audit trail yet</p>
                ) : auditLog.map((log, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="text-lg leading-none mt-0.5">{ACTION_ICON[log.action] || '📋'}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm">{log.action}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            log.actor_role === 'Admin' ? 'bg-purple-100 text-purple-700'
                            : log.actor_role === 'Borrower' ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                          }`}>{log.actor_role}</span>
                        </div>
                        {log.notes && <p className="text-xs text-gray-600 mt-0.5">{log.notes}</p>}
                        {log.previous_status && log.new_status && (
                          <p className="text-xs text-gray-400 mt-0.5">{log.previous_status} → {log.new_status}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Evidence */}
            {activeTab === 'evidence' && (
              <div className="space-y-3">
                {evidence.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No evidence submitted yet</p>
                  </div>
                ) : evidence.map(ev => (
                  <div key={ev.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm">{ev.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        ev.submitter_role === 'Admin' ? 'bg-purple-100 text-purple-700'
                        : ev.submitter_role === 'Borrower' ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                      }`}>{ev.submitter_role}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{ev.evidence_type} · {ev.description}</p>
                    {ev.file_urls?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {ev.file_urls.map((url, fi) => (
                          <a key={fi} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                            <FileText className="w-3 h-3" /> File {fi + 1}
                          </a>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{ev.submitted_at ? new Date(ev.submitted_at).toLocaleString() : ''}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Comment */}
            {activeTab === 'comment' && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="font-bold text-sm mb-3">Add to Audit Trail</p>
                <textarea
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none"
                  rows={4}
                  placeholder="Add a comment or statement to this dispute's record..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
                <Button onClick={handleAddComment} disabled={!comment.trim()} className="w-full mt-2 bg-[#006B3C] hover:bg-[#005530]">
                  <MessageSquare className="w-4 h-4 mr-2" /> Add Comment
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Open Dispute Modal */}
      {showOpenForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg">Open a Dispute</h3>
              <button onClick={() => setShowOpenForm(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Reason for dispute</label>
              <select className="w-full border border-gray-200 rounded-xl p-3 text-sm" value={disputeReason} onChange={e => setDisputeReason(e.target.value)}>
                <option value="">Select reason</option>
                {['Device not as described', 'Device damaged during rental', 'Payment dispute', 'Delivery/collection issue', 'Unauthorized use', 'Other'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label>
              <textarea className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none" rows={4} placeholder="Describe the issue in detail..." value={disputeDesc} onChange={e => setDisputeDesc(e.target.value)} />
            </div>
            <Button onClick={handleOpenDispute} disabled={!disputeReason || submitting} className="w-full bg-orange-500 hover:bg-orange-600 font-bold">
              {submitting ? 'Opening...' : 'Open Dispute'}
            </Button>
          </div>
        </div>
      )}

      {/* Evidence Submission Modal */}
      {showEvidenceForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg">Submit Evidence</h3>
              <button onClick={() => setShowEvidenceForm(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Evidence Type</label>
              <div className="flex flex-wrap gap-2">
                {['Photo', 'Video', 'Document', 'Receipt', 'Screenshot', 'Statement'].map(t => (
                  <button key={t} onClick={() => setEvidenceType(t)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${evidenceType === t ? 'bg-[#006B3C] text-white' : 'bg-gray-100 text-gray-600'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Title</label>
              <input className="w-full border border-gray-200 rounded-xl p-3 text-sm" placeholder="Brief description of this evidence" value={evidenceTitle} onChange={e => setEvidenceTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label>
              <textarea className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none" rows={3} placeholder="Explain this evidence and its relevance..." value={evidenceDesc} onChange={e => setEvidenceDesc(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Upload Files</label>
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={e => handleUploadFiles(Array.from(e.target.files))}
                className="w-full text-sm"
              />
              {uploadingFiles && <p className="text-xs text-blue-500 mt-1">Uploading files...</p>}
              {evidenceFiles.length > 0 && <p className="text-xs text-green-600 mt-1">✓ {evidenceFiles.length} file(s) uploaded</p>}
            </div>
            <Button onClick={handleSubmitEvidence} disabled={!evidenceTitle || submitting || uploadingFiles} className="w-full bg-[#006B3C] hover:bg-[#005530] font-bold">
              {submitting ? 'Submitting...' : 'Submit Evidence'}
            </Button>
          </div>
        </div>
      )}

      {/* Admin Resolve Modal */}
      {showResolveForm && user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg">Resolve Dispute</h3>
              <button onClick={() => setShowResolveForm(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Outcome</label>
              <div className="grid grid-cols-2 gap-2">
                {['Favour Borrower', 'Favour Lender', 'Compromise', 'No Action'].map(o => (
                  <button
                    key={o}
                    onClick={() => setResOutcome(o)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${resOutcome === o ? 'bg-[#006B3C] text-white border-[#006B3C]' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                  >{OUTCOME_CONFIG[o]?.emoji} {o}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Resolution Notes</label>
              <textarea className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none" rows={4} placeholder="Explain the resolution and any required actions by either party..." value={resNotes} onChange={e => setResNotes(e.target.value)} />
            </div>
            <Button onClick={handleResolve} disabled={!resOutcome || !resNotes || submitting} className="w-full bg-[#006B3C] hover:bg-[#005530] font-bold h-12">
              {submitting ? 'Resolving...' : 'Apply Resolution'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}