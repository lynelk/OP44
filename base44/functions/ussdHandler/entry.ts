/**
 * USSD Handler — Pipiya / Africa's Talking compatible
 *
 * MAIN MENU
 *   1. My Account         → balance summary + credit score
 *   2. Loan Services      → status / apply / repay / pre-qualify / reschedule
 *   3. Savings            → balance / deposit / withdraw
 *   4. Rental Services    → active rental status / make rental payment / GPS location
 *   5. Insurance          → policy status / enroll / file claim
 *   6. P2P Services       → my investments / available loans / fund a loan
 *   7. Mini Statement     → last 5 transactions
 *   0. Exit
 *
 * PIN: last 4 digits of the caller's phone number (simple but consistent)
 * Refs: YYYYMMDD-RANDOM6
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const contentType = req.headers.get('content-type') || '';
  let params = {};

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const body = await req.text();
    for (const pair of body.split('&')) {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  } else {
    params = await req.json().catch(() => ({}));
  }

  const sessionId   = params.sessionId   || params.session_id   || '';
  const phoneNumber = params.phoneNumber  || params.phone_number || '';
  const networkCode = params.networkCode  || params.network_code || '';
  const serviceCode = params.serviceCode  || params.service_code || '';
  const text        = params.text         || '';

  if (!sessionId || !phoneNumber) {
    return new Response('END Invalid request.', { headers: { 'Content-Type': 'text/plain' } });
  }

  const base44 = createClientFromRequest(req);

  // ── Resolve user by phone number ──────────────────────────────────────────
  const allUsers = await base44.asServiceRole.entities.User.list();
  const user = allUsers.find(u =>
    (u.phone_number || '').replace(/\D/g, '') === phoneNumber.replace(/\D/g, '')
  );

  // ── Log / update session ──────────────────────────────────────────────────
  const sessions = await base44.asServiceRole.entities.USSDSession.filter({ session_id: sessionId });
  const existingSession = sessions[0];

  const levels = text === '' ? [] : text.split('*');
  const depth  = levels.length;

  let response    = '';
  let actionTaken = 'none';

  if (!user) {
    response = `END Welcome to Pipiya.\nYour number (${phoneNumber}) is not registered.\nDownload the Pipiya app to get started.`;
  } else {
    response = await handleMenu(base44, user, levels, depth, phoneNumber);
    actionTaken = deriveAction(levels);
  }

  const sessionData = {
    session_id:    sessionId,
    phone_number:  phoneNumber,
    user_id:       user?.id || null,
    network_code:  networkCode,
    service_code:  serviceCode,
    input:         text,
    current_menu:  levels[0] || 'main',
    response_text: response.replace(/^(CON|END) /, '').slice(0, 500),
    status:        response.startsWith('END') ? 'completed' : 'active',
    steps:         depth,
    action_taken:  actionTaken,
    gateway:       'africas_talking',
  };

  if (existingSession) {
    await base44.asServiceRole.entities.USSDSession.update(existingSession.id, sessionData);
  } else {
    await base44.asServiceRole.entities.USSDSession.create(sessionData);
  }

  return new Response(response, { headers: { 'Content-Type': 'text/plain' } });
});

// ─────────────────────────────────────────────────────────────────────────────
// MENU ROUTER
// ─────────────────────────────────────────────────────────────────────────────

async function handleMenu(base44, user, levels, depth, phoneNumber) {
  const [l1, l2, l3, l4, l5, l6] = levels;

  if (depth === 0 || l1 === '') return mainMenuText(user);
  if (l1 === '0') return 'END Thank you for using Pipiya. Goodbye!';

  // ── 1. My Account ──────────────────────────────────────────────────────────
  if (l1 === '1') return await getAccountSummary(base44, user);

  // ── 2. Loan Services ───────────────────────────────────────────────────────
  if (l1 === '2') return await loanMenu(base44, user, levels, depth, phoneNumber);

  // ── 3. Savings ─────────────────────────────────────────────────────────────
  if (l1 === '3') return await savingsMenu(base44, user, levels, depth, phoneNumber);

  // ── 4. Rental Services ─────────────────────────────────────────────────────
  if (l1 === '4') return await rentalMenu(base44, user, levels, depth, phoneNumber);

  // ── 5. Insurance ───────────────────────────────────────────────────────────
  if (l1 === '5') return await insuranceMenu(base44, user, levels, depth, phoneNumber);

  // ── 6. P2P Services ────────────────────────────────────────────────────────
  if (l1 === '6') return await p2pMenu(base44, user, levels, depth, phoneNumber);

  // ── 7. Mini Statement ──────────────────────────────────────────────────────
  if (l1 === '7') return await getMiniStatement(base44, user);

  return 'END Invalid option. Please try again.';
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOAN SERVICES
// ─────────────────────────────────────────────────────────────────────────────

async function loanMenu(base44, user, levels, depth, phoneNumber) {
  const [, l2, l3, l4, l5] = levels;

  if (depth === 1) return `CON Loan Services
1. Loan Status
2. Apply for Loan
3. Make Repayment
4. Pre-Qualification
5. Request Reschedule
0. Back`;

  if (l2 === '0') return mainMenuText(user);

  // 2.1 Status
  if (l2 === '1') return await getLoanStatus(base44, user);

  // 2.2 Apply: amount → tenure → confirm
  if (l2 === '2') {
    if (depth === 2) return 'CON Enter loan amount (UGX):\ne.g. 500000';
    if (depth === 3) return 'CON Enter repayment period (months):\ne.g. 1, 3, 6, 12';
    if (depth === 4) {
      const amt    = parseFloat(l3);
      const tenure = parseInt(l4);
      if (isNaN(amt) || amt < 50000) return 'END Minimum loan is UGX 50,000.';
      if (isNaN(tenure) || tenure < 1 || tenure > 24) return 'END Tenure must be 1–24 months.';
      const inst = calcInstallment(amt, tenure, 0.18);
      return `CON Confirm Loan Application
Amount:   UGX ${fmt(amt)}
Tenure:   ${tenure} months
Monthly:  UGX ${fmt(inst)}
Total:    UGX ${fmt(inst * tenure)}

1. Confirm  2. Cancel`;
    }
    if (depth === 5) {
      if (l5 === '2') return 'END Application cancelled.';
      if (l5 === '1') return await applyForLoan(base44, user, parseFloat(l3), parseInt(l4));
      return 'END Invalid option.';
    }
  }

  // 2.3 Repayment: show → amount → PIN
  if (l2 === '3') {
    const activeLoan = await getActiveLoan(base44, user);
    if (depth === 2) {
      if (!activeLoan) return 'END You have no active loans to repay.';
      return `CON Active Loan Repayment
Outstanding: UGX ${fmt(activeLoan.outstanding_balance || activeLoan.amount_requested)}
Monthly:     UGX ${fmt(activeLoan.monthly_installment)}

Enter repayment amount (UGX):`;
    }
    if (depth === 3) {
      const amt = parseFloat(l3);
      if (isNaN(amt) || amt <= 0) return 'END Invalid amount.';
      return `CON Confirm UGX ${fmt(amt)} repayment
Enter PIN (last 4 digits of phone):`;
    }
    if (depth === 4) {
      if (l4 !== phoneNumber.replace(/\D/g,'').slice(-4)) return 'END Incorrect PIN. Cancelled.';
      return await makeRepayment(base44, user, parseFloat(l3));
    }
  }

  // 2.4 Pre-qual
  if (l2 === '4') return await getPreQualification(base44, user);

  // 2.5 Reschedule request
  if (l2 === '5') {
    const activeLoan = await getActiveLoan(base44, user);
    if (depth === 2) {
      if (!activeLoan) return 'END No active loan found for rescheduling.';
      return `CON Loan Reschedule
Current outstanding: UGX ${fmt(activeLoan.outstanding_balance || 0)}
Current monthly:     UGX ${fmt(activeLoan.monthly_installment || 0)}

Enter requested new tenure (months):`;
    }
    if (depth === 3) {
      const newTenure = parseInt(l3);
      if (isNaN(newTenure) || newTenure < 1 || newTenure > 36) return 'END Invalid tenure (1-36 months).';
      if (!activeLoan) return 'END No active loan found.';
      const newInst = calcInstallment(activeLoan.outstanding_balance || 0, newTenure, 0.18);
      return `CON Proposed Reschedule:
New tenure:  ${newTenure} months
New monthly: UGX ${fmt(newInst)}

Enter reason (1=Financial hardship, 2=Medical, 3=Business loss, 4=Other):`;
    }
    if (depth === 4) {
      const reasonMap = { '1': 'Financial hardship', '2': 'Medical emergency', '3': 'Business loss', '4': 'Other' };
      const reason = reasonMap[l4];
      if (!reason) return 'END Invalid reason selected.';
      if (!activeLoan) return 'END No active loan found.';
      const newTenure = parseInt(l3);
      const newInst = calcInstallment(activeLoan.outstanding_balance || 0, newTenure, 0.18);
      await base44.asServiceRole.entities.LoanRescheduleRequest.create({
        loan_id: activeLoan.id,
        user_id: user.id,
        original_tenure_months: activeLoan.tenure_months || 0,
        original_monthly_installment: activeLoan.monthly_installment || 0,
        outstanding_balance: activeLoan.outstanding_balance || 0,
        requested_tenure_months: newTenure,
        proposed_monthly_installment: newInst,
        reason,
        description: 'Submitted via USSD',
        status: 'pending',
        requested_date: new Date().toISOString(),
      });
      return `END Reschedule Request Submitted!
New tenure: ${newTenure} months
New monthly: UGX ${fmt(newInst)}
Reason: ${reason}
Status: Pending admin review.`;
    }
  }

  return 'END Invalid loan option.';
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SAVINGS
// ─────────────────────────────────────────────────────────────────────────────

async function savingsMenu(base44, user, levels, depth, phoneNumber) {
  const [, l2, l3, l4, l5] = levels;

  if (depth === 1) return `CON Savings
1. Savings Balance
2. Deposit to Pocket
3. Withdraw from Pocket
0. Back`;

  if (l2 === '0') return mainMenuText(user);

  const pockets = await base44.asServiceRole.entities.SavingsPocket.filter({ user_id: user.id });
  const active  = pockets.filter(p => p.status === 'active');

  if (l2 === '1') {
    if (active.length === 0) return 'END No savings pockets found.\nCreate one in the Pipiya app.';
    const total = active.reduce((s, p) => s + (p.current_balance || 0), 0);
    const lines = active.slice(0, 4).map((p, i) => `${i+1}. ${p.name}: UGX ${fmt(p.current_balance)}`).join('\n');
    return `END Savings Summary
Total: UGX ${fmt(total)}
${lines}`;
  }

  if (l2 === '2') {
    if (active.length === 0) return 'END No savings pockets found. Create one in the Pipiya app.';
    if (depth === 2) {
      const menu = active.slice(0,5).map((p,i)=>`${i+1}. ${p.name} (UGX ${fmt(p.current_balance)})`).join('\n');
      return `CON Select pocket:\n${menu}`;
    }
    if (depth === 3) return 'CON Enter deposit amount (UGX):';
    if (depth === 4) {
      const pocket = active[parseInt(l3)-1];
      const amt    = parseFloat(l4);
      if (!pocket) return 'END Invalid selection.';
      if (isNaN(amt) || amt <= 0) return 'END Invalid amount.';
      return `CON Deposit UGX ${fmt(amt)} to\n${pocket.name}\n\nEnter PIN (last 4 digits):`;
    }
    if (depth === 5) {
      if (l5 !== phoneNumber.replace(/\D/g,'').slice(-4)) return 'END Incorrect PIN.';
      const pocket = active[parseInt(l3)-1];
      const amt    = parseFloat(l4);
      if (!pocket) return 'END Invalid pocket.';
      return await depositSavings(base44, user, pocket, amt);
    }
  }

  if (l2 === '3') {
    if (active.length === 0) return 'END No savings pockets found.';
    if (depth === 2) {
      const menu = active.slice(0,5).map((p,i)=>`${i+1}. ${p.name} (UGX ${fmt(p.current_balance)})`).join('\n');
      return `CON Select pocket to withdraw:\n${menu}`;
    }
    if (depth === 3) return 'CON Enter withdrawal amount (UGX):';
    if (depth === 4) {
      const pocket = active[parseInt(l3)-1];
      const amt    = parseFloat(l4);
      if (!pocket) return 'END Invalid selection.';
      if (isNaN(amt) || amt <= 0) return 'END Invalid amount.';
      if (amt > (pocket.current_balance || 0)) return `END Insufficient balance.\nAvailable: UGX ${fmt(pocket.current_balance)}`;
      return `CON Withdraw UGX ${fmt(amt)} from\n${pocket.name}\n\nEnter PIN (last 4 digits):`;
    }
    if (depth === 5) {
      if (l5 !== phoneNumber.replace(/\D/g,'').slice(-4)) return 'END Incorrect PIN.';
      const pocket = active[parseInt(l3)-1];
      const amt    = parseFloat(l4);
      if (!pocket) return 'END Invalid pocket.';
      return await withdrawSavings(base44, pocket, amt);
    }
  }

  return 'END Invalid savings option.';
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. RENTAL SERVICES
// ─────────────────────────────────────────────────────────────────────────────

async function rentalMenu(base44, user, levels, depth, phoneNumber) {
  const [, l2, l3, l4, l5] = levels;

  if (depth === 1) return `CON Rental Services
1. My Active Rentals
2. Make Rental Payment
3. Rental Balance Alert
4. GPS Device Location
0. Back`;

  if (l2 === '0') return mainMenuText(user);

  // Fetch active rentals for this borrower
  const rentals = await base44.asServiceRole.entities.RentalAgreement.filter({ borrower_id: user.id });
  const activeRentals = rentals.filter(r => r.status === 'Active' || r.status === 'Approved');

  // 4.1 Active Rental Status
  if (l2 === '1') {
    if (activeRentals.length === 0) return 'END No active rentals found.\nVisit the Pipiya app to rent a device.';
    const lines = activeRentals.slice(0,3).map((r, i) => {
      const schedule = r.payment_schedule || [];
      const overdue  = schedule.filter(s => s.status === 'Overdue').length;
      const next     = schedule.find(s => s.status === 'Scheduled' || s.status === 'Requested');
      return `${i+1}. ${r.rental_ref || r.id.slice(-6)}\n   Bal: UGX ${fmt(r.outstanding_balance)}\n   Due: ${next?.due_date || 'N/A'}${overdue>0?`\n   OVERDUE: ${overdue} installment(s)`:''}`;
    }).join('\n\n');
    return `END Active Rentals (${activeRentals.length}):\n${lines}`;
  }

  // 4.2 Make Rental Payment
  if (l2 === '2') {
    if (activeRentals.length === 0) return 'END No active rentals to pay.';
    if (depth === 2) {
      const menu = activeRentals.slice(0,5).map((r,i)=>`${i+1}. ${r.rental_ref||r.id.slice(-6)} (UGX ${fmt(r.outstanding_balance)})`).join('\n');
      return `CON Select rental to pay:\n${menu}`;
    }
    if (depth === 3) {
      const rental = activeRentals[parseInt(l3)-1];
      if (!rental) return 'END Invalid selection.';
      const schedule = rental.payment_schedule || [];
      const nextDue  = schedule.find(s => s.status === 'Scheduled' || s.status === 'Requested' || s.status === 'Overdue');
      return `CON ${rental.rental_ref || rental.id.slice(-6)}
Next due: UGX ${fmt(nextDue?.amount || rental.outstanding_balance)}
Total outstanding: UGX ${fmt(rental.outstanding_balance)}

Enter payment amount (UGX):`;
    }
    if (depth === 4) {
      const rental = activeRentals[parseInt(l3)-1];
      const amt    = parseFloat(l4);
      if (!rental) return 'END Invalid rental.';
      if (isNaN(amt) || amt <= 0) return 'END Invalid amount.';
      return `CON Confirm UGX ${fmt(amt)} for\n${rental.rental_ref||rental.id.slice(-6)}\n\nEnter PIN (last 4 digits):`;
    }
    if (depth === 5) {
      if (l5 !== phoneNumber.replace(/\D/g,'').slice(-4)) return 'END Incorrect PIN. Cancelled.';
      const rental = activeRentals[parseInt(l3)-1];
      const amt    = parseFloat(l4);
      if (!rental) return 'END Invalid rental.';
      return await makeRentalPayment(base44, user, rental, amt);
    }
  }

  // 4.3 Balance Alert (current outstanding + overdue summary)
  if (l2 === '3') {
    if (activeRentals.length === 0) return 'END No active rentals.';
    const lines = activeRentals.slice(0,4).map(r => {
      const schedule = r.payment_schedule || [];
      const overdue  = schedule.filter(s => s.status === 'Overdue').reduce((sum,s)=>sum+(s.amount||0),0);
      const next     = schedule.find(s => s.status === 'Scheduled' || s.status === 'Requested');
      return `${r.rental_ref||r.id.slice(-6)}: UGX ${fmt(r.outstanding_balance)}${overdue>0?` (OVERDUE: UGX ${fmt(overdue)})`:''}${next?`\n  Next: UGX ${fmt(next.amount)} on ${next.due_date}`:''}`;
    }).join('\n\n');
    return `END Rental Balance Alert\n${lines}`;
  }

  // 4.4 GPS Location (last known)
  if (l2 === '4') {
    if (activeRentals.length === 0) return 'END No active rentals found.';
    if (depth === 2) {
      const menu = activeRentals.slice(0,5).map((r,i)=>`${i+1}. ${r.rental_ref||r.id.slice(-6)}`).join('\n');
      return `CON Select rental to track:\n${menu}`;
    }
    if (depth === 3) {
      const rental = activeRentals[parseInt(l3)-1];
      if (!rental) return 'END Invalid selection.';
      const trackers = await base44.asServiceRole.entities.GPSTracker.filter({ device_id: rental.device_id });
      const tracker  = trackers[0];
      if (!tracker || !tracker.last_location_lat) return 'END No GPS data available for this device.';
      const lastUpdated = tracker.last_updated_at ? new Date(tracker.last_updated_at).toLocaleString('en-UG', { timeZone: 'Africa/Kampala', dateStyle: 'short', timeStyle: 'short' }) : 'Unknown';
      const moving   = tracker.is_moving ? 'Moving' : 'Stationary';
      const battery  = tracker.battery_level_percent != null ? `${tracker.battery_level_percent}%` : 'N/A';
      return `END GPS: ${rental.rental_ref||rental.id.slice(-6)}
Lat: ${tracker.last_location_lat?.toFixed(4)}
Lon: ${tracker.last_location_lon?.toFixed(4)}
Status: ${moving}
Speed: ${tracker.current_speed_kph||0} km/h
Battery: ${battery}
Updated: ${lastUpdated}`;
    }
  }

  return 'END Invalid rental option.';
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. INSURANCE
// ─────────────────────────────────────────────────────────────────────────────

async function insuranceMenu(base44, user, levels, depth, phoneNumber) {
  const [, l2, l3, l4] = levels;

  if (depth === 1) return `CON Insurance
1. My Policies
2. Enroll for Insurance
3. File a Claim
0. Back`;

  if (l2 === '0') return mainMenuText(user);

  const policies = await base44.asServiceRole.entities.InsurancePolicy.filter({ user_id: user.id });

  // 5.1 My Policies
  if (l2 === '1') {
    const active = policies.filter(p => p.status === 'active');
    if (active.length === 0) return 'END No active insurance policies.\nDial back and select option 2 to enroll.';
    const lines = active.slice(0,4).map((p,i) => `${i+1}. ${p.policy_type||'Policy'}\n   Premium: UGX ${fmt(p.premium_amount)}/mo\n   Cover: UGX ${fmt(p.coverage_amount)}`).join('\n');
    return `END My Insurance (${active.length} active)\n${lines}`;
  }

  // 5.2 Enroll
  if (l2 === '2') {
    const products = await base44.asServiceRole.entities.InsuranceProduct.filter({ status: 'active' }).catch(() => []);
    if (depth === 2) {
      if (!products.length) return 'END No insurance products available.';
      const menu = products.slice(0,5).map((p,i)=>`${i+1}. ${p.name}\n   UGX ${fmt(p.monthly_premium)}/mo`).join('\n');
      return `CON Select Insurance Plan:\n${menu}`;
    }
    if (depth === 3) {
      const product = products[parseInt(l3)-1];
      if (!product) return 'END Invalid selection.';
      return `CON Enroll in ${product.name}?
Premium: UGX ${fmt(product.monthly_premium)}/mo
Cover:   UGX ${fmt(product.coverage_amount)}

1. Confirm  2. Cancel`;
    }
    if (depth === 4) {
      if (l4 === '2') return 'END Enrollment cancelled.';
      if (l4 === '1') {
        const product = products[parseInt(l3)-1];
        if (!product) return 'END Invalid product.';
        const ref = txRef();
        await base44.asServiceRole.entities.InsurancePolicy.create({
          user_id:         user.id,
          product_id:      product.id,
          policy_type:     product.name,
          status:          'active',
          coverage_amount: product.coverage_amount,
          premium_amount:  product.monthly_premium,
          start_date:      new Date().toISOString().split('T')[0],
          policy_ref:      ref,
        }).catch(() => null);
        return `END Enrolled Successfully!
Plan: ${product.name}
Premium: UGX ${fmt(product.monthly_premium)}/mo
Ref: ${ref}
Status: Active`;
      }
      return 'END Invalid option.';
    }
  }

  // 5.3 File a Claim
  if (l2 === '3') {
    const active = policies.filter(p => p.status === 'active');
    if (active.length === 0) return 'END No active policies to claim against.';
    if (depth === 2) {
      const menu = active.slice(0,5).map((p,i)=>`${i+1}. ${p.policy_type||'Policy'} (${p.policy_ref||p.id.slice(-6)})`).join('\n');
      return `CON Select policy to claim:\n${menu}`;
    }
    if (depth === 3) {
      const policy = active[parseInt(l3)-1];
      if (!policy) return 'END Invalid selection.';
      return `CON Claim for ${policy.policy_type}
Coverage: UGX ${fmt(policy.coverage_amount)}

Select claim type:
1. Device Damage
2. Theft/Loss
3. Accident
4. Other`;
    }
    if (depth === 4) {
      const typeMap = {'1':'Device Damage','2':'Theft/Loss','3':'Accident','4':'Other'};
      const claimType = typeMap[l4];
      if (!claimType) return 'END Invalid claim type.';
      const policy = active[parseInt(l3)-1];
      if (!policy) return 'END Invalid policy.';
      const ref = txRef();
      await base44.asServiceRole.entities.InsuranceClaim.create({
        policy_id:   policy.id,
        user_id:     user.id,
        claim_type:  claimType,
        claim_ref:   ref,
        status:      'submitted',
        description: `USSD claim - ${claimType}`,
        submitted_at: new Date().toISOString(),
      }).catch(() => null);
      return `END Claim Submitted!
Ref: ${ref}
Type: ${claimType}
Policy: ${policy.policy_ref||policy.id.slice(-6)}
Status: Under review.
We'll contact you within 48 hours.`;
    }
  }

  return 'END Invalid insurance option.';
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. P2P SERVICES
// ─────────────────────────────────────────────────────────────────────────────

async function p2pMenu(base44, user, levels, depth, phoneNumber) {
  const [, l2, l3, l4, l5] = levels;

  if (depth === 1) return `CON P2P Services
1. My Investments
2. Available Loans
3. Fund a Loan
4. My Borrower Status
0. Back`;

  if (l2 === '0') return mainMenuText(user);

  // 6.1 My Investments
  if (l2 === '1') {
    const investments = await base44.asServiceRole.entities.LenderInvestment.filter({ lender_id: user.id });
    const active = investments.filter(i => i.status === 'active');
    if (investments.length === 0) return 'END No P2P investments yet.\nUse Pipiya app to start investing.';
    const totalDeployed = investments.reduce((s,i)=>s+(i.amount_invested||0),0);
    const totalReturns  = investments.reduce((s,i)=>s+(i.actual_return_earned||0),0);
    return `END My P2P Investments
Active:   ${active.length}
Total Deployed: UGX ${fmt(totalDeployed)}
Returns Earned: UGX ${fmt(totalReturns)}
ROI: ${totalDeployed>0?((totalReturns/totalDeployed)*100).toFixed(1):'0'}%`;
  }

  // 6.2 Available Loans to fund
  if (l2 === '2') {
    const available = await base44.asServiceRole.entities.P2PLoan.filter({ status: 'awaiting_funding' });
    if (available.length === 0) return 'END No loans available for funding at this time.';
    const lines = available.slice(0,4).map((l,i)=>`${i+1}. UGX ${fmt(l.amount_approved)} - Band ${l.risk_band}\n   Rate: ${l.final_interest_rate?.toFixed(1)}%/mo, ${l.tenure_months}mo`).join('\n');
    return `END Available P2P Loans (${available.length}):\n${lines}\n\nDial back & select 6.3 to fund.`;
  }

  // 6.3 Fund a Loan
  if (l2 === '3') {
    const available = await base44.asServiceRole.entities.P2PLoan.filter({ status: 'awaiting_funding' });
    if (available.length === 0) return 'END No loans available to fund.';
    if (depth === 2) {
      const menu = available.slice(0,5).map((l,i)=>`${i+1}. UGX ${fmt(l.amount_approved)} Band ${l.risk_band} @${l.final_interest_rate?.toFixed(1)}%`).join('\n');
      return `CON Select loan to fund:\n${menu}`;
    }
    if (depth === 3) {
      const loan = available[parseInt(l3)-1];
      if (!loan) return 'END Invalid selection.';
      const remaining = (loan.amount_approved||0)-(loan.amount_funded||0);
      return `CON Fund Loan
Band: ${loan.risk_band}, Rate: ${loan.final_interest_rate?.toFixed(1)}%/mo
Remaining: UGX ${fmt(remaining)}
Max per investor: 40%

Enter amount to invest (UGX):`;
    }
    if (depth === 4) {
      const loan = available[parseInt(l3)-1];
      const amt  = parseFloat(l4);
      if (!loan) return 'END Invalid selection.';
      if (isNaN(amt) || amt <= 0) return 'END Invalid amount.';
      const max = (loan.amount_approved||0)*0.4;
      if (amt > max) return `END Max investment is UGX ${fmt(max)} (40% of loan).`;
      return `CON Invest UGX ${fmt(amt)} in Band ${loan.risk_band} loan?
Your return: 55% of interest
Enter PIN (last 4 digits):`;
    }
    if (depth === 5) {
      if (l5 !== phoneNumber.replace(/\D/g,'').slice(-4)) return 'END Incorrect PIN.';
      const loan = available[parseInt(l3)-1];
      const amt  = parseFloat(l4);
      if (!loan) return 'END Invalid loan.';
      return await fundP2PLoan(base44, user, loan, amt);
    }
  }

  // 6.4 My Borrower Status
  if (l2 === '4') {
    const p2pLoans = await base44.asServiceRole.entities.P2PLoan.filter({ user_id: user.id });
    const active   = p2pLoans.find(l => l.status === 'active' || l.status === 'disbursed');
    const pending  = p2pLoans.find(l => l.status === 'awaiting_funding' || l.status === 'pending');
    if (!active && !pending) return 'END No P2P loan applications.\nApply in the Pipiya app.';
    const loan = active || pending;
    const repayments = await base44.asServiceRole.entities.P2PRepayment.filter({ loan_id: loan.id });
    const totalPaid  = repayments.filter(r=>r.status==='paid').reduce((s,r)=>s+(r.amount||0),0);
    return `END P2P Loan Status
Ref: ${loan.id.slice(-8)}
Status: ${loan.status.toUpperCase()}
Amount: UGX ${fmt(loan.amount_approved||loan.amount_requested)}
Outstanding: UGX ${fmt(loan.outstanding_balance||0)}
Total Paid: UGX ${fmt(totalPaid)}
Rate: ${loan.final_interest_rate?.toFixed(1)||loan.interest_rate||'N/A'}%/mo`;
  }

  return 'END Invalid P2P option.';
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

async function getAccountSummary(base44, user) {
  const [loans, pockets, scores, rentals, investments] = await Promise.all([
    base44.asServiceRole.entities.LoanApplication.filter({ user_id: user.id }),
    base44.asServiceRole.entities.SavingsPocket.filter({ user_id: user.id }),
    base44.asServiceRole.entities.CreditScore.filter({ user_id: user.id }),
    base44.asServiceRole.entities.RentalAgreement.filter({ borrower_id: user.id }),
    base44.asServiceRole.entities.LenderInvestment.filter({ lender_id: user.id }),
  ]);
  const activeLoan    = loans.find(l => ['active','disbursed'].includes(l.status));
  const totalSavings  = pockets.filter(p=>p.status==='active').reduce((s,p)=>s+(p.current_balance||0),0);
  const latestScore   = scores.sort((a,b)=>new Date(b.calculated_at)-new Date(a.calculated_at))[0];
  const activeRentals = rentals.filter(r=>r.status==='Active').length;
  const totalInvested = investments.reduce((s,i)=>s+(i.amount_invested||0),0);

  return `END Account Summary - ${user.full_name?.split(' ')[0]}
Savings:   UGX ${fmt(totalSavings)}
Loan:      ${activeLoan?`UGX ${fmt(activeLoan.outstanding_balance||activeLoan.amount_requested)}`:'None'}
Rentals:   ${activeRentals} active
P2P Inv:   UGX ${fmt(totalInvested)}
Credit:    ${latestScore?`${latestScore.score} (Band ${latestScore.risk_band})`:'Not calculated'}
Limit:     ${latestScore?.max_loan_limit?`UGX ${fmt(latestScore.max_loan_limit)}`:'N/A'}`;
}

async function getLoanStatus(base44, user) {
  const loans = await base44.asServiceRole.entities.LoanApplication.filter({ user_id: user.id });
  const loan  = loans.find(l => ['active','disbursed','under_review','approved'].includes(l.status));
  if (!loan) return 'END No active loan. Dial back & select 2.2 to apply.';
  return `END Loan: ${loan.status.toUpperCase()}
Amount:      UGX ${fmt(loan.amount_requested)}
Outstanding: UGX ${fmt(loan.outstanding_balance||loan.amount_approved||loan.amount_requested)}
Monthly:     UGX ${fmt(loan.monthly_installment)}
Next Due:    ${loan.next_repayment_date||'TBD'}`;
}

async function getActiveLoan(base44, user) {
  const loans = await base44.asServiceRole.entities.LoanApplication.filter({ user_id: user.id });
  return loans.find(l => ['active','disbursed'].includes(l.status)) || null;
}

async function applyForLoan(base44, user, amount, tenure) {
  const inst  = calcInstallment(amount, tenure, 0.18);
  const total = inst * tenure;
  const ref   = txRef();
  await base44.asServiceRole.entities.LoanApplication.create({
    user_id:             user.id,
    amount_requested:    amount,
    tenure_months:       tenure,
    interest_rate:       18,
    monthly_installment: inst,
    total_repayable:     total,
    status:              'submitted',
    submitted_by_agent:  true,
    description:         `USSD application. Ref: ${ref}`,
  });
  return `END Loan Application Submitted!
Ref:     ${ref}
Amount:  UGX ${fmt(amount)}
Tenure:  ${tenure} months
Monthly: UGX ${fmt(inst)}
Total:   UGX ${fmt(total)}
Status:  Under Review`;
}

async function makeRepayment(base44, user, amount) {
  const activeLoan = await getActiveLoan(base44, user);
  if (!activeLoan) return 'END No active loan found.';
  const today  = new Date().toISOString().split('T')[0];
  const ref    = txRef();
  const newBal = Math.max(0, (activeLoan.outstanding_balance || activeLoan.amount_requested || 0) - amount);
  const closed = newBal <= 0;
  await Promise.all([
    base44.asServiceRole.entities.Repayment.create({ loan_id: activeLoan.id, user_id: user.id, amount, due_date: today, paid_date: today, status: 'paid', payment_method: 'mobile_money', transaction_ref: ref, paid_by_agent: true }),
    base44.asServiceRole.entities.LoanApplication.update(activeLoan.id, { outstanding_balance: newBal, status: closed ? 'closed' : 'active', last_repayment_date: today }),
    base44.asServiceRole.entities.Notification.create({ user_id: user.id, title: 'Loan Repayment Received', message: `UGX ${fmt(amount)} received via USSD. Ref: ${ref}. Remaining: UGX ${fmt(newBal)}.`, is_read: false }).catch(()=>null),
  ]);
  return `END Repayment Successful!
Ref:       ${ref}
Paid:      UGX ${fmt(amount)}
Remaining: UGX ${fmt(newBal)}
${closed?'Loan fully repaid. Congratulations!':'Thank you for your payment.'}`;
}

async function makeRentalPayment(base44, user, rental, amount) {
  const ref    = txRef();
  const newBal = Math.max(0, (rental.outstanding_balance || 0) - amount);
  const today  = new Date().toISOString().split('T')[0];

  // Update the first overdue/scheduled installment as Paid
  const schedule = rental.payment_schedule || [];
  const toPay = schedule.find(s => s.status === 'Overdue' || s.status === 'Requested' || s.status === 'Scheduled');
  if (toPay) {
    toPay.status       = 'Paid';
    toPay.paid_date    = today;
    toPay.transaction_ref = ref;
  }
  const nextScheduled = schedule.find(s => s.status === 'Scheduled');

  await Promise.all([
    base44.asServiceRole.entities.RentalPaymentTransaction.create({
      rental_agreement_id: rental.id,
      installment_id:      toPay?.installment_id || '',
      borrower_id:         user.id,
      lender_id:           rental.lender_id,
      amount,
      payment_method:      rental.payment_method || 'MTN Mobile Money',
      mobile_number:       user.phone_number || '',
      transaction_reference: ref,
      status:              'Successful',
      initiated_at:        new Date().toISOString(),
      completed_at:        new Date().toISOString(),
    }),
    base44.asServiceRole.entities.RentalAgreement.update(rental.id, {
      outstanding_balance: newBal,
      payment_schedule:    schedule,
      next_payment_due_date: nextScheduled?.due_date || null,
      last_payment_reminder_sent: new Date().toISOString(),
    }),
    base44.asServiceRole.entities.Notification.create({ user_id: rental.lender_id, title: 'Rental Payment Received', message: `UGX ${fmt(amount)} received via USSD for ${rental.rental_ref||rental.id.slice(-6)}. Ref: ${ref}.`, is_read: false }).catch(()=>null),
  ]);

  return `END Rental Payment Successful!
Ref:       ${ref}
Rental:    ${rental.rental_ref||rental.id.slice(-6)}
Paid:      UGX ${fmt(amount)}
Remaining: UGX ${fmt(newBal)}
${newBal<=0?'Rental fully settled!':'Thank you for your payment.'}`;
}

async function depositSavings(base44, user, pocket, amount) {
  const newBalance = (pocket.current_balance || 0) + amount;
  const goalMet    = newBalance >= (pocket.goal_amount || Infinity);
  const ref        = txRef();
  await Promise.all([
    base44.asServiceRole.entities.SavingsPocket.update(pocket.id, { current_balance: newBalance, status: goalMet ? 'completed' : 'active' }),
    base44.asServiceRole.entities.Expense.create({ user_id: user.id, amount, category: 'savings', description: `USSD deposit to ${pocket.name}. Ref: ${ref}`, date: new Date().toISOString().split('T')[0], payment_method: 'mobile_money' }).catch(()=>null),
    base44.asServiceRole.entities.Notification.create({ user_id: user.id, title: 'Savings Deposit', message: `UGX ${fmt(amount)} deposited to ${pocket.name}. New balance: UGX ${fmt(newBalance)}.${goalMet?' Goal reached!':''}`, is_read: false }).catch(()=>null),
  ]);
  return `END Deposit Successful!
Ref:     ${ref}
Pocket:  ${pocket.name}
Deposit: UGX ${fmt(amount)}
Balance: UGX ${fmt(newBalance)}
${goalMet?`Goal of UGX ${fmt(pocket.goal_amount)} REACHED!`:`Goal: UGX ${fmt(pocket.goal_amount)}`}`;
}

async function withdrawSavings(base44, pocket, amount) {
  const newBalance = (pocket.current_balance || 0) - amount;
  const ref        = txRef();
  await base44.asServiceRole.entities.SavingsPocket.update(pocket.id, { current_balance: newBalance });
  return `END Withdrawal Successful!
Ref:       ${ref}
Pocket:    ${pocket.name}
Withdrawn: UGX ${fmt(amount)}
Remaining: UGX ${fmt(newBalance)}`;
}

async function fundP2PLoan(base44, user, loan, amount) {
  const ref = txRef();
  const ownershipPct = (amount / loan.amount_approved) * 100;
  await Promise.all([
    base44.asServiceRole.entities.LenderInvestment.create({
      lender_id:       user.id,
      loan_id:         loan.id,
      amount_invested: amount,
      ownership_pct:   ownershipPct,
      status:          'active',
      invested_at:     new Date().toISOString(),
      transaction_ref: ref,
    }),
    base44.asServiceRole.entities.P2PLoan.update(loan.id, {
      amount_funded: (loan.amount_funded || 0) + amount,
    }),
    base44.asServiceRole.entities.Notification.create({ user_id: user.id, title: 'P2P Investment Confirmed', message: `UGX ${fmt(amount)} invested in Band ${loan.risk_band} loan. Ref: ${ref}. Ownership: ${ownershipPct.toFixed(1)}%.`, is_read: false }).catch(()=>null),
  ]);
  return `END P2P Investment Confirmed!
Ref:       ${ref}
Amount:    UGX ${fmt(amount)}
Band:      ${loan.risk_band}
Rate:      ${loan.final_interest_rate?.toFixed(1)}%/mo
Ownership: ${ownershipPct.toFixed(1)}%
Your share: 55% of interest earned`;
}

async function getMiniStatement(base44, user) {
  const [repayments, expenses, rentalTx] = await Promise.all([
    base44.asServiceRole.entities.Repayment.filter({ user_id: user.id }),
    base44.asServiceRole.entities.Expense.filter({ user_id: user.id }),
    base44.asServiceRole.entities.RentalPaymentTransaction.filter({ borrower_id: user.id }),
  ]);
  const loanLines = repayments.filter(r=>r.status==='paid').sort((a,b)=>new Date(b.paid_date)-new Date(a.paid_date)).slice(0,2).map(r=>`- UGX ${fmt(r.amount)} loan repayment (${r.paid_date?.slice(5)})`);
  const savLines  = expenses.filter(e=>e.category==='savings').sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,2).map(e=>`- UGX ${fmt(e.amount)} savings deposit (${e.date?.slice(5)})`);
  const rentLines = rentalTx.filter(t=>t.status==='Successful').sort((a,b)=>new Date(b.completed_at)-new Date(a.completed_at)).slice(0,2).map(t=>`- UGX ${fmt(t.amount)} rental payment (${t.completed_at?.slice(5,10)})`);
  const lines = [...loanLines, ...rentLines, ...savLines];
  if (lines.length === 0) return 'END No recent transactions found.';
  return `END Mini Statement
${lines.join('\n')}

Full history: Pipiya app`;
}

async function getPreQualification(base44, user) {
  const scores = await base44.asServiceRole.entities.CreditScore.filter({ user_id: user.id });
  const latest = scores.sort((a,b)=>new Date(b.calculated_at)-new Date(a.calculated_at))[0];
  if (!latest) return `END No credit profile found.\nOpen the Pipiya app to calculate your credit score.`;
  return `END Pre-Qualification
Score:   ${latest.score}
Band:    ${latest.risk_band}
Limit:   UGX ${fmt(latest.max_loan_limit||0)}
Status:  ${latest.score>=500?'Pre-Approved':'More info required'}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n) {
  if (!n && n !== 0) return '0';
  return Number(n).toLocaleString('en-UG');
}

function txRef() {
  const d    = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `${date}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
}

function calcInstallment(principal, tenure, annualRate) {
  const r = annualRate / 12;
  return Math.round((principal * r * Math.pow(1+r, tenure)) / (Math.pow(1+r, tenure) - 1));
}

function mainMenuText(user) {
  return `CON Welcome to Pipiya, ${user.full_name?.split(' ')[0]||'User'}
1. My Account
2. Loan Services
3. Savings
4. Rental Services
5. Insurance
6. P2P Services
7. Mini Statement
0. Exit`;
}

function deriveAction(levels) {
  const [l1, l2] = levels;
  if (l1==='1') return 'balance_check';
  if (l1==='7') return 'mini_statement';
  if (l1==='2') {
    if (l2==='1') return 'loan_status';
    if (l2==='2') return 'loan_application';
    if (l2==='3') return 'repayment';
    if (l2==='4') return 'pre_qualification';
    if (l2==='5') return 'loan_reschedule';
  }
  if (l1==='3') {
    if (l2==='1') return 'savings_balance';
    if (l2==='2') return 'savings_deposit';
    if (l2==='3') return 'savings_withdrawal';
  }
  if (l1==='4') return 'rental';
  if (l1==='5') return 'insurance';
  if (l1==='6') return 'p2p';
  return 'none';
}