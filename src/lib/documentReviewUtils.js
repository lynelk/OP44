// Client-side replacement for reviewLoanDocument backend function.
// AI anomaly detection is disabled — manual review only. No LLM credits used.
import { base44 } from '@/api/base44Client';

export async function listPendingDocLoans() {
  const all = await base44.entities.LoanApplication.filter({});
  return all.filter(l =>
    l.payslip_urls?.length || l.national_id_urls?.length || l.bank_statement_urls?.length
  );
}

export async function updateDocStatus(loan_id, document_type, status, admin_notes) {
  const validTypes = ['payslip', 'national_id', 'bank_statement'];
  if (!validTypes.includes(document_type)) throw new Error('Invalid document_type');
  const validStatuses = ['pending_review', 'approved', 'rejected', 'flagged'];
  if (!validStatuses.includes(status)) throw new Error('Invalid status');

  const updateData = {
    [`${document_type}_status`]: status,
    [`${document_type}_admin_notes`]: admin_notes || '',
  };
  await base44.entities.LoanApplication.update(loan_id, updateData);

  // Notify user
  const loans = await base44.entities.LoanApplication.filter({});
  const loan = loans.find(l => l.id === loan_id);
  if (loan) {
    const notifMsg = status === 'approved'
      ? `Your ${document_type.replace(/_/g, ' ')} has been verified ✅`
      : status === 'rejected' || status === 'flagged'
      ? `Your ${document_type.replace(/_/g, ' ')} requires attention. ${admin_notes || 'Please re-upload a clearer copy.'}`
      : null;

    if (notifMsg) {
      await base44.entities.Notification.create({
        user_id: loan.user_id,
        title: status === 'approved' ? '📄 Document Verified' : '⚠️ Document Action Required',
        body: notifMsg,
        type: 'kyc_update',
        is_read: false,
      });
    }
  }

  return { success: true, document_type, status };
}

export async function detectAnomaliesClient(loan_id) {
  // AI anomaly detection is disabled to conserve integration credits.
  return {
    success: true,
    flags: [],
    risk_level: 'unknown',
    summary: 'Automated AI anomaly detection is currently disabled. Please review documents manually.',
    recommended_action: 'manual_review',
    disabled: true,
  };
}