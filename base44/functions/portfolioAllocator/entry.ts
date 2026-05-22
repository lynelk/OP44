import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RISK_ALLOCATIONS = {
  conservative: { bonds: 50, money_market: 30, p2p_loans: 15, sacco: 5 },
  moderate:     { bonds: 25, money_market: 25, p2p_loans: 35, sacco: 15 },
  aggressive:   { bonds: 10, money_market: 10, p2p_loans: 60, sacco: 20 },
};

const RISK_EXPECTED_RETURNS = {
  conservative: 0.08,
  moderate: 0.14,
  aggressive: 0.22,
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  // GET or CREATE user risk profile
  if (action === 'get_profile') {
    const profiles = await base44.entities.RiskProfile.filter({ user_id: user.id });
    const profile = profiles[0] || null;
    const contributions = await base44.entities.InvestorContribution.filter({ user_id: user.id });
    const totalInvested = contributions.reduce((s, c) => s + (c.contribution_amount || 0), 0);
    const totalReturns = contributions.reduce((s, c) => s + (c.total_returns_earned || 0), 0);

    // Get portfolio snapshots for chart
    const snapshots = await base44.entities.PortfolioSnapshot.filter({ user_id: user.id }, '-snapshot_date', 12);

    return Response.json({ profile, totalInvested, totalReturns, snapshots });
  }

  // SAVE / UPDATE risk profile
  if (action === 'save_profile') {
    const { risk_level, auto_invest_enabled, auto_invest_percentage, monthly_surplus } = body;
    const allocation = RISK_ALLOCATIONS[risk_level] || RISK_ALLOCATIONS.moderate;

    const profiles = await base44.entities.RiskProfile.filter({ user_id: user.id });
    let profile;
    if (profiles[0]) {
      profile = await base44.entities.RiskProfile.update(profiles[0].id, {
        risk_level, auto_invest_enabled, auto_invest_percentage,
        monthly_surplus, allocation, last_rebalanced: new Date().toISOString(),
      });
    } else {
      profile = await base44.entities.RiskProfile.create({
        user_id: user.id, risk_level, auto_invest_enabled,
        auto_invest_percentage, monthly_surplus, allocation,
        last_rebalanced: new Date().toISOString(),
      });
    }
    return Response.json({ profile, allocation });
  }

  // AUTO-ALLOCATE surplus into pools
  if (action === 'auto_allocate') {
    const profiles = await base44.entities.RiskProfile.filter({ user_id: user.id });
    const profile = profiles[0];
    if (!profile || !profile.auto_invest_enabled) {
      return Response.json({ error: 'Auto-invest not enabled' }, { status: 400 });
    }

    const { monthly_surplus = 0, auto_invest_percentage = 20, risk_level = 'moderate' } = profile;
    const investAmount = (monthly_surplus * auto_invest_percentage) / 100;
    if (investAmount < 10000) return Response.json({ error: 'Surplus too low to invest', minimum: 10000 });

    // Find open pools matching risk
    const allPools = await base44.entities.InvestmentPool.filter({ status: 'open_for_funding' });
    const matchingPools = allPools.filter(p => {
      if (risk_level === 'conservative') return p.risk_level === 'low';
      if (risk_level === 'aggressive') return p.risk_level === 'high' || p.risk_level === 'medium';
      return true;
    });

    if (matchingPools.length === 0) return Response.json({ allocated: 0, message: 'No matching pools available' });

    // Distribute evenly across matching pools
    const perPool = Math.floor(investAmount / matchingPools.length);
    const investments = [];
    for (const pool of matchingPools.slice(0, 3)) {
      if (perPool >= (pool.min_investment_per_investor || 10000)) {
        const contrib = await base44.entities.InvestorContribution.create({
          user_id: user.id, investment_pool_id: pool.id,
          contribution_amount: perPool, status: 'active',
          invested_at: new Date().toISOString(),
          maturity_date: new Date(Date.now() + pool.loan_duration_months * 30 * 86400000).toISOString(),
        });
        await base44.entities.InvestmentPool.update(pool.id, {
          current_amount_raised: (pool.current_amount_raised || 0) + perPool,
        });
        investments.push(contrib);
      }
    }

    // Save snapshot
    const totalInvested = investments.reduce((s, c) => s + c.contribution_amount, 0);
    await base44.entities.PortfolioSnapshot.create({
      user_id: user.id,
      snapshot_date: new Date().toISOString().split('T')[0],
      total_value: totalInvested,
      total_invested: totalInvested,
      total_returns: 0,
      return_rate: RISK_EXPECTED_RETURNS[risk_level],
      allocation_breakdown: profile.allocation,
    });

    return Response.json({ allocated: totalInvested, investments_count: investments.length });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
});