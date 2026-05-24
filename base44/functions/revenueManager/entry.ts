/**
 * Revenue Tracking Manager
 * 
 * Aggregates revenue from multiple income lines, tracks expenses, and generates partner-specific reports.
 * Supports filtering by date range, product type, and partner.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, date_from, date_to, product_type, partner_id } = body;

    if (action === 'generate_report') {
      const report = await generateRevenueReport(base44, { date_from, date_to, product_type, partner_id });
      return Response.json(report);
    }

    if (action === 'get_summary' || action === 'get_revenue_summary') {
      const summary = await getRevenueSummary(base44, { date_from, date_to });
      return Response.json(summary);
    }

    if (action === 'get_dashboard') {
      const summary = await getRevenueSummary(base44, { date_from, date_to });
      return Response.json({ success: true, ...summary });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generateRevenueReport(base44, filters) {
  const { date_from, date_to, product_type, partner_id } = filters;
  const fromDate = new Date(date_from || new Date(0));
  const toDate = new Date(date_to || new Date());

  // Fetch all revenue transactions
  const revenueTransactions = await base44.asServiceRole.entities.RevenueTransaction.filter({});
  const filteredRevenue = revenueTransactions.filter(t => {
    const tDate = new Date(t.transaction_date);
    if (tDate < fromDate || tDate > toDate) return false;
    if (product_type && t.product_type !== product_type) return false;
    if (partner_id && t.partner_id !== partner_id) return false;
    return true;
  });

  // Fetch expenses
  const expenses = await base44.asServiceRole.entities.Expense.filter({});
  const filteredExpenses = expenses.filter(e => {
    const eDate = new Date(e.created_date);
    if (eDate < fromDate || eDate > toDate) return false;
    if (partner_id && e.partner_id !== partner_id) return false;
    return true;
  });

  // Calculate totals by type
  const revenueByType = {};
  filteredRevenue.forEach(t => {
    const key = t.transaction_type;
    revenueByType[key] = (revenueByType[key] || 0) + (t.amount || 0);
  });

  const expensesByType = {};
  filteredExpenses.forEach(e => {
    const key = e.category;
    expensesByType[key] = (expensesByType[key] || 0) + (e.amount || 0);
  });

  // Calculate net revenue
  const totalRevenue = filteredRevenue.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netRevenue = totalRevenue - totalExpenses;

  // Partner breakdown if partner_id not specified
  const partnerBreakdown = [];
  if (!partner_id) {
    const partners = [...new Set(filteredRevenue.map(t => t.partner_id).filter(Boolean))];
    for (const partnerId of partners) {
      const partnerRevenue = filteredRevenue.filter(t => t.partner_id === partnerId).reduce((sum, t) => sum + (t.amount || 0), 0);
      const partnerExpenses = filteredExpenses.filter(e => e.partner_id === partnerId).reduce((sum, e) => sum + (e.amount || 0), 0);
      partnerBreakdown.push({
        partner_id: partnerId,
        revenue: partnerRevenue,
        expenses: partnerExpenses,
        net: partnerRevenue - partnerExpenses,
      });
    }
  }

  // Prepare CSV
  const csvRows = [['Date', 'Type', 'Product', 'Partner', 'Amount', 'Status']];
  filteredRevenue.forEach(t => {
    csvRows.push([
      t.transaction_date.split('T')[0],
      t.transaction_type,
      t.product_type,
      t.partner_id || 'Platform',
      t.amount,
      t.status
    ]);
  });
  const csv = csvRows.map(row => row.join(',')).join('\n');

  return {
    summary: {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_revenue: netRevenue,
      transaction_count: filteredRevenue.length,
      expense_count: filteredExpenses.length,
    },
    revenue_by_type: revenueByType,
    expenses_by_type: expensesByType,
    partner_breakdown,
    records: filteredRevenue,
    csv,
  };
}

async function getRevenueSummary(base44, filters) {
  const { date_from, date_to } = filters;
  const fromDate = new Date(date_from || new Date(0));
  const toDate = new Date(date_to || new Date());

  const revenueTransactions = await base44.asServiceRole.entities.RevenueTransaction.filter({});
  const filtered = revenueTransactions.filter(t => {
    const tDate = new Date(t.transaction_date);
    return tDate >= fromDate && tDate <= toDate;
  });

  const totalRevenue = filtered.reduce((sum, t) => sum + (t.amount || 0), 0);
  const byProduct = {};
  filtered.forEach(t => {
    byProduct[t.product_type] = (byProduct[t.product_type] || 0) + (t.amount || 0);
  });

  return {
    total_revenue: totalRevenue,
    by_product: byProduct,
    period: { from: fromDate, to: toDate },
  };
}