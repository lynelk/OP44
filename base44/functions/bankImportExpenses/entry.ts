import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * bankImportExpenses — turn selected debit BankTransactions into Expense rows
 * for the Budget module. Idempotent: a transaction already marked imported is
 * skipped, so re-submitting the same ids won't create duplicate expenses.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transaction_ids } = await req.json();
    if (!Array.isArray(transaction_ids) || transaction_ids.length === 0) {
      return Response.json({ error: 'transaction_ids array is required' }, { status: 400 });
    }

    let imported = 0;
    await Promise.all(transaction_ids.map(async (id) => {
      const arr = await base44.entities.BankTransaction.filter({ id });
      const txn = arr[0];
      if (!txn || txn.user_id !== user.id || txn.imported || txn.direction !== 'debit') return;

      const expense = await base44.entities.Expense.create({
        user_id: user.id,
        amount: txn.amount,
        category: txn.category || 'other',
        description: `${txn.merchant || txn.description || 'Bank transaction'} (imported)`,
        date: (txn.booked_at || new Date().toISOString()).split('T')[0],
      });
      await base44.entities.BankTransaction.update(txn.id, { imported: true, expense_id: expense.id });
      imported++;
    }));

    return Response.json({ success: true, imported });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
