// Client-side replacements for getDashboardSummary & financialTipsGenerator
// backend functions (now inaccessible on current plan). No LLM credits used.
import { base44 } from '@/api/base44Client';

export async function fetchDashboardSummary() {
  const uid = (await base44.auth.me())?.id;
  if (!uid) throw new Error('Unauthorized');

  // Use allSettled so a single failed entity call doesn't crash the entire dashboard
  const settled = await Promise.allSettled([
    base44.entities.LoanApplication.filter({ user_id: uid }),
    base44.entities.Notification.filter({ user_id: uid, is_read: false }),
    base44.entities.CreditScore.filter({ user_id: uid }, '-calculated_at', 1),
    base44.entities.SavingsPocket.filter({ user_id: uid }),
    base44.entities.GamificationBadge.filter({ user_id: uid }),
    base44.entities.LenderInvestment.filter({ lender_id: uid }),
    base44.entities.InsurancePolicy.filter({ user_id: uid }),
    base44.entities.ReferralEvent.filter({ referrer_id: uid }),
    base44.entities.UserProfile.filter({ user_id: uid }),
  ]);

  // Log any failures for debugging, but use empty arrays as fallback
  settled.forEach((r, i) => {
    if (r.status === 'rejected') console.warn(`[Dashboard] entity ${i} failed:`, r.reason?.message || r.reason);
  });

  const val = (i, fallback = []) => settled[i].status === 'fulfilled' ? settled[i].value : fallback;
  const loans = val(0);
  const notifications = val(1);
  const scores = val(2);
  const pockets = val(3);
  const badges = val(4);
  const lenderInv = val(5);
  const policies = val(6);
  const referralEvents = val(7);
  const profile = val(8);

  const p2pTotal = lenderInv.reduce((s, i) => s + (i.amount_invested || 0), 0);
  const savingsTotal = pockets.reduce((s, p) => s + (p.current_balance || 0), 0);
  const insuranceTotal = policies.reduce((s, p) => s + (p.total_premiums_paid || 0), 0);

  const userProfile = profile[0] ?? null;
  const referralCode = userProfile?.referral_code || `OPF${uid.slice(-6).toUpperCase()}`;
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
  const successfulReferrals = referralEvents.filter(e => e.status === 'awarded').length;
  const pendingReferrals = referralEvents.filter(e => e.status === 'pending').length;
  const loyaltyPoints = userProfile?.loyalty_points || 0;
  const pointsValueUgx = Math.floor(loyaltyPoints * 5);

  return {
    loans,
    notifications,
    creditScore: scores[0] ?? null,
    pockets,
    badges,
    totalInvestments: p2pTotal + savingsTotal + insuranceTotal,
    referral: {
      referral_code: referralCode,
      referral_link: referralLink,
      successful_referrals: successfulReferrals,
      pending_referrals: pendingReferrals,
      loyalty_points: loyaltyPoints,
      points_value_ugx: pointsValueUgx,
    },
  };
}

export async function fetchFinancialTips() {
  const uid = (await base44.auth.me())?.id;
  if (!uid) throw new Error('Unauthorized');

  const currentMonth = new Date().toISOString().slice(0, 7);
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

  const settled = await Promise.allSettled([
    base44.entities.Expense.filter({ user_id: uid }),
    base44.entities.SavingsGoal.filter({ user_id: uid }),
    base44.entities.LoanApplication.filter({ user_id: uid }),
  ]);
  const expenses = settled[0].status === 'fulfilled' ? settled[0].value : [];
  const goals = settled[1].status === 'fulfilled' ? settled[1].value : [];
  const loans = settled[2].status === 'fulfilled' ? settled[2].value : [];

  const thisMonthExp = expenses.filter(e => e.date?.startsWith(currentMonth));
  const lastMonthExp = expenses.filter(e => e.date?.startsWith(lastMonth));

  const byCategory = {};
  thisMonthExp.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0); });

  const totalThisMonth = thisMonthExp.reduce((s, e) => s + (e.amount || 0), 0);
  const totalLastMonth = lastMonthExp.reduce((s, e) => s + (e.amount || 0), 0);

  const tips = [];
  const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b - a);

  if (sorted.length > 0) {
    const [topCat, topAmt] = sorted[0];
    const pct = totalThisMonth > 0 ? Math.round((topAmt / totalThisMonth) * 100) : 0;
    if (pct > 35) {
      tips.push({
        icon: '⚠️', type: 'warning',
        title: `High ${topCat.replace('_', ' ')} spend`,
        body: `${topCat.replace('_', ' ')} accounts for ${pct}% of this month's spending (UGX ${topAmt.toLocaleString()}). Consider setting a budget limit.`,
      });
    }
  }

  if (totalLastMonth > 0 && totalThisMonth > totalLastMonth * 1.2) {
    const increase = Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 100);
    tips.push({
      icon: '📈', type: 'warning',
      title: 'Spending up this month',
      body: `You've spent ${increase}% more than last month. UGX ${(totalThisMonth - totalLastMonth).toLocaleString()} extra so far.`,
    });
  }

  if (byCategory['entertainment'] > 100000) {
    tips.push({
      icon: '🎬', type: 'tip',
      title: 'Cut entertainment costs',
      body: `You spent UGX ${byCategory['entertainment'].toLocaleString()} on entertainment this month. A 20% reduction would free up UGX ${Math.round(byCategory['entertainment'] * 0.2).toLocaleString()}.`,
    });
  }

  const slowGoals = goals.filter(g => {
    if (g.status !== 'active' || g.target_amount <= 0) return false;
    const pct = (g.current_amount || 0) / g.target_amount;
    return pct < 0.15 && g.automation_type === 'none';
  });
  if (slowGoals.length > 0) {
    tips.push({
      icon: '🎯', type: 'action',
      title: 'Automate your savings',
      body: `"${slowGoals[0].name}" is progressing slowly. Enable auto round-ups or a fixed daily transfer to reach your goal faster.`,
    });
  }

  const nearDone = goals.find(g => {
    if (g.status !== 'active' || g.target_amount <= 0) return false;
    const pct = (g.current_amount || 0) / g.target_amount;
    return pct >= 0.8 && pct < 1;
  });
  if (nearDone) {
    const remaining = nearDone.target_amount - (nearDone.current_amount || 0);
    tips.push({
      icon: '🏆', type: 'positive',
      title: `Almost there on "${nearDone.name}"`,
      body: `Only UGX ${remaining.toLocaleString()} left to complete this goal. One final push and you're done!`,
    });
  }

  if (goals.filter(g => g.status === 'active').length === 0) {
    tips.push({
      icon: '💡', type: 'action',
      title: 'Create a savings goal',
      body: 'You have no active savings goals. Start small — even a UGX 50,000 emergency fund makes a big difference.',
    });
  }

  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'disbursed');
  if (activeLoans.length > 0) {
    const totalRepayments = activeLoans.reduce((s, l) => s + (l.monthly_installment || 0), 0);
    let income = 0;
    try {
      const profiles = await base44.entities.UserProfile.filter({ user_id: uid });
      income = profiles[0]?.monthly_income || 0;
    } catch (e) { /* ignore — tips still work without income */ }

    if (income > 0) {
      const dti = totalRepayments / income;
      if (dti > 0.5) {
        tips.push({
          icon: '🔴', type: 'warning',
          title: 'Debt-to-income ratio critical',
          body: `Your DTI is ${(dti * 100).toFixed(0)}% — UGX ${totalRepayments.toLocaleString()}/mo in repayments vs UGX ${income.toLocaleString()} income. Target below 40% for healthy credit.`,
        });
      } else if (dti > 0.35) {
        tips.push({
          icon: '🟡', type: 'warning',
          title: 'Elevated debt-to-income ratio',
          body: `Your DTI is ${(dti * 100).toFixed(0)}%. You're repaying UGX ${totalRepayments.toLocaleString()}/mo. Consider reducing discretionary spending to stay ahead.`,
        });
      } else if (dti < 0.2 && activeLoans.length > 0) {
        tips.push({
          icon: '✅', type: 'positive',
          title: 'Healthy debt-to-income ratio',
          body: `Your DTI is only ${(dti * 100).toFixed(0)}% — well within safe limits. Keep it up and your credit score will keep improving.`,
        });
      }
    }
  }

  if (totalThisMonth < totalLastMonth * 0.85 && totalLastMonth > 0) {
    tips.push({
      icon: '🌟', type: 'positive',
      title: 'Great financial discipline!',
      body: `You're spending less than last month. UGX ${(totalLastMonth - totalThisMonth).toLocaleString()} saved so far this month. Keep it up!`,
    });
  }

  if (tips.length === 0) {
    tips.push({
      icon: '📊', type: 'tip',
      title: 'Keep tracking',
      body: 'Log more transactions to unlock personalised insights and spending analysis.',
    });
  }

  return { success: true, tips: tips.slice(0, 4) };
}