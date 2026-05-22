import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ── CREATE GOAL ──────────────────────────────────────────────────────────
    if (action === 'create') {
      const { name, emoji, target_amount, deadline, automation_type, round_up_strategy,
              fixed_transfer_amount, fixed_transfer_frequency, linked_expense_categories } = body;

      const goal = await base44.entities.SavingsGoal.create({
        user_id: user.id,
        name,
        emoji: emoji || '🎯',
        target_amount,
        current_amount: 0,
        total_contributions: 0,
        status: 'active',
        deadline: deadline || null,
        automation_type: automation_type || 'none',
        round_up_strategy: round_up_strategy || 'nearest_1000',
        fixed_transfer_amount: fixed_transfer_amount || null,
        fixed_transfer_frequency: fixed_transfer_frequency || null,
        linked_expense_categories: linked_expense_categories || []
      });

      return Response.json({ success: true, goal });
    }

    // ── MANUAL CONTRIBUTION ──────────────────────────────────────────────────
    if (action === 'contribute') {
      const { goal_id, amount, notes } = body;
      const goals = await base44.entities.SavingsGoal.filter({ user_id: user.id });
      const goal = goals.find(g => g.id === goal_id);
      if (!goal) return Response.json({ error: 'Goal not found' }, { status: 404 });

      const newAmount = (goal.current_amount || 0) + amount;
      const newContributions = (goal.total_contributions || 0) + 1;
      const isCompleted = newAmount >= goal.target_amount;

      const updated = await base44.entities.SavingsGoal.update(goal_id, {
        current_amount: newAmount,
        total_contributions: newContributions,
        status: isCompleted ? 'completed' : goal.status,
        completion_date: isCompleted ? new Date().toISOString() : null
      });

      await base44.entities.GoalContribution.create({
        goal_id,
        user_id: user.id,
        amount,
        source: 'manual',
        notes: notes || null,
        contributed_at: new Date().toISOString()
      });

      return Response.json({ success: true, goal: updated, completed: isCompleted });
    }

    // ── PROCESS ROUND-UP from expense ────────────────────────────────────────
    if (action === 'process_round_up') {
      // Support both direct call and entity automation payload
      const expenseData = body.data || body;
      const expense_id = expenseData.expense_id || expenseData.id;
      const expense_amount = expenseData.expense_amount || expenseData.amount;
      const expense_category = expenseData.expense_category || expenseData.category;

      const goals = await base44.entities.SavingsGoal.filter({ user_id: user.id });
      const eligible = goals.filter(g =>
        g.status === 'active' &&
        g.automation_type === 'round_up' &&
        Array.isArray(g.linked_expense_categories) &&
        g.linked_expense_categories.includes(expense_category)
      );

      if (eligible.length === 0) return Response.json({ success: true, contributions: [] });

      const contributions = [];

      for (const goal of eligible) {
        const strategy = goal.round_up_strategy || 'nearest_1000';
        const unit = strategy === 'nearest_5000' ? 5000 : 1000;
        const rounded = Math.ceil(expense_amount / unit) * unit;
        const roundUpAmt = rounded - expense_amount;

        if (roundUpAmt <= 0) continue;

        const newAmount = (goal.current_amount || 0) + roundUpAmt;
        const isCompleted = newAmount >= goal.target_amount;

        await base44.entities.SavingsGoal.update(goal.id, {
          current_amount: newAmount,
          total_contributions: (goal.total_contributions || 0) + 1,
          status: isCompleted ? 'completed' : goal.status,
          completion_date: isCompleted ? new Date().toISOString() : undefined
        });

        await base44.entities.GoalContribution.create({
          goal_id: goal.id,
          user_id: user.id,
          amount: roundUpAmt,
          source: 'round_up',
          expense_id: expense_id || null,
          notes: `Round-up from UGX ${expense_amount.toLocaleString()} expense`,
          contributed_at: new Date().toISOString()
        });

        contributions.push({ goal_id: goal.id, goal_name: goal.name, round_up: roundUpAmt });
      }

      return Response.json({ success: true, contributions });
    }

    // ── PROCESS FIXED TRANSFERS (scheduled) ──────────────────────────────────
    if (action === 'process_fixed_transfers') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const allGoals = await base44.asServiceRole.entities.SavingsGoal.filter({});
      const fixedGoals = allGoals.filter(g =>
        g.status === 'active' && g.automation_type === 'fixed_transfer' && g.fixed_transfer_amount > 0
      );

      const results = [];
      for (const goal of fixedGoals) {
        const newAmount = (goal.current_amount || 0) + goal.fixed_transfer_amount;
        const isCompleted = newAmount >= goal.target_amount;

        await base44.asServiceRole.entities.SavingsGoal.update(goal.id, {
          current_amount: newAmount,
          total_contributions: (goal.total_contributions || 0) + 1,
          status: isCompleted ? 'completed' : goal.status,
          completion_date: isCompleted ? new Date().toISOString() : undefined
        });

        await base44.asServiceRole.entities.GoalContribution.create({
          goal_id: goal.id,
          user_id: goal.user_id,
          amount: goal.fixed_transfer_amount,
          source: 'fixed_transfer',
          notes: `Auto fixed transfer (${goal.fixed_transfer_frequency})`,
          contributed_at: new Date().toISOString()
        });

        results.push({ goal_id: goal.id, goal_name: goal.name, transferred: goal.fixed_transfer_amount });
      }

      return Response.json({ success: true, processed: results.length, results });
    }

    // ── LIST GOALS with contributions ─────────────────────────────────────────
    if (action === 'list') {
      const [goals, contributions] = await Promise.all([
        base44.entities.SavingsGoal.filter({ user_id: user.id }),
        base44.entities.GoalContribution.filter({ user_id: user.id })
      ]);

      const goalsWithContribs = goals.map(g => ({
        ...g,
        recent_contributions: contributions
          .filter(c => c.goal_id === g.id)
          .sort((a, b) => new Date(b.contributed_at) - new Date(a.contributed_at))
          .slice(0, 5)
      }));

      return Response.json({ success: true, goals: goalsWithContribs, total: goals.length });
    }

    // ── UPDATE GOAL ───────────────────────────────────────────────────────────
    if (action === 'update') {
      const { goal_id, ...updates } = body;
      delete updates.action;
      delete updates.user_id;
      const updated = await base44.entities.SavingsGoal.update(goal_id, updates);
      return Response.json({ success: true, goal: updated });
    }

    // ── DELETE GOAL ───────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { goal_id } = body;
      await base44.entities.SavingsGoal.delete(goal_id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});