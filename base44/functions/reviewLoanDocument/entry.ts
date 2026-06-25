import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Admin-only: review uploaded documents.
// AI anomaly detection is disabled to conserve integration credits.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { action, loan_id, document_type, status, admin_notes } = body;

    if (action === 'list_docs_pending') {
      const all = await base44.asServiceRole.entities.LoanApplication.filter({});
      const withDocs = all.filter(l =>
        l.payslip_urls?.length || l.national_id_urls?.length || l.bank_statement_urls?.length
      );
      return Response.json({ success: true, loans: withDocs });
    }

    if (!loan_id) return Response.json({ error: 'loan_id required' }, { status: 400 });

    const loans = await base44.asServiceRole.entities.LoanApplication.filter({});
    const loan = loans.find(l => l.id === loan_id);
    if (!loan) return Response.json({ error: 'Loan not found' }, { status: 404 });

    if (action === 'update_doc_status') {
      const validTypes = ['payslip', 'national_id', 'bank_statement'];
      if (!validTypes.includes(document_type)) {
        return Response.json({ error: 'Invalid document_type' }, { status: 400 });
      }
      const validStatuses = ['pending_review', 'approved', 'rejected', 'flagged'];
      if (!validStatuses.includes(status)) {
        return Response.json({ error: 'Invalid status' }, { status: 400 });
      }

      const updateData = {
        [`${document_type}_status`]: status,
        [`${document_type}_admin_notes`]: admin_notes || '',
      };
      await base44.asServiceRole.entities.LoanApplication.update(loan_id, updateData);

      const notifMsg = status === 'approved'
        ? `Your ${document_type.replace(/_/g, ' ')} has been verified ✅`
        : status === 'rejected' || status === 'flagged'
        ? `Your ${document_type.replace(/_/g, ' ')} requires attention. ${admin_notes || 'Please re-upload a clearer copy.'}`
        : null;

      if (notifMsg) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: loan.user_id,
          title: status === 'approved' ? '📄 Document Verified' : '⚠️ Document Action Required',
          body: notifMsg,
          type: 'kyc_update',
          is_read: false,
        });
      }

      return Response.json({ success: true, document_type, status });
    }

    if (action === 'detect_anomalies') {
      // AI anomaly detection is temporarily disabled to conserve integration credits.
      // Admin should review documents manually.
      return Response.json({
        success: true,
        flags: [],
        risk_level: 'unknown',
        summary: 'Automated AI anomaly detection is currently disabled. Please review documents manually.',
        recommended_action: 'manual_review',
        disabled: true,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});