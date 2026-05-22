/**
 * USSD Handler — Africa's Talking compatible
 *
 * Menu flow:
 *   Main Menu
 *     1. Account Balance
 *     2. Loan Services
 *        2.1 Loan Status
 *        2.2 Apply for Loan       → amount → tenure → confirm (1=Yes/2=No)
 *        2.3 Make Repayment       → show active loan → amount → confirm PIN
 *        2.4 Pre-Qualification    → instant AI pre-screen result
 *     3. Savings
 *        3.1 Savings Balance
 *        3.2 Deposit to Pocket    → select pocket → amount → confirm PIN
 *        3.3 Withdraw from Pocket → select pocket → amount → confirm PIN
 *     4. Mini Statement           → last 3 transactions
 *     0. Exit
 *
 * PIN confirmation: last 4 digits of phone number used as simple PIN
 * Transaction references: YYYYMMDD-RANDOM6
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

  // Look up user by phone number
  const users = await base44.asServiceRole.entities.User.list();
  const user  = users.find(u => (u.phone_number || '').replace(/\D/g, '') === phoneNumber.replace(/\D/g, ''));

  // Log session
  const sessions = await base44.asServiceRole.entities.USSDSession.filter({ session_id: sessionId });
  const existingSession = sessions[0];

  const levels = text === '' ? [] : text.split('*');
  const depth  = levels.length;

  let response    = '';
  let actionTaken = 'none';

  if (!user) {
    response = `END Welcome to OpFin.\nYour number (${phoneNumber}) is not registered.\nDownload the OpFin app to create an account.`;
  } else {
    response = await handleMenu(base44, user, levels, depth, phoneNumber);
    actionTaken = deriveAction(levels);
  }

  // Persist session
  const sessionData = {
    session_id:    sessionId,
    phone_number:  phoneNumber,
    user_id:       user?.id || null,
    network_code:  networkCode,
    service_code:  serviceCode,
    input:         text,
    current_menu:  levels[0] || 'main',
    response_text: response.replace(/^(CON|END) /, ''),
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

// ─── Menu Router ─────────────────────────────────────────────────────────────

async function handleMenu(base44, user, levels, depth, phoneNumber) {
  const [l1, l2, l3, l4, l5] = levels;

  if (depth === 0 || l1 === '') return mainMenuText(user);
  if (l1 === '0') return 'END Thank you for using OpFin. Goodbye!';

  // ── 1. Account Balance ────────────────────────────────────────────────────
  if (l1 === '1') return await getBalanceSummary(base44, user);

  // ── 2. Loan Services ──────────────────────────────────────────────────────
  if (l1 === '2') {
    if (depth === 1) return `CON Loan Services
1. Loan Status
2. Apply for Loan
3. Make Repayment
4. Pre-Qualification
0. Back`;

    if (l2 === '0') return mainMenuText(user);

    // 2.1 Loan Status
    if (l2 === '1') return await getLoanStatus(base44, user);

    // 2.2 Apply for Loan: amount → tenure → confirm
    if (l2 === '2') {
      if (depth === 2) return 'CON Enter loan amount (UGX):';
      if (depth === 3) return 'CON Enter repayment period (months):\ne.g. 1, 3, 6, 12';
      if (depth === 4) {
        const amt    = parseFloat(l3);
        const tenure = parseInt(l4);
        if (isNaN(amt) || amt <= 0)    return 'END Invalid amount. Please try again.';
        if (isNaN(tenure) || tenure <= 0) return 'END Invalid tenure. Please try again.';
        const rate = 0.18 / 12;
        const inst = Math.round((amt * rate * Math.pow(1 + rate, tenure)) / (Math.pow(1 + rate, tenure) - 1));
        return `CON Confirm Loan Application
Amount:    UGX ${fmt(amt)}
Tenure:    ${tenure} months
Installment: UGX ${fmt(inst)}/month
Total Repayable: UGX ${fmt(inst * tenure)}

1. Confirm
2. Cancel`;
      }
      if (depth === 5) {
        if (l5 === '2') return 'END Application cancelled.';
        if (l5 === '1') {
          const amt    = parseFloat(l3);
          const tenure = parseInt(l4);
          return await applyForLoan(base44, user, amt, tenure);
        }
        return 'END Invalid option.';
      }
    }

    // 2.3 Make Repayment: show active loan → enter amount → confirm PIN
    if (l2 === '3') {
      if (depth === 2) {
        const activeLoan = await getActiveLoan(base44, user);
        if (!activeLoan) return 'END You have no active loans to repay.';
        return `CON Active Loan Repayment
Outstanding: UGX ${fmt(activeLoan.outstanding_balance || activeLoan.amount_requested)}
Installment: UGX ${fmt(activeLoan.monthly_installment)}

Enter repayment amount (UGX):`;
      }
      if (depth === 3) {
        const amt = parseFloat(l3);
        if (isNaN(amt) || amt <= 0) return 'END Invalid amount entered.';
        return `CON Confirm Payment of UGX ${fmt(amt)}
Enter last 4 digits of your phone as PIN:`;
      }
      if (depth === 4) {
        const amt = parseFloat(l3);
        const pin = l4;
        const expectedPin = phoneNumber.replace(/\D/g, '').slice(-4);
        if (pin !== expectedPin) return 'END Incorrect PIN. Transaction cancelled.';
        return await makeRepayment(base44, user, amt);
      }
    }

    // 2.4 Pre-Qualification (AI-driven)
    if (l2 === '4') return await getPreQualification(base44, user);
  }

  // ── 3. Savings ────────────────────────────────────────────────────────────
  if (l1 === '3') {
    if (depth === 1) return `CON Savings
1. Savings Balance
2. Deposit to Pocket
3. Withdraw from Pocket
0. Back`;

    if (l2 === '0') return mainMenuText(user);

    const pockets = await base44.asServiceRole.entities.SavingsPocket.filter({ user_id: user.id });
    const active  = pockets.filter(p => p.status === 'active');

    // 3.1 Balance
    if (l2 === '1') {
      if (active.length === 0) return 'END No savings pockets yet. Create one in the OpFin app.';
      const total = active.reduce((s, p) => s + (p.current_balance || 0), 0);
      const lines = active.slice(0, 4).map((p, i) => `${i + 1}. ${p.name}: UGX ${fmt(p.current_balance)}`).join('\n');
      return `END Savings Summary
Total: UGX ${fmt(total)}
${lines}`;
    }

    // 3.2 Deposit: select pocket → amount → confirm PIN → process
    if (l2 === '2') {
      if (active.length === 0) return 'END No savings pockets found. Create one in the OpFin app.';
      if (depth === 2) {
        const menu = active.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} (UGX ${fmt(p.current_balance)})`).join('\n');
        return `CON Select pocket to deposit into:\n${menu}`;
      }
      if (depth === 3) return 'CON Enter deposit amount (UGX):';
      if (depth === 4) {
        const pocketIdx = parseInt(l3) - 1;
        const pocket    = active[pocketIdx];
        if (!pocket) return 'END Invalid pocket selection.';
        const amt = parseFloat(l4);
        if (isNaN(amt) || amt <= 0) return 'END Invalid amount.';
        return `CON Confirm Deposit of UGX ${fmt(amt)}
Into: ${pocket.name}
Enter last 4 digits of your phone as PIN:`;
      }
      if (depth === 5) {
        const pocketIdx = parseInt(l3) - 1;
        const pocket    = active[pocketIdx];
        if (!pocket) return 'END Invalid pocket.';
        const amt = parseFloat(l4);
        const pin = l5;
        const expectedPin = phoneNumber.replace(/\D/g, '').slice(-4);
        if (pin !== expectedPin) return 'END Incorrect PIN. Transaction cancelled.';
        return await depositSavings(base44, user, pocket, amt);
      }
    }

    // 3.3 Withdraw: select pocket → amount → confirm PIN → process
    if (l2 === '3') {
      if (active.length === 0) return 'END No savings pockets found.';
      if (depth === 2) {
        const menu = active.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} (UGX ${fmt(p.current_balance)})`).join('\n');
        return `CON Select pocket to withdraw from:\n${menu}`;
      }
      if (depth === 3) return 'CON Enter withdrawal amount (UGX):';
      if (depth === 4) {
        const pocketIdx = parseInt(l3) - 1;
        const pocket    = active[pocketIdx];
        if (!pocket) return 'END Invalid pocket.';
        const amt = parseFloat(l4);
        if (isNaN(amt) || amt <= 0) return 'END Invalid amount.';
        if (amt > (pocket.current_balance || 0)) return `END Insufficient balance. Available: UGX ${fmt(pocket.current_balance)}`;
        return `CON Confirm Withdrawal of UGX ${fmt(amt)}
From: ${pocket.name}
Enter last 4 digits of your phone as PIN:`;
      }
      if (depth === 5) {
        const pocketIdx = parseInt(l3) - 1;
        const pocket    = active[pocketIdx];
        if (!pocket) return 'END Invalid pocket.';
        const amt = parseFloat(l4);
        const pin = l5;
        const expectedPin = phoneNumber.replace(/\D/g, '').slice(-4);
        if (pin !== expectedPin) return 'END Incorrect PIN. Transaction cancelled.';
        if (amt > (pocket.current_balance || 0)) return `END Insufficient balance. Available: UGX ${fmt(pocket.current_balance)}`;
        return await withdrawSavings(base44, pocket, amt);
      }
    }
  }

  // ── 4. Mini Statement ─────────────────────────────────────────────────────
  if (l1 === '4') return await getMiniStatement(base44, user);

  return 'END Invalid option. Please try again.';
}

// ─── Transaction Handlers ────────────────────────────────────────────────────

async function getBalanceSummary(base44, user) {
  const [loans, pockets, scores] = await Promise.all([
    base44.asServiceRole.entities.LoanApplication.filter({ user_id: user.id }),
    base44.asServiceRole.entities.SavingsPocket.filter({ user_id: user.id }),
    base44.asServiceRole.entities.CreditScore.filter({ user_id: user.id }),
  ]);
  const activeLoan  = loans.find(l => ['active', 'disbursed'].includes(l.status));
  const totalSavings = pockets.filter(p => p.status === 'active').reduce((s, p) => s + (p.current_balance || 0), 0);
  const latestScore = scores.sort((a, b) => new Date(b.calculated_at) - new Date(a.calculated_at))[0];

  return `END Account Summary
Savings: UGX ${fmt(totalSavings)}
Active Loan: ${activeLoan ? `UGX ${fmt(activeLoan.outstanding_balance || activeLoan.amount_requested)}` : 'None'}
Credit Score: ${latestScore ? `${latestScore.score} (Band ${latestScore.risk_band})` : 'Not calculated'}
Pre-Approved Limit: ${latestScore?.max_loan_limit ? `UGX ${fmt(latestScore.max_loan_limit)}` : 'N/A'}`;
}

async function getLoanStatus(base44, user) {
  const loans = await base44.asServiceRole.entities.LoanApplication.filter({ user_id: user.id });
  const loan  = loans.find(l => ['active', 'disbursed', 'under_review', 'approved'].includes(l.status));
  if (!loan) return 'END No active loans. Select 2.2 to apply.';
  return `END Loan Status: ${loan.status.toUpperCase()}
Amount: UGX ${fmt(loan.amount_requested)}
Outstanding: UGX ${fmt(loan.outstanding_balance || loan.amount_approved || loan.amount_requested)}
Monthly: UGX ${fmt(loan.monthly_installment)}
Next Due: ${loan.next_repayment_date || 'TBD'}`;
}

async function getActiveLoan(base44, user) {
  const loans = await base44.asServiceRole.entities.LoanApplication.filter({ user_id: user.id });
  return loans.find(l => ['active', 'disbursed'].includes(l.status)) || null;
}

async function applyForLoan(base44, user, amount, tenure) {
  const rate   = 0.18 / 12;
  const inst   = Math.round((amount * rate * Math.pow(1 + rate, tenure)) / (Math.pow(1 + rate, tenure) - 1));
  const total  = inst * tenure;
  const ref    = txRef();

  await base44.asServiceRole.entities.LoanApplication.create({
    user_id:            user.id,
    amount_requested:   amount,
    tenure_months:      tenure,
    interest_rate:      18,
    monthly_installment: inst,
    total_repayable:    total,
    status:             'submitted',
    submitted_by_agent: true,
    description:        `USSD application. Ref: ${ref}`,
  });

  return `END Loan Application Submitted!
Ref: ${ref}
Amount: UGX ${fmt(amount)}
Tenure: ${tenure} months
Monthly: UGX ${fmt(inst)}
Total: UGX ${fmt(total)}
Status: Under Review.`;
}

async function makeRepayment(base44, user, amount) {
  const activeLoan = await getActiveLoan(base44, user);
  if (!activeLoan) return 'END No active loan found.';

  const today   = new Date().toISOString().split('T')[0];
  const ref     = txRef();
  const newBal  = Math.max(0, (activeLoan.outstanding_balance || activeLoan.amount_requested || 0) - amount);
  const isClosed = newBal <= 0;

  // Create repayment record
  await base44.asServiceRole.entities.Repayment.create({
    loan_id:          activeLoan.id,
    user_id:          user.id,
    amount:           amount,
    due_date:         today,
    paid_date:        today,
    status:           'paid',
    payment_method:   'mobile_money',
    transaction_ref:  ref,
    paid_by_agent:    true,
    description:      `USSD repayment. Ref: ${ref}`,
  });

  // Update loan balance immediately
  await base44.asServiceRole.entities.LoanApplication.update(activeLoan.id, {
    outstanding_balance: newBal,
    status:              isClosed ? 'closed' : 'active',
    last_repayment_date: today,
  });

  // Create notification
  await base44.asServiceRole.entities.Notification.create({
    user_id:  user.id,
    title:    'Loan Repayment Received',
    message:  `UGX ${fmt(amount)} received via USSD. Ref: ${ref}. Remaining: UGX ${fmt(newBal)}.`,
    type:     'payment',
    is_read:  false,
  }).catch(() => null);

  return `END Repayment Successful!
Ref: ${ref}
Amount Paid: UGX ${fmt(amount)}
Remaining: UGX ${fmt(newBal)}
${isClosed ? 'Loan fully repaid. Congratulations!' : 'Thank you for your payment.'}`;
}

async function depositSavings(base44, user, pocket, amount) {
  const newBalance  = (pocket.current_balance || 0) + amount;
  const goalMet     = newBalance >= (pocket.goal_amount || Infinity);
  const ref         = txRef();

  // Update pocket balance immediately
  await base44.asServiceRole.entities.SavingsPocket.update(pocket.id, {
    current_balance: newBalance,
    status:          goalMet ? 'completed' : 'active',
  });

  // Create expense record for savings (category: savings)
  await base44.asServiceRole.entities.Expense.create({
    user_id:        user.id,
    amount:         amount,
    category:       'savings',
    description:    `USSD deposit to ${pocket.name}. Ref: ${ref}`,
    date:           new Date().toISOString().split('T')[0],
    payment_method: 'mobile_money',
  }).catch(() => null);

  // Notify
  await base44.asServiceRole.entities.Notification.create({
    user_id: user.id,
    title:   'Savings Deposit Successful',
    message: `UGX ${fmt(amount)} deposited to ${pocket.name}. New balance: UGX ${fmt(newBalance)}.${goalMet ? ' Goal reached!' : ''}`,
    type:    'savings',
    is_read: false,
  }).catch(() => null);

  return `END Deposit Successful!
Ref: ${ref}
Pocket: ${pocket.name}
Deposited: UGX ${fmt(amount)}
New Balance: UGX ${fmt(newBalance)}
${goalMet ? `Goal of UGX ${fmt(pocket.goal_amount)} REACHED!` : `Goal: UGX ${fmt(pocket.goal_amount)}`}`;
}

async function withdrawSavings(base44, pocket, amount) {
  const newBalance = (pocket.current_balance || 0) - amount;
  const ref        = txRef();

  await base44.asServiceRole.entities.SavingsPocket.update(pocket.id, {
    current_balance: newBalance,
  });

  return `END Withdrawal Successful!
Ref: ${ref}
Pocket: ${pocket.name}
Withdrawn: UGX ${fmt(amount)}
Remaining: UGX ${fmt(newBalance)}`;
}

async function getMiniStatement(base44, user) {
  const [repayments, expenses] = await Promise.all([
    base44.asServiceRole.entities.Repayment.filter({ user_id: user.id }),
    base44.asServiceRole.entities.Expense.filter({ user_id: user.id }),
  ]);

  // Last 3 repayments
  const latestRepayments = repayments
    .filter(r => r.status === 'paid')
    .sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date))
    .slice(0, 3)
    .map(r => `- UGX ${fmt(r.amount)} loan repayment (${r.paid_date})`);

  // Last 2 savings deposits
  const savingsExpenses = expenses
    .filter(e => e.category === 'savings')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 2)
    .map(e => `- UGX ${fmt(e.amount)} savings (${e.date})`);

  const lines = [...latestRepayments, ...savingsExpenses];
  if (lines.length === 0) return 'END No recent transactions found.';

  return `END Mini Statement
${lines.join('\n')}

For full history, view the OpFin app.`;
}

async function getPreQualification(base44, user) {
  // Fetch latest credit score for quick result
  const scores = await base44.asServiceRole.entities.CreditScore.filter({ user_id: user.id });
  const latest = scores.sort((a, b) => new Date(b.calculated_at) - new Date(a.calculated_at))[0];

  if (!latest) {
    return `END No credit profile found.
Open the OpFin app to run your financial health check and get pre-qualified.`;
  }

  const healthReports = await base44.asServiceRole.entities.FinancialHealthReport.filter({ user_id: user.id });
  const report = healthReports.sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at))[0];

  return `END Pre-Qualification Result
Credit Score: ${latest.score}
Risk Band: ${latest.risk_band}
Pre-Approved Limit: UGX ${fmt(latest.max_loan_limit || 0)}
${report ? `Health Score: ${report.overall_score}/100 (${report.grade})` : ''}

Apply in the OpFin app or dial back and select Loan Services.`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  if (!n && n !== 0) return '0';
  return Number(n).toLocaleString('en-UG');
}

function txRef() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${date}-${rand}`;
}

function mainMenuText(user) {
  return `CON Welcome to OpFin, ${user.full_name?.split(' ')[0] || 'User'}
1. Account Balance
2. Loan Services
3. Savings
4. Mini Statement
0. Exit`;
}

function deriveAction(levels) {
  const [l1, l2] = levels;
  if (l1 === '1') return 'balance_check';
  if (l1 === '4') return 'mini_statement';
  if (l1 === '2') {
    if (l2 === '1') return 'loan_status';
    if (l2 === '2') return 'loan_application';
    if (l2 === '3') return 'repayment';
    if (l2 === '4') return 'pre_qualification';
  }
  if (l1 === '3') {
    if (l2 === '1') return 'savings_balance';
    if (l2 === '2') return 'savings_deposit';
    if (l2 === '3') return 'savings_withdrawal';
  }
  return 'none';
}