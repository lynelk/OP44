import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Keyword-based categorization — no LLM credits consumed.
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

function categorize(description) {
  if (!description) return 'other';
  const lower = description.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return 'other';
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { expense_ids } = body;

  let expenses;
  if (expense_ids && expense_ids.length > 0) {
    expenses = await base44.entities.Expense.filter({ user_id: user.id });
    expenses = expenses.filter(e => expense_ids.includes(e.id));
  } else {
    expenses = await base44.entities.Expense.filter({ user_id: user.id, category: 'other' });
  }

  if (expenses.length === 0) {
    return Response.json({ message: 'No expenses to categorize', updated: 0 });
  }

  let updated = 0;
  const categorizations = {};
  for (const expense of expenses) {
    if (!expense.description) continue;
    const category = categorize(expense.description);
    categorizations[expense.id] = category;
    await base44.entities.Expense.update(expense.id, { category });
    updated++;
  }

  return Response.json({ message: `Categorized ${updated} expense(s) using keyword matching`, updated, categorizations });
});