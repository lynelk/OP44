/**
 * USSD Handler — Africa's Talking compatible (also adaptable to generic gateways)
 *
 * Africa's Talking POST payload:
 *   sessionId, serviceCode, phoneNumber, networkCode, text
 *
 * Response format:
 *   "CON <message>"  → session continues (show menu)
 *   "END <message>"  → session ends
 *
 * Menu flow:
 *   Main Menu (text="")
 *     1. Account Balance
 *     2. Loan Services
 *        2.1 Loan Status
 *        2.2 Apply for Loan  → enter amount → enter tenure
 *        2.3 Make Repayment  → enter amount
 *     3. Savings
 *        3.1 Savings Balance
 *        3.2 Deposit to Savings → select pocket → enter amount
 *        3.3 Withdraw Savings   → select pocket → enter amount
 *     0. Exit
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  // Africa's Talking sends form-encoded POST
  const contentType = req.headers.get('content-type') || '';
  let params = {};

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const body = await req.text();
    for (const pair of body.split('&')) {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  } else {
    // Generic / JSON fallback
    params = await req.json().catch(() => ({}));
  }

  const sessionId   = params.sessionId   || params.session_id   || '';
  const phoneNumber = params.phoneNumber  || params.phone_number || '';
  const networkCode = params.networkCode  || params.network_code || '';
  const serviceCode = params.serviceCode  || params.service_code || '';
  const text        = params.text         || '';                         // full accumulated input

  if (!sessionId || !phoneNumber) {
    return new Response('END Invalid request', { headers: { 'Content-Type': 'text/plain' } });
  }

  const base44 = createClientFromRequest(req);

  // Look up user by phone number
  const users = await base44.asServiceRole.entities.User.list();
  const user = users.find(u => (u.phone_number || '').replace(/\D/g, '') === phoneNumber.replace(/\D/g, ''));

  // Log / update session
  const sessions = await base44.asServiceRole.entities.USSDSession.filter({ session_id: sessionId });
  const existingSession = sessions[0];

  const levels = text === '' ? [] : text.split('*');
  const depth  = levels.length; // 0 = main menu

  let response = '';
  let menuState = 'main';
  let actionTaken = 'none';
  let amount = null;

  if (!user) {
    // Phone not registered — offer registration hint
    response = `END Welcome to OpFin.\nYour number (${phoneNumber}) is not registered.\nDownload the OpFin app to create an account.`;
  } else {
    response = await handleMenu(base44, user, levels, depth);
    menuState = levels[0] || 'main';
    actionTaken = deriveAction(levels);
  }

  // Persist session
  const sessionData = {
    session_id: sessionId,
    phone_number: phoneNumber,
    user_id: user?.id || null,
    network_code: networkCode,
    service_code: serviceCode,
    input: text,
    current_menu: menuState,
    response_text: response.replace(/^(CON|END) /, ''),
    status: response.startsWith('END') ? 'completed' : 'active',
    steps: depth,
    action_taken: actionTaken,
    amount: amount,
    gateway: 'africas_talking',
  };

  if (existingSession) {
    await base44.asServiceRole.entities.USSDSession.update(existingSession.id, sessionData);
  } else {
    await base44.asServiceRole.entities.USSDSession.create(sessionData);
  }

  return new Response(response, {
    headers: { 'Content-Type': 'text/plain' },
  });
});

// ─── Menu Router ────────────────────────────────────────────────────────────

async function handleMenu(base44, user, levels, depth) {
  const l1 = levels[0];
  const l2 = levels[1];
  const l3 = levels[2];
  const l4 = levels[3];

  // ── Main Menu ──
  if (depth === 0 || l1 === '') {
    return `CON Welcome to OpFin, ${user.full_name?.split(' ')[0] || 'User'}
1. Account Balance
2. Loan Services
3. Savings
0. Exit`;
  }

  // ── Exit ──
  if (l1 === '0') {
    return 'END Thank you for using OpFin. Goodbye!';
  }

  // ── 1. Account Balance ──
  if (l1 === '1') {
    return await getBalanceSummary(base44, user);
  }

  // ── 2. Loan Services ──
  if (l1 === '2') {
    if (depth === 1) {
      return `CON Loan Services
1. Loan Status
2. Apply for Loan
3. Make Repayment
0. Back`;
    }
    if (l2 === '0') return await mainMenu(user);

    // 2.1 Loan Status
    if (l2 === '1') return await getLoanStatus(base44, user);

    // 2.2 Apply for Loan
    if (l2 === '2') {
      if (depth === 2) return 'CON Enter loan amount (UGX):';
      if (depth === 3) return 'CON Enter repayment period in months (e.g. 3, 6, 12):';
      if (depth === 4) {
        const loanAmt = parseFloat(l3);
        const tenure  = parseInt(l4);
        if (isNaN(loanAmt) || loanAmt <= 0) return 'END Invalid amount. Please try again.';
        if (isNaN(tenure)  || tenure  <= 0) return 'END Invalid tenure. Please try again.';
        return await applyForLoan(base44, user, loanAmt, tenure);
      }
    }

    // 2.3 Repayment
    if (l2 === '3') {
      if (depth === 2) {
        const activeLoan = await getActiveLoan(base44, user);
        if (!activeLoan) return 'END You have no active loans to repay.';
        return `CON Active Loan: UGX ${fmt(activeLoan.outstanding_balance)}\nInstallment: UGX ${fmt(activeLoan.monthly_installment)}\nEnter repayment amount (UGX):`;
      }
      if (depth === 3) {
        const amt = parseFloat(l3);
        if (isNaN(amt) || amt <= 0) return 'END Invalid amount entered.';
        return await makeRepayment(base44, user, amt);
      }
    }
  }

  // ── 3. Savings ──
  if (l1 === '3') {
    if (depth === 1) {
      return `CON Savings
1. Savings Balance
2. Deposit to Savings
3. Withdraw Savings
0. Back`;
    }
    if (l2 === '0') return await mainMenu(user);

    const pockets = await base44.asServiceRole.entities.SavingsPocket.filter({ user_id: user.id });
    const activePockets = pockets.filter(p => p.status === 'active');

    // 3.1 Savings Balance
    if (l2 === '1') {
      if (activePockets.length === 0) return 'END You have no savings pockets yet. Use the OpFin app to create one.';
      const total = activePockets.reduce((s, p) => s + (p.current_balance || 0), 0);
      const lines = activePockets.slice(0, 4).map((p, i) => `${i + 1}. ${p.name}: UGX ${fmt(p.current_balance)}`).join('\n');
      return `END Savings Summary\nTotal: UGX ${fmt(total)}\n${lines}`;
    }

    // 3.2 Deposit
    if (l2 === '2') {
      if (activePockets.length === 0) return 'END No savings pockets found. Create one in the OpFin app first.';
      if (depth === 2) {
        const menu = activePockets.slice(0, 5).map((p, i) => `${i + 1}. ${p.name}`).join('\n');
        return `CON Select savings pocket:\n${menu}`;
      }
      if (depth === 3) return 'CON Enter deposit amount (UGX):';
      if (depth === 4) {
        const pocketIdx = parseInt(l3) - 1;
        const pocket = activePockets[pocketIdx];
        if (!pocket) return 'END Invalid selection.';
        const amt = parseFloat(l4);
        if (isNaN(amt) || amt <= 0) return 'END Invalid amount.';
        return await depositSavings(base44, pocket, amt);
      }
    }

    // 3.3 Withdraw
    if (l2 === '3') {
      if (activePockets.length === 0) return 'END No savings pockets found.';
      if (depth === 2) {
        const menu = activePockets.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} (UGX ${fmt(p.current_balance)})`).join('\n');
        return `CON Select pocket to withdraw from:\n${menu}`;
      }
      if (depth === 3) return 'CON Enter withdrawal amount (UGX):';
      if (depth === 4) {
        const pocketIdx = parseInt(l3) - 1;
        const pocket = activePockets[pocketIdx];
        if (!pocket) return 'END Invalid selection.';
        const amt = parseFloat(l4);
        if (isNaN(amt) || amt <= 0) return 'END Invalid amount.';
        if (amt > (pocket.current_balance || 0)) return `END Insufficient balance. Available: UGX ${fmt(pocket.current_balance)}`;
        return await withdrawSavings(base44, pocket, amt);
      }
    }
  }

  return 'END Invalid option. Please try again.';
}

// ─── Action Handlers ─────────────────────────────────────────────────────────

async function getBalanceSummary(base44, user) {
  const [loans, pockets, creditScores] = await Promise.all([
    base44.asServiceRole.entities.LoanApplication.filter({ user_id: user.id }),
    base44.asServiceRole.entities.SavingsPocket.filter({ user_id: user.id }),
    base44.asServiceRole.entities.CreditScore.filter({ user_id: user.id }),
  ]);

  const activeLoan = loans.find(l => l.status === 'active' || l.status === 'disbursed');
  const totalSavings = pockets.filter(p => p.status === 'active').reduce((s, p) => s + (p.current_balance || 0), 0);
  const latestScore = creditScores.sort((a, b) => new Date(b.calculated_at) - new Date(a.calculated_at))[0];

  return `END Account Summary
Savings: UGX ${fmt(totalSavings)}
Active Loan: ${activeLoan ? `UGX ${fmt(activeLoan.outstanding_balance)}` : 'None'}
Credit Score: ${latestScore ? `${latestScore.score} (${latestScore.risk_band})` : 'Not calculated'}
Credit Limit: ${latestScore ? `UGX ${fmt(latestScore.max_loan_limit)}` : 'N/A'}`;
}

async function getLoanStatus(base44, user) {
  const loans = await base44.asServiceRole.entities.LoanApplication.filter({ user_id: user.id });
  const activeLoan = loans.find(l => ['active', 'disbursed', 'under_review', 'approved'].includes(l.status));

  if (!activeLoan) return 'END You have no active loans. Dial back and select Loan Services > Apply for Loan.';

  return `END Loan Status: ${activeLoan.status.toUpperCase()}
Amount: UGX ${fmt(activeLoan.amount_requested)}
Outstanding: UGX ${fmt(activeLoan.outstanding_balance || activeLoan.amount_approved || activeLoan.amount_requested)}
Monthly Installment: UGX ${fmt(activeLoan.monthly_installment)}
Next Payment: ${activeLoan.next_repayment_date || 'TBD'}`;
}

async function getActiveLoan(base44, user) {
  const loans = await base44.asServiceRole.entities.LoanApplication.filter({ user_id: user.id });
  return loans.find(l => l.status === 'active' || l.status === 'disbursed') || null;
}

async function applyForLoan(base44, user, amount, tenure) {
  const interest = 0.18; // 18% p.a.
  const monthlyRate = interest / 12;
  const installment = (amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1);
  const total = installment * tenure;

  await base44.asServiceRole.entities.LoanApplication.create({
    user_id: user.id,
    amount_requested: amount,
    tenure_months: tenure,
    interest_rate: interest * 100,
    monthly_installment: Math.round(installment),
    total_repayable: Math.round(total),
    status: 'submitted',
    submitted_by_agent: true,
  });

  return `END Loan Application Submitted!
Amount: UGX ${fmt(amount)}
Tenure: ${tenure} months
Est. Installment: UGX ${fmt(Math.round(installment))}/month
Total Repayable: UGX ${fmt(Math.round(total))}
Status: Under Review. You will be notified.`;
}

async function makeRepayment(base44, user, amount) {
  const activeLoan = await getActiveLoan(base44, user);
  if (!activeLoan) return 'END No active loan found.';

  const today = new Date().toISOString().split('T')[0];
  await base44.asServiceRole.entities.Repayment.create({
    loan_id: activeLoan.id,
    user_id: user.id,
    amount: amount,
    due_date: today,
    paid_date: today,
    status: 'paid',
    payment_method: 'mobile_money',
    paid_by_agent: true,
  });

  const newBalance = Math.max(0, (activeLoan.outstanding_balance || 0) - amount);
  await base44.asServiceRole.entities.LoanApplication.update(activeLoan.id, {
    outstanding_balance: newBalance,
    status: newBalance <= 0 ? 'closed' : 'active',
  });

  return `END Repayment Recorded!
Amount Paid: UGX ${fmt(amount)}
Remaining Balance: UGX ${fmt(newBalance)}
Thank you for your payment.`;
}

async function depositSavings(base44, pocket, amount) {
  const newBalance = (pocket.current_balance || 0) + amount;
  await base44.asServiceRole.entities.SavingsPocket.update(pocket.id, {
    current_balance: newBalance,
    status: newBalance >= pocket.goal_amount ? 'completed' : 'active',
  });

  return `END Deposit Successful!
Pocket: ${pocket.name}
Amount: UGX ${fmt(amount)}
New Balance: UGX ${fmt(newBalance)}
Goal: UGX ${fmt(pocket.goal_amount)}`;
}

async function withdrawSavings(base44, pocket, amount) {
  const newBalance = (pocket.current_balance || 0) - amount;
  await base44.asServiceRole.entities.SavingsPocket.update(pocket.id, { current_balance: newBalance });

  return `END Withdrawal Successful!
Pocket: ${pocket.name}
Amount: UGX ${fmt(amount)}
Remaining Balance: UGX ${fmt(newBalance)}`;
}

async function mainMenu(user) {
  return `CON Welcome to OpFin, ${user.full_name?.split(' ')[0] || 'User'}
1. Account Balance
2. Loan Services
3. Savings
0. Exit`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n) {
  if (!n && n !== 0) return '0';
  return Number(n).toLocaleString('en-UG');
}

function deriveAction(levels) {
  const l1 = levels[0];
  const l2 = levels[1];
  if (l1 === '1') return 'balance_check';
  if (l1 === '2') {
    if (l2 === '1') return 'loan_status';
    if (l2 === '2') return 'loan_application';
    if (l2 === '3') return 'repayment';
  }
  if (l1 === '3') {
    if (l2 === '1') return 'balance_check';
    if (l2 === '2') return 'savings_deposit';
    if (l2 === '3') return 'savings_withdrawal';
  }
  return 'none';
}