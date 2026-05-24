import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all assets
    const [
      devices,
      savingsPockets,
      lenderInvestments,
      insurancePolicies,
      userAssets,
    ] = await Promise.all([
      base44.entities.Device.filter({ lender_id: user.id }),
      base44.entities.SavingsPocket.filter({ user_id: user.id }),
      base44.entities.LenderInvestment.filter({ lender_id: user.id }),
      base44.entities.InsurancePolicy.filter({ user_id: user.id }),
      base44.entities.UserAsset.filter({ user_id: user.id }),
    ]);

    // Fetch all liabilities
    const [
      loanApplications,
      p2pLoans,
      userLiabilities,
    ] = await Promise.all([
      base44.entities.LoanApplication.filter({ user_id: user.id }),
      base44.entities.P2PLoan.filter({ borrower_id: user.id }),
      base44.entities.UserLiability.filter({ user_id: user.id }),
    ]);

    // Calculate total assets
    const deviceValue = devices.reduce((sum, d) => {
      // Use device value based on condition and age
      return sum + (d.daily_rate ? d.daily_rate * 365 : 0); // Rough estimate
    }, 0);

    const savingsValue = savingsPockets.reduce((sum, p) => sum + (p.current_balance || 0), 0);
    const investmentValue = lenderInvestments.reduce((sum, i) => sum + (i.amount_invested || 0), 0);
    const insuranceValue = insurancePolicies.reduce((sum, p) => sum + (p.total_premiums_paid || 0), 0);
    const externalAssetValue = userAssets.reduce((sum, a) => sum + (a.current_value || 0), 0);

    const totalAssets = deviceValue + savingsValue + investmentValue + insuranceValue + externalAssetValue;

    // Calculate total liabilities
    const loanBalance = loanApplications.reduce((sum, l) => sum + (l.outstanding_balance || 0), 0);
    const p2pBalance = p2pLoans.reduce((sum, l) => sum + (l.outstanding_balance || 0), 0);
    const externalLiabilityValue = userLiabilities.reduce((sum, l) => sum + (l.outstanding_balance || 0), 0);

    const totalLiabilities = loanBalance + p2pBalance + externalLiabilityValue;

    // Calculate net worth
    const netWorth = totalAssets - totalLiabilities;

    // Calculate verified vs unverified amounts
    const verifiedAssets = userAssets.filter(a => a.is_verified).reduce((sum, a) => sum + (a.current_value || 0), 0);
    const unverifiedAssets = userAssets.filter(a => !a.is_verified).reduce((sum, a) => sum + (a.current_value || 0), 0);
    const verifiedLiabilities = userLiabilities.filter(l => l.is_verified).reduce((sum, l) => sum + (l.outstanding_balance || 0), 0);
    const unverifiedLiabilities = userLiabilities.filter(l => !l.is_verified).reduce((sum, l) => sum + (l.outstanding_balance || 0), 0);

    // Asset breakdown by type
    const assetBreakdown = {
      devices: deviceValue,
      savings: savingsValue,
      investments: investmentValue,
      insurance: insuranceValue,
      external_assets: externalAssetValue,
    };

    const liabilityBreakdown = {
      loans: loanBalance,
      p2p_loans: p2pBalance,
      external_liabilities: externalLiabilityValue,
    };

    return Response.json({
      netWorth,
      totalAssets,
      totalLiabilities,
      verifiedAssets,
      unverifiedAssets,
      verifiedLiabilities,
      unverifiedLiabilities,
      assetBreakdown,
      liabilityBreakdown,
      assetCount: {
        devices: devices.length,
        savings: savingsPockets.length,
        investments: lenderInvestments.length,
        insurance: insurancePolicies.length,
        external_assets: userAssets.length,
      },
      liabilityCount: {
        loans: loanApplications.filter(l => ['active', 'disbursed'].includes(l.status)).length,
        p2p_loans: p2pLoans.filter(l => ['active', 'disbursed'].includes(l.status)).length,
        external_liabilities: userLiabilities.length,
      },
    });
  } catch (error) {
    console.error('Error calculating net worth:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});