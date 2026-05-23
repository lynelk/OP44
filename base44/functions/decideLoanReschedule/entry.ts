import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { reschedule_request_id, decision, admin_notes } = await req.json();
    if (!reschedule_request_id || !['approve', 'reject'].includes(decision)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const requests = await base44.asServiceRole.entities.LoanRescheduleRequest.filter({ id: reschedule_request_id });
    const rr = requests[0];
    if (!rr) return Response.json({ error: 'Request not found' }, { status: 404 });
    if (rr.status !== 'pending') return Response.json({ error: 'Request already decided' }, { status: 400 });

    const newStatus = decision === 'approve' ? 'approved' : 'rejected';

    await base44.asServiceRole.entities.LoanRescheduleRequest.update(rr.id, {
      status: newStatus,
      admin_notes: admin_notes || '',
      decision_date: new Date().toISOString(),
      decided_by: user.email,
    });

    if (decision === 'approve') {
      // Update loan terms
      await base44.asServiceRole.entities.LoanApplication.update(rr.loan_id, {
        tenure_months: rr.requested_tenure_months,
        monthly_installment: rr.proposed_monthly_installment,
        total_repayable: rr.proposed_total_repayable,
        restructured: true,
      });

      // Delete future scheduled repayments and regenerate
      const repayments = await base44.asServiceRole.entities.Repayment.filter({ loan_id: rr.loan_id, status: 'scheduled' });
      for (const r of repayments) {
        await base44.asServiceRole.entities.Repayment.delete(r.id);
      }

      // Generate new repayment schedule
      const startDate = new Date();
      for (let i = 1; i <= rr.requested_tenure_months; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        await base44.asServiceRole.entities.Repayment.create({
          loan_id: rr.loan_id,
          user_id: rr.user_id,
          amount: rr.proposed_monthly_installment,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'scheduled',
        });
      }

      // Update next repayment date on loan
      const nextDue = new Date(startDate);
      nextDue.setMonth(nextDue.getMonth() + 1);
      await base44.asServiceRole.entities.LoanApplication.update(rr.loan_id, {
        next_repayment_date: nextDue.toISOString().split('T')[0],
      });
    }

    // Notify borrower
    await base44.asServiceRole.entities.Notification.create({
      user_id: rr.user_id,
      title: decision === 'approve' ? '✅ Reschedule Approved' : '❌ Reschedule Rejected',
      message: decision === 'approve'
        ? `Your loan reschedule has been approved. New monthly installment: UGX ${rr.proposed_monthly_installment?.toLocaleString()} for ${rr.requested_tenure_months} months.`
        : `Your loan reschedule request was rejected. ${admin_notes || ''}`,
      type: decision === 'approve' ? 'success' : 'warning',
      is_read: false,
    });

    return Response.json({ success: true, status: newStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});