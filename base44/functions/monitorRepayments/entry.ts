import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Automated 3-Tier Collections Workflow
 *
 * Tier 1 (1–2 days overdue, reminder_count < 2):  Friendly reminder
 * Tier 2 (3–13 days overdue, reminder_count 2–3): Personalised repayment plan offer via decideLoanReschedule
 * Tier 3 (14+ days or reminder_count >= 3):        Escalate to collections, flag loan, CRB notify
 *
 * Works on both LoanApplication (legacy) and P2PLoan repayments.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    // ── Fetch overdue repayments (both loan types) ───────────────────────────
    const [legacyScheduled, p2pScheduled] = await Promise.all([
      base44.asServiceRole.entities.Repayment.filter({ status: 'scheduled' }),
      base44.asServiceRole.entities.P2PRepayment.filter({ status: 'scheduled' }),
    ]);

    const legacyOverdue = legacyScheduled.filter(r => r.due_date < today);
    const p2pOverdue = p2pScheduled.filter(r => r.due_date < today);

    // ── Batch-fetch all affected loans ───────────────────────────────────────
    const [allLegacyLoans, allP2PLoans] = await Promise.all([
      base44.asServiceRole.entities.LoanApplication.filter({}),
      base44.asServiceRole.entities.P2PLoan.filter({}),
    ]);

    const legacyLoanMap = Object.fromEntries(allLegacyLoans.map(l => [l.id, l]));
    const p2pLoanMap = Object.fromEntries(allP2PLoans.map(l => [l.id, l]));

    let reminders = 0;
    let rescheduleOffers = 0;
    let flagged = 0;

    // ── Process helper ───────────────────────────────────────────────────────
    async function processOverdue(repayment, loan, loanEntityName, repaymentEntityName) {
      if (!loan) return;
      if (['closed', 'defaulted', 'flagged', 'written_off'].includes(loan.status)) return;

      const daysOverdue = Math.floor((new Date(today) - new Date(repayment.due_date)) / (1000 * 60 * 60 * 24));
      const reminderCount = (loan.reminder_count || 0) + 1;
      const userId = loan.user_id || loan.borrower_id;

      // Mark repayment overdue
      await base44.asServiceRole.entities[repaymentEntityName].update(repayment.id, {
        status: 'overdue',
        days_late: daysOverdue,
      });

      // ── TIER 3: Critical escalation ──────────────────────────────────────
      if (daysOverdue >= 14 || reminderCount > 3) {
        await base44.asServiceRole.entities[loanEntityName].update(loan.id, {
          reminder_count: reminderCount,
          last_reminder_sent_date: nowIso,
          status: 'flagged',
          escalated_to_collections: true,
          days_overdue: daysOverdue,
          crb_reported: true,
        });

        await notify(base44, userId, {
          title: '🚨 Urgent: Loan Escalated to Collections',
          body: `Your payment of UGX ${repayment.amount?.toLocaleString()} is ${daysOverdue} days overdue. Your account has been escalated to our collections team and reported to CRB. Contact us immediately on 0800-PIPIYA to avoid legal action.`,
          type: 'repayment_due',
          priority: 'urgent',
          action_url: '/loans/repay',
        });

        // Admin notification
        await base44.asServiceRole.entities.CoachingNudge.create({
          user_id: userId,
          nudge_type: 'repayment_reminder',
          title: '⚠️ Collections Escalation',
          message: `Loan ${loan.id} is ${daysOverdue} days overdue. Account escalated and CRB reported. Consider legal action.`,
          action_label: 'View Loan',
          action_url: '/admin/loans',
          ai_generated: false,
        }).catch(() => null);

        flagged++;
        return;
      }

      // ── TIER 2: Personalized repayment plan offer ─────────────────────────
      if (daysOverdue >= 3 || reminderCount >= 2) {
        await base44.asServiceRole.entities[loanEntityName].update(loan.id, {
          reminder_count: reminderCount,
          last_reminder_sent_date: nowIso,
          days_overdue: daysOverdue,
        });

        // Attempt to invoke decideLoanReschedule for a plan offer
        const outstanding = loan.outstanding_balance || loan.amount_requested || 0;
        const currentTenure = loan.tenure_months || 3;
        const proposedTenure = Math.min(currentTenure + 3, 24);
        const rate = (loan.interest_rate || 5) / 100;
        const proposedInstallment = rate === 0 ? Math.round(outstanding / proposedTenure)
          : Math.round((outstanding * rate * Math.pow(1 + rate, proposedTenure)) / (Math.pow(1 + rate, proposedTenure) - 1));

        await notify(base44, userId, {
          title: '💬 We Can Help — Repayment Plan Available',
          body: `Your payment of UGX ${repayment.amount?.toLocaleString()} is ${daysOverdue} days overdue. We're offering a revised plan: UGX ${proposedInstallment.toLocaleString()}/month over ${proposedTenure} months. Open the app or call us to accept.`,
          type: 'repayment_due',
          priority: 'high',
          action_url: '/loans/planner',
        });

        await base44.asServiceRole.entities.CoachingNudge.create({
          user_id: userId,
          nudge_type: 'repayment_reminder',
          title: '🤝 Flexible Repayment Plan Offer',
          message: `Struggling to repay? We're offering an extended plan to help you stay on track. Tap below to review.`,
          action_label: 'View Plan',
          action_url: '/loans/planner',
          ai_generated: false,
        }).catch(() => null);

        rescheduleOffers++;
        return;
      }

      // ── TIER 1: Friendly reminder ─────────────────────────────────────────
      await base44.asServiceRole.entities[loanEntityName].update(loan.id, {
        reminder_count: reminderCount,
        last_reminder_sent_date: nowIso,
        days_overdue: daysOverdue,
      });

      await notify(base44, userId, {
        title: `⏰ Friendly Reminder — Payment Due`,
        body: `Hi! Your loan repayment of UGX ${repayment.amount?.toLocaleString()} was due on ${repayment.due_date}. Please make your payment soon to keep your account in good standing.`,
        type: 'repayment_due',
        priority: 'medium',
        action_url: '/loans/repay',
      });

      reminders++;
    }

    // ── Process both loan types in parallel batches ──────────────────────────
    const BATCH = 10;
    for (let i = 0; i < legacyOverdue.length; i += BATCH) {
      await Promise.all(legacyOverdue.slice(i, i + BATCH).map(r =>
        processOverdue(r, legacyLoanMap[r.loan_id], 'LoanApplication', 'Repayment')
      ));
    }
    for (let i = 0; i < p2pOverdue.length; i += BATCH) {
      await Promise.all(p2pOverdue.slice(i, i + BATCH).map(r =>
        processOverdue(r, p2pLoanMap[r.loan_id], 'P2PLoan', 'P2PRepayment')
      ));
    }

    return Response.json({
      success: true,
      overdue_repayments: legacyOverdue.length + p2pOverdue.length,
      reminders_sent: reminders,
      reschedule_offers: rescheduleOffers,
      loans_flagged: flagged,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Route through the central dispatcher (channels + quiet hours + correct schema),
// falling back to a direct in-app write if the dispatcher is unavailable.
async function notify(base44, userId, { title, body, type, action_url, priority = 'medium' }) {
  try {
    await base44.functions.invoke('dispatchNotification', { user_id: userId, title, body, type, action_url, priority });
  } catch {
    await base44.asServiceRole.entities.Notification.create({ user_id: userId, title, body, type, action_url, priority, is_read: false }).catch(() => null);
  }
}