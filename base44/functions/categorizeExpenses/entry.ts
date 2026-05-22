import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { expense_ids } = body; // optional: array of specific expense IDs to re-categorize

  // Fetch expenses needing AI categorization (those with category 'other' or uncategorized)
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

  // Build the AI prompt with transaction descriptions
  const transactionList = expenses
    .filter(e => e.description)
    .map((e, i) => `${i + 1}. ID: ${e.id} | Description: "${e.description}" | Amount: UGX ${e.amount}`)
    .join('\n');

  if (!transactionList) {
    return Response.json({ message: 'No descriptions to analyze', updated: 0 });
  }

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a financial transaction categorizer for a Ugandan fintech app. 
Analyze each transaction description and assign the best category from this list:
food, transport, housing, health, education, entertainment, utilities, clothing, savings, loan_repayment, other

Transactions:
${transactionList}

Return a JSON object where keys are the expense IDs and values are the category strings.
Example: { "abc123": "food", "def456": "transport" }
Only return categories from the allowed list. Be conservative — if truly unclear, use "other".`,
    response_json_schema: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  });

  // Update each expense with its AI-assigned category
  let updated = 0;
  for (const [expenseId, category] of Object.entries(result || {})) {
    const validCategories = ['food', 'transport', 'housing', 'health', 'education', 'entertainment', 'utilities', 'clothing', 'savings', 'loan_repayment', 'other'];
    if (validCategories.includes(category)) {
      await base44.entities.Expense.update(expenseId, { category, ai_categorized: true });
      updated++;
    }
  }

  return Response.json({ message: `Categorized ${updated} expense(s) using AI`, updated, categorizations: result });
});