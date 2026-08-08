// Client-side replacements for budget/expense backend functions.
// No LLM credits used — all rule-based.
import { base44 } from '@/api/base44Client';

// ── scanReceipt ─────────────────────────────────────────────────────────────
// AI receipt scanning is unavailable; return a manual-entry prompt.
export async function scanReceiptClient(image_url) {
  return {
    amount: null,
    merchant: '',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    description: '',
    confidence: 0,
    disabled: true,
    message: 'Receipt scanning is temporarily unavailable. Please enter the details manually.',
  };
}

// ── categorizeExpenses ──────────────────────────────────────────────────────
const CATEGORY_KEYWORDS = {
  food: ['restaurant', 'food', 'eat', 'lunch', 'dinner', 'breakfast', 'cafe', 'grocery', 'market', 'supermarket', 'kfc', 'pizza', 'chicken', 'rice', 'posho', 'matoke', 'rolex'],
  transport: ['taxi', 'uber', 'boda', 'bodaboda', 'bus', 'fuel', 'petrol', 'diesel', 'transport', 'fare', 'ride', 'motorcycle', 'airtime'],
  housing: ['rent', 'house', 'apartment', 'landlord', 'water', 'compound', 'lease'],
  health: ['hospital', 'clinic', 'doctor', 'pharmacy', 'medicine', 'drugs', 'health', 'medical', 'dental', 'lab', 'test'],
  education: ['school', 'tuition', 'fees', 'books', 'stationery', 'university', 'college', 'training', 'course'],
  entertainment: ['cinema', 'movie', 'concert', 'show', 'bar', 'club', 'game', 'sport', 'gym', 'hotel', 'event'],
  utilities: ['electricity', 'power', 'umeme', 'internet', 'wifi', 'tv', 'cable', 'phone', 'bill', 'subscription'],
  clothing: ['clothes', 'shoes', 'shirt', 'dress', 'fashion', 'fabric', 'tailor', 'boutique'],
  savings: ['savings', 'save', 'deposit', 'pocket'],
  loan_repayment: ['loan', 'repayment', 'installment', 'debt', 'credit'],
};

function categorizeByKeyword(description) {
  if (!description) return 'other';
  const lower = description.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return 'other';
}

export async function categorizeExpensesClient(expense_ids) {
  const me = await base44.auth.me();
  if (!me) throw new Error('Unauthorized');

  let expenses;
  if (expense_ids && expense_ids.length > 0) {
    expenses = await base44.entities.Expense.filter({ user_id: me.id });
    expenses = expenses.filter(e => expense_ids.includes(e.id));
  } else {
    expenses = await base44.entities.Expense.filter({ user_id: me.id, category: 'other' });
  }

  if (expenses.length === 0) {
    return { message: 'No expenses to categorize', updated: 0 };
  }

  let updated = 0;
  const categorizations = {};
  for (const expense of expenses) {
    if (!expense.description) continue;
    const category = categorizeByKeyword(expense.description);
    categorizations[expense.id] = category;
    await base44.entities.Expense.update(expense.id, { category });
    updated++;
  }

  return { message: `Categorized ${updated} expense(s) using keyword matching`, updated, categorizations };
}

// ── predictBudgetShortfalls ─────────────────────────────────────────────────
export async function predictBudgetShortfallsClient() {
  const me = await base44.auth.me();
  if (!me) throw new Error('Unauthorized');

  const expenses = await base44.entities.Expense.filter({ user_id: me.id });
  const budgets = await base44.entities.BudgetCategory.filter({ user_id: me.id });

  if (expenses.length === 0) {
    return { message: 'Not enough data', forecasts: [], suggestions: [] };
  }

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const currentMonth = monthKey(now);

  const budgetMap = {};
  budgets.forEach(b => { budgetMap[b.category] = b.monthly_limit; });

  const currentSpend = {};
  expenses.forEach(e => {
    const d = new Date(e.date || e.created_date);
    if (monthKey(d) === currentMonth) {
      currentSpend[e.category] = (currentSpend[e.category] || 0) + (e.amount || 0);
    }
  });

  const historicSpend = {};
  const historicCount = {};
  expenses.forEach(e => {
    const d = new Date(e.date || e.created_date);
    const mk = monthKey(d);
    if (mk !== currentMonth) {
      if (!historicSpend[e.category]) { historicSpend[e.category] = 0; historicCount[e.category] = new Set(); }
      historicSpend[e.category] += (e.amount || 0);
      historicCount[e.category].add(mk);
    }
  });

  const forecasts = [];
  const allCategories = new Set([...Object.keys(currentSpend), ...Object.keys(budgetMap)]);

  for (const cat of allCategories) {
    const spent = currentSpend[cat] || 0;
    const limit = budgetMap[cat] || null;
    const avgMonths = historicCount[cat]?.size || 1;
    const avgMonthly = historicSpend[cat] ? historicSpend[cat] / avgMonths : spent;

    const dailyRate = dayOfMonth > 0 ? spent / dayOfMonth : 0;
    const projected = Math.round(spent + dailyRate * daysRemaining);

    let trend = 'on_track';
    let suggestion = null;

    if (limit) {
      const pct = (projected / limit) * 100;
      if (pct >= 100) {
        trend = 'over_budget';
        suggestion = `You are projected to exceed your ${cat.replace('_', ' ')} budget by UGX ${(projected - limit).toLocaleString()}. Reduce spending now.`;
      } else if (pct >= 80) {
        trend = 'at_risk';
        suggestion = `Your ${cat.replace('_', ' ')} spending is at ${Math.round(pct)}% of budget. Be cautious this week.`;
      }
    }

    if (trend !== 'on_track') {
      forecasts.push({ category: cat, current_spend: spent, projected_month_end: projected, budget_limit: limit, trend, suggestion });
    }
  }

  const overallStatus = forecasts.some(f => f.trend === 'over_budget') ? 'at_risk'
    : forecasts.some(f => f.trend === 'at_risk') ? 'caution' : 'on_track';

  const summary = overallStatus === 'on_track'
    ? 'You are on track with your budget this month.'
    : `${forecasts.length} category(s) are at risk of overspending this month.`;

  const topSuggestion = forecasts[0]?.suggestion || 'Keep tracking your expenses to stay on budget.';

  return { overall_status: overallStatus, summary, forecasts, top_suggestion: topSuggestion };
}

// ── Rule-based savings tips (replaces direct InvokeLLM in ExpenseInsights) ─
export function generateRuleBasedSavingsTips(budgetSuggestions) {
  if (!budgetSuggestions || budgetSuggestions.length === 0) {
    return ['Track your expenses daily to identify where your money goes.', 'Set a monthly savings goal and automate a transfer to reach it.', 'Avoid impulse purchases — wait 24 hours before non-essential buys.'];
  }
  const tips = [];
  const top = budgetSuggestions[0];
  tips.push(`Your top spending category is ${top.label} (avg UGX ${Math.round(top.avgMonthly).toLocaleString()}/mo). Try cutting it by 10% to save UGX ${Math.round(top.avgMonthly * 0.1).toLocaleString()} monthly.`);
  if (budgetSuggestions.length > 1) {
    const second = budgetSuggestions[1];
    tips.push(`Review your ${second.label} spending (avg UGX ${Math.round(second.avgMonthly).toLocaleString()}/mo) — setting a firm limit could free up extra savings.`);
  }
  tips.push('Round up each expense to the nearest UGX 1,000 and transfer the difference to a savings pocket — small amounts add up fast.');
  return tips;
}