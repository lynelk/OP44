import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Admin-only: review uploaded documents and optionally detect anomalies via AI
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { action, loan_id, document_type, status, admin_notes, run_ai_check } = body;

    // list_docs_pending doesn't need a specific loan
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

    // ── UPDATE DOCUMENT STATUS ──────────────────────────────────────────────
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

      // Notify user
      const notifMsg = status === 'approved'
        ? `Your ${document_type.replace(/_/g, ' ')} has been verified ✅`
        : status === 'rejected' || status === 'flagged'
        ? `Your ${document_type.replace(/_/g, ' ')} requires attention. ${admin_notes || 'Please re-upload a clearer copy.'}`
        : null;

      if (notifMsg) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: loan.user_id,
          title: status === 'approved' ? '📄 Document Verified' : '⚠️ Document Action Required',
          message: notifMsg,
          type: 'kyc',
          is_read: false,
        });
      }

      return Response.json({ success: true, document_type, status });
    }

    // ── RUN AI ANOMALY DETECTION ────────────────────────────────────────────
    if (action === 'detect_anomalies') {
      const fileUrlMap = {
        payslip: loan.payslip_urls || [],
        national_id: loan.national_id_urls || [],
        bank_statement: loan.bank_statement_urls || [],
      };

      const allUrls = [...(loan.payslip_urls || []), ...(loan.bank_statement_urls || [])];
      if (!allUrls.length) {
        return Response.json({ success: true, flags: [], message: 'No files to analyze' });
      }

      const prompt = `You are a financial fraud detection assistant. Analyze the uploaded documents (payslips and bank statements) for a loan application.

Borrower details:
- Loan amount requested: UGX ${loan.amount_requested?.toLocaleString()}
- Stated purpose: ${loan.purpose || 'Not specified'}
- Tenure: ${loan.tenure_months} months

Look for the following anomalies and return ONLY a JSON object:
{
  "flags": ["anomaly_code_1", "anomaly_code_2"],
  "risk_level": "low|medium|high",
  "summary": "brief human-readable summary",
  "recommended_action": "approve|flag_for_review|reject"
}

Possible flag codes: inconsistent_income, altered_dates, duplicate_document, low_quality_scan, mismatched_name, suspicious_round_numbers, missing_months, income_mismatch.

If no anomalies found, return flags: [].`;

      const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        file_urls: allUrls.slice(0, 3),
        response_json_schema: {
          type: 'object',
          properties: {
            flags: { type: 'array', items: { type: 'string' } },
            risk_level: { type: 'string' },
            summary: { type: 'string' },
            recommended_action: { type: 'string' },
          },
        },
      });

      const flags = aiResult?.flags || [];
      const riskLevel = aiResult?.risk_level || 'low';

      // Apply fraud penalty if high risk
      let penaltyApplied = false;
      if (riskLevel === 'high' && flags.length >= 2) {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: loan.user_id });
        const profile = profiles[0];
        if (profile) {
          await base44.asServiceRole.entities.UserProfile.update(profile.id, {
            fraud_flags: (profile.fraud_flags || 0) + 1,
            trust_score: Math.max(0, (profile.trust_score || 50) - 15),
          });
        }
        penaltyApplied = true;

        await base44.asServiceRole.entities.Notification.create({
          user_id: loan.user_id,
          title: '🚨 Document Verification Failed',
          message: 'Anomalies were detected in your submitted documents. Your application has been flagged for review. Repeated violations may restrict your account.',
          type: 'fraud',
          is_read: false,
        });
      }

      // Update loan with flags
      await base44.asServiceRole.entities.LoanApplication.update(loan_id, {
        fraud_flags: flags,
        fraud_penalty_applied: penaltyApplied,
        status: riskLevel === 'high' ? 'flagged' : loan.status,
      });

      return Response.json({
        success: true,
        flags,
        risk_level: riskLevel,
        summary: aiResult?.summary,
        recommended_action: aiResult?.recommended_action,
        penalty_applied: penaltyApplied,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});