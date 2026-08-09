// Unified Task Engine — replaces scattered alert logic across module pages.
// Returns a prioritized list of actionable items. Empty array = nothing to show.
import { base44 } from '@/api/base44Client';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2, positive: 3 };

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / MS_PER_DAY);
}

function fmtUgx(n) {
  return `UGX ${(n || 0).toLocaleString('en-UG')}`;
}

export async function getDashboardTasks(uid) {
  if (!uid) return [];

  const settled = await Promise.allSettled([
    base44.entities.Repayment.filter({ user_id: uid, status: 'overdue' }, 'due_date', 20),
    base44.entities.Repayment.filter({ user_id: uid, status: 'scheduled' }, 'due_date', 20),
    base44.entities.KYCDocument.filter({ user_id: uid, status: 'rejected' }),
    base44.entities.LoanApplication.filter({ user_id: uid }),
    base44.entities.InsurancePolicy.filter({ user_id: uid, status: 'active' }),
    base44.entities.UserSavingsChallenge.filter({ user_id: uid, status: 'active' }),
    base44.entities.SavingsPocket.filter({ user_id: uid, status: 'active' }),
  ]);

  settled.forEach((r, i) => {
    if (r.status === 'rejected') console.warn(`[TaskEngine] entity ${i} failed:`, r.reason?.message || r.reason);
  });

  const val = (i, fallback = []) => settled[i].status === 'fulfilled' ? settled[i].value : fallback;
  const overdueRepayments = val(0);
  const scheduledRepayments = val(1);
  const rejectedKyc = val(2);
  const loans = val(3);
  const policies = val(4);
  const challenges = val(5);
  const pockets = val(6);

  const tasks = [];

  // 1. HIGH — Overdue repayments
  overdueRepayments.forEach(r => {
    const daysLate = daysUntil(r.due_date);
    tasks.push({
      id: r.id, type: 'repayment', priority: 'high', icon: '🔴',
      title: 'Payment Overdue',
      description: `${fmtUgx(r.amount)} ${daysLate !== null && daysLate < 0 ? `(${Math.abs(daysLate)}d late)` : ''} — pay now to avoid penalties.`,
      actionUrl: `/loans/repay?loan_id=${r.loan_id}`,
      ctaLabel: 'Repay Now',
    });
  });

  // 2. HIGH — Rejected KYC documents
  rejectedKyc.forEach(doc => {
    tasks.push({
      id: doc.id, type: 'kyc', priority: 'high', icon: '📄',
      title: 'Document Rejected',
      description: `Your ${doc.document_type?.replace(/_/g, ' ')} was rejected. Resubmit to unlock higher loan limits.`,
      actionUrl: '/profile',
      ctaLabel: 'Resubmit',
    });
  });

  // 3. MEDIUM — Loan applications pending review
  const pendingLoans = loans.filter(l => ['submitted', 'under_review', 'approved'].includes(l.status));
  pendingLoans.forEach(loan => {
    tasks.push({
      id: loan.id, type: 'loan_review', priority: 'medium', icon: '⏳',
      title: 'Loan Under Review',
      description: `${fmtUgx(loan.amount_requested)} — we'll notify you once it's processed.`,
      actionUrl: '/loans',
      ctaLabel: 'View Status',
    });
  });

  // 4. MEDIUM — Draft loan applications (resume)
  const draftLoans = loans.filter(l => l.status === 'draft');
  if (draftLoans.length > 0) {
    const draft = draftLoans[0];
    tasks.push({
      id: draft.id, type: 'loan_draft', priority: 'medium', icon: '✏️',
      title: 'Continue Your Application',
      description: `You have a saved draft${draft.amount_requested ? ` for ${fmtUgx(draft.amount_requested)}` : ''}. Tap to resume.`,
      actionUrl: '/loans',
      ctaLabel: 'Resume',
    });
  }

  // 5. MEDIUM — Insurance policies expiring within 30 days
  policies.forEach(p => {
    const days = daysUntil(p.end_date);
    if (days !== null && days >= 0 && days <= 30) {
      tasks.push({
        id: p.id, type: 'insurance', priority: days <= 7 ? 'high' : 'medium',
        icon: days <= 7 ? '⚠️' : '🔔',
        title: 'Policy Expiring Soon',
        description: `Your policy expires in ${days} day${days !== 1 ? 's' : ''}. Renew to stay covered.`,
        actionUrl: '/insurance',
        ctaLabel: 'Renew',
      });
    }
  });

  // 6. MEDIUM — Savings challenges ending within 3 days
  challenges.forEach(c => {
    const days = daysUntil(c.end_date);
    if (days !== null && days >= 0 && days <= 3) {
      const progress = c.target_amount > 0 ? Math.min(100, (c.total_saved_in_challenge / c.target_amount) * 100) : 0;
      tasks.push({
        id: c.id, type: 'challenge', priority: 'medium', icon: '🏁',
        title: 'Challenge Ending Soon',
        description: `"${c.challenge_title}" ends in ${days} day${days !== 1 ? 's' : ''}. ${progress.toFixed(0)}% complete.`,
        actionUrl: '/savings-challenges',
        ctaLabel: 'Contribute',
      });
    }
  });

  // 7. LOW — Upcoming scheduled repayments (due within 3 days, not yet overdue)
  scheduledRepayments.forEach(r => {
    const days = daysUntil(r.due_date);
    if (days !== null && days >= 0 && days <= 3) {
      tasks.push({
        id: r.id, type: 'repayment_upcoming', priority: 'low', icon: '📅',
        title: 'Payment Due Soon',
        description: `${fmtUgx(r.amount)} due in ${days} day${days !== 1 ? 's' : ''}.`,
        actionUrl: `/loans/repay?loan_id=${r.loan_id}`,
        ctaLabel: 'Pay Early',
      });
    }
  });

  // 8. POSITIVE — Savings pockets near completion (80-99%)
  pockets.forEach(p => {
    if (p.goal_amount > 0) {
      const pct = (p.current_balance / p.goal_amount) * 100;
      if (pct >= 80 && pct < 100) {
        const remaining = p.goal_amount - p.current_balance;
        tasks.push({
          id: p.id, type: 'savings_near', priority: 'positive', icon: '🏆',
          title: 'Almost There!',
          description: `"${p.name}" is ${pct.toFixed(0)}% funded. Only ${fmtUgx(remaining)} to go!`,
          actionUrl: '/savings',
          ctaLabel: 'Top Up',
        });
      }
    }
  });

  return tasks.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}