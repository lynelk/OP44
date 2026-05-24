import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { demographic_filter } = body; // { employment_status, district, gender, age_range }

    // Fetch current user's profile and latest credit score
    const [myProfiles, myScores, myPockets, allProfiles, allScores, allPockets] = await Promise.all([
      base44.entities.UserProfile.filter({ user_id: user.id }),
      base44.entities.CreditScore.filter({ user_id: user.id }),
      base44.entities.SavingsPocket.filter({ user_id: user.id }),
      base44.asServiceRole.entities.UserProfile.filter({}),
      base44.asServiceRole.entities.CreditScore.filter({}),
      base44.asServiceRole.entities.SavingsPocket.filter({}),
    ]);

    const myProfile = myProfiles[0] || {};
    const myLatestScore = myScores.sort((a, b) => new Date(b.calculated_at) - new Date(a.calculated_at))[0];
    const myTotalSavings = myPockets.filter(p => p.status === 'active').reduce((s, p) => s + (p.current_balance || 0), 0);
    const myIncome = myProfile.monthly_income || 0;
    const mySavingsRate = myIncome > 0 ? Math.round((myTotalSavings / myIncome) * 100) / 100 : 0;

    // Determine current user's demographic for auto-matching
    const filter = demographic_filter || {
      employment_status: myProfile.employment_status,
      district: myProfile.district,
    };

    // Build latest scores map per user
    const latestScoreMap = {};
    for (const s of allScores) {
      if (!latestScoreMap[s.user_id] || new Date(s.calculated_at) > new Date(latestScoreMap[s.user_id].calculated_at)) {
        latestScoreMap[s.user_id] = s;
      }
    }

    // Build savings per user map
    const savingsMap = {};
    for (const p of allPockets) {
      if (p.status === 'active') {
        savingsMap[p.user_id] = (savingsMap[p.user_id] || 0) + (p.current_balance || 0);
      }
    }

    // Filter profiles by demographic
    let filteredProfiles = allProfiles.filter(p => p.user_id !== user.id); // exclude self
    if (filter.employment_status) filteredProfiles = filteredProfiles.filter(p => p.employment_status === filter.employment_status);
    if (filter.district) filteredProfiles = filteredProfiles.filter(p => p.district === filter.district);
    if (filter.gender) filteredProfiles = filteredProfiles.filter(p => p.gender === filter.gender);

    // Compute peer credit scores
    const peerScores = filteredProfiles
      .map(p => latestScoreMap[p.user_id]?.score)
      .filter(s => s !== undefined && s > 0);

    // Compute peer savings rates
    const peerSavingsRates = filteredProfiles
      .map(p => {
        const income = p.monthly_income || 0;
        const savings = savingsMap[p.user_id] || 0;
        return income > 0 ? savings / income : null;
      })
      .filter(r => r !== null && r >= 0);

    const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const median = (arr) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const percentile = (arr, val) => {
      if (arr.length === 0) return 50;
      const below = arr.filter(v => v < val).length;
      return Math.round((below / arr.length) * 100);
    };

    const avgPeerScore = Math.round(avg(peerScores));
    const medianPeerScore = Math.round(median(peerScores));
    const myScoreValue = myLatestScore?.score || 0;
    const myScorePercentile = percentile(peerScores, myScoreValue);

    const avgPeerSavingsRate = Math.round(avg(peerSavingsRates) * 100) / 100;
    const medianPeerSavingsRate = Math.round(median(peerSavingsRates) * 100) / 100;
    const mySavingsRatePercentile = percentile(peerSavingsRates, mySavingsRate);

    // Compute score gap and tips context
    const scoreGap = avgPeerScore - myScoreValue;
    const savingsRateGap = avgPeerSavingsRate - mySavingsRate;

    // Fetch AI tips based on gaps
    let tips = [];
    try {
      const tipsRes = await base44.asServiceRole.functions.invoke('financialTipsGenerator', {
        context: {
          credit_score: myScoreValue,
          peer_avg_score: avgPeerScore,
          score_gap: scoreGap,
          savings_rate: mySavingsRate,
          peer_avg_savings_rate: avgPeerSavingsRate,
          savings_rate_gap: savingsRateGap,
          score_percentile: myScorePercentile,
          focus: 'benchmarking_gap'
        }
      });
      tips = tipsRes?.tips || [];
    } catch (_) {}

    return Response.json({
      my_metrics: {
        credit_score: myScoreValue,
        risk_band: myLatestScore?.risk_band || null,
        savings_rate: mySavingsRate,
        total_savings: myTotalSavings,
        monthly_income: myIncome,
        score_percentile: myScorePercentile,
        savings_rate_percentile: mySavingsRatePercentile,
      },
      peer_benchmarks: {
        sample_size: filteredProfiles.length,
        avg_credit_score: avgPeerScore,
        median_credit_score: medianPeerScore,
        avg_savings_rate: avgPeerSavingsRate,
        median_savings_rate: medianPeerSavingsRate,
      },
      gaps: {
        score_gap: scoreGap,
        savings_rate_gap: savingsRateGap,
      },
      filter_applied: filter,
      tips,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});