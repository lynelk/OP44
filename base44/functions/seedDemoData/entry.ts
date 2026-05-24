import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Seed Savings Pockets
    const pockets = await base44.entities.SavingsPocket.bulkCreate([
      {
        user_id: user.id,
        name: 'House Down Payment',
        goal_amount: 5000000,
        current_balance: 3500000,
        icon: '🏠',
        color: '#7BC943',
        auto_save_frequency: 'monthly',
        auto_save_amount: 50000,
        status: 'active',
      },
      {
        user_id: user.id,
        name: 'Car Maintenance Fund',
        goal_amount: 1500000,
        current_balance: 850000,
        icon: '🚗',
        color: '#F4B400',
        auto_save_frequency: 'weekly',
        auto_save_amount: 20000,
        status: 'active',
      },
      {
        user_id: user.id,
        name: 'Education Fund',
        goal_amount: 1000000,
        current_balance: 420000,
        icon: '📚',
        color: '#006B3C',
        auto_save_frequency: 'daily',
        auto_save_amount: 10000,
        status: 'active',
      },
      {
        user_id: user.id,
        name: 'Business Expansion',
        goal_amount: 15000000,
        current_balance: 8200000,
        icon: '💼',
        color: '#007a44',
        auto_save_frequency: 'monthly',
        auto_save_amount: 100000,
        status: 'active',
      },
    ]);

    // Seed Lender Investments
    const investments = await base44.entities.LenderInvestment.bulkCreate([
      {
        lender_id: user.id,
        loan_id: 'loan_001',
        amount_invested: 2500000,
        ownership_pct: 12.5,
        expected_return: 375000,
        actual_return_earned: 125000,
        status: 'active',
        investment_type: 'manual',
        lender_share_pct: 55,
        platform_share_pct: 30,
        reserve_share_pct: 15,
        maturity_date: '2027-05-24',
        description: 'Investment in small business loan portfolio',
      },
      {
        lender_id: user.id,
        loan_id: 'loan_002',
        amount_invested: 1500000,
        ownership_pct: 8.3,
        expected_return: 225000,
        actual_return_earned: 85000,
        status: 'active',
        investment_type: 'auto_pool',
        lender_share_pct: 55,
        platform_share_pct: 30,
        reserve_share_pct: 15,
        maturity_date: '2027-02-15',
        description: 'Agricultural equipment financing',
      },
      {
        lender_id: user.id,
        loan_id: 'loan_003',
        amount_invested: 5000000,
        ownership_pct: 20.0,
        expected_return: 750000,
        actual_return_earned: 210000,
        status: 'active',
        investment_type: 'manual',
        lender_share_pct: 55,
        platform_share_pct: 30,
        reserve_share_pct: 15,
        maturity_date: '2028-01-10',
        description: 'Real estate development loan',
      },
    ]);

    // Seed Insurance Policies
    const policies = await base44.entities.InsurancePolicy.bulkCreate([
      {
        user_id: user.id,
        product_id: 'vehicle_insurance',
        policy_number: 'POL-VEH-2026-001',
        status: 'active',
        coverage_amount: 25000000,
        premium_amount: 450000,
        premium_frequency: 'monthly',
        start_date: '2025-05-24',
        end_date: '2027-05-24',
        next_premium_date: '2026-06-24',
        asset_description: '2020 Toyota Fielder - Comprehensive coverage',
        asset_value: 25000000,
        total_premiums_paid: 5400000,
      },
      {
        user_id: user.id,
        product_id: 'property_insurance',
        policy_number: 'POL-PROP-2026-002',
        status: 'active',
        coverage_amount: 80000000,
        premium_amount: 1200000,
        premium_frequency: 'quarterly',
        start_date: '2025-08-15',
        end_date: '2027-08-15',
        next_premium_date: '2026-06-15',
        asset_description: 'Commercial property insurance for business premises',
        asset_value: 80000000,
        total_premiums_paid: 10800000,
      },
      {
        user_id: user.id,
        product_id: 'health_insurance',
        policy_number: 'POL-HEALTH-2026-003',
        status: 'active',
        coverage_amount: 50000000,
        premium_amount: 350000,
        premium_frequency: 'monthly',
        start_date: '2025-01-01',
        end_date: '2027-01-01',
        next_premium_date: '2026-06-01',
        asset_description: 'Personal health insurance - Family plan',
        total_premiums_paid: 5950000,
      },
    ]);

    return Response.json({
      success: true,
      pockets_created: pockets.length,
      investments_created: investments.length,
      policies_created: policies.length,
      total_investments_value: 9000000,
      total_savings: 12970000,
      total_premiums: 22150000,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});