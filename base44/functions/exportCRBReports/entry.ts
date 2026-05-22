import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Simple CSV generator following BOU DVR v6.0 pipe-delimited format
// Each dataset: H header row + D data rows, pipe-delimited, double-quoted values

function q(val) {
  if (val === null || val === undefined || val === '') return '""';
  return `"${String(val).replace(/"/g, "'")}"`;
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return String(d).replace(/-/g, '').slice(0, 8);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function buildHeader(piCode, instName, fileId, versionNum = '8.00') {
  const today = new Date();
  const submissionDate = formatDate(today);
  const creationDate = formatDate(today);
  return `"H"|${q(piCode)}|${q(instName)}|${q(submissionDate)}|${q(versionNum)}|${q(creationDate)}|${q(fileId)}`;
}

// Shared identity/contact blocks (empty placeholders for user-filled fields)
const emptyII = () => ['','','','','','','','','','','',''].map(q).join('|');
const emptyGSCAFB = (surname = '', fore1 = '', gender = '', dob = '') =>
  [q(''),q(''),q(''),q(''),q(''),q(''),q(surname),q(fore1),q(''),q(''),q(gender),q(''),q(dob)].join('|');
const emptyEI = () => ['','','','','','',''].map(q).join('|');
const emptyPCI = (countryCode = 'UG') =>
  ['','','','','','','','','','',q(countryCode),'','','','','O','','','','','','','','','','','',''].join('|');
const emptySCI = (countryCode = 'UG') =>
  ['','','','','','','','','','',q(countryCode),'','','','','O','','','','','','','','','','','',''].join('|');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { report_type = 'CBA', loan_id = null } = body;

    // PI identification — use user email domain as institution identifier
    const piCode = 'PI001';
    const instName = 'MyFinApp Institution';
    const branchCode = '001';
    const today = formatDate(new Date());

    let csvContent = '';
    let filename = '';

    if (report_type === 'CBA') {
      // Credit Borrower Account
      filename = `${piCode}${today}CBA.csv`;
      csvContent = buildHeader(piCode, instName, 'CBA') + '\n';

      const loans = loan_id
        ? await base44.entities.LoanApplication.filter({ id: loan_id, user_id: user.id })
        : await base44.entities.LoanApplication.filter({ user_id: user.id });

      for (const loan of loans) {
        const statusMap = {
          submitted: 1, under_review: 2, approved: 5, active: 5,
          disbursed: 5, rejected: 6, closed: 4, defaulted: 1, draft: 1,
        };
        const riskMap = { A: 0, B: 1, C: 2, D: 3 };
        const creditStatus = statusMap[loan.status] ?? 1;
        const riskClass = riskMap[loan.risk_band] ?? 2;
        const clientNum = loan.user_id || user.id;
        const acctRef = loan.id?.slice(0, 30) || 'REF001';
        const accountDate = formatDate(loan.created_date || new Date());
        const maturityDate = loan.disbursed_at
          ? formatDate(new Date(new Date(loan.disbursed_at).setMonth(new Date(loan.disbursed_at).getMonth() + (loan.tenure_months || 1))))
          : today;
        const currency = 'UGX';
        const currentBalance = loan.outstanding_balance ?? loan.amount_requested ?? 0;
        const balIndicator = currentBalance > 0 ? 0 : 1;
        const restructured = loan.restructured ? 0 : 1;
        const loanPurposeCode = 10001; // General purpose
        const termMonths = (loan.tenure_months || 1) * 30;

        const row = [
          q('D'), q(piCode), q(branchCode), q(clientNum), q(0), // 0=individual
          q(acctRef), q(accountDate),
          q(loan.amount_requested || 0), q(''), // credit_amount, ugx_equiv
          q(''), q(''), q(''), // facility_amount, drawdown, drawdown_ugx
          q(6), // credit_account_type=6 (personal loan)
          q(''), q(accountDate), q(currency), q(1), // opening_balance_indicator
          q(maturityDate), q(0), q(0), // type_of_interest=fixed, calc_method=declining
          q(loan.interest_rate || 0), q(loan.interest_rate || 0),
          q(accountDate), q(0), q(''), q(''), // amortization=fixed, payment_freq, num_payments
          q(loan.monthly_installment || 0),
          q(currentBalance), q(''), q(balIndicator),
          q(''), q(''), // last_payment_date, last_payment_amount
          q(creditStatus), q(accountDate), q(riskClass),
          q(''), q(''), q(''), // arrears_date, days_arrears, balance_overdue
          q(restructured),
          q(''), q(''), q(''), q(''), // old_branch, old_acct, old_client, old_pi
          q(''), q(''), q(''), // closure_date, closure_reason, specific_provision
          q('Y'), q('Y'), // client_consent, client_advice
          q(termMonths), q(loanPurposeCode),
          q(''), q(0), q(0), // group_exposure, flag_group, flag_joint
          q(''), q(''), // mode_restructure, risk_criteria
          emptyII(), emptyGSCAFB(user.full_name?.split(' ').slice(1).join(' ') || '', user.full_name?.split(' ')[0] || '', '', ''),
          emptyEI(), emptyPCI(), emptySCI(),
        ].join('|');
        csvContent += row + '\n';
      }

    } else if (report_type === 'CAP') {
      // Credit Application
      filename = `${piCode}${today}CAP.csv`;
      csvContent = buildHeader(piCode, instName, 'CAP') + '\n';

      const loans = await base44.entities.LoanApplication.filter({ user_id: user.id });
      for (const loan of loans) {
        const appStatusMap = { draft: 2, submitted: 1, under_review: 3, approved: 4, rejected: 6, disbursed: 4, active: 4, closed: 5 };
        const appStatus = appStatusMap[loan.status] ?? 2;
        const appRef = loan.id?.slice(0, 30) || 'APP001';
        const clientNum = loan.user_id || user.id;
        const appDate = formatDate(loan.created_date || new Date());
        const statusChangeDate = formatDate(loan.updated_date || loan.created_date || new Date());
        const approvedAmt = loan.amount_approved || loan.amount_requested || 0;

        const row = [
          q('D'), q(piCode), q(branchCode), q(clientNum),
          q(appRef), q(0), // applicant_classification=individual
          q(appDate), q(loan.amount_requested || 0), q('UGX'),
          q(6), // loan product type
          q(appStatus), q(statusChangeDate),
          q(''), q(''), // duration, rejection_reason
          q('Y'), q(''), // consent, group_id
          q(approvedAmt), q('UGX'),
          emptyII(), emptyGSCAFB(user.full_name?.split(' ').slice(1).join(' ') || '', user.full_name?.split(' ')[0] || '', '', ''),
          emptyEI(), emptyPCI(), emptySCI(),
        ].join('|');
        csvContent += row + '\n';
      }

    } else if (report_type === 'FHR') {
      // Financial Health Report — exported as structured CSV (not a BOU template)
      filename = `FinancialHealthReport_${user.id}_${today}.csv`;
      const reports = await base44.entities.FinancialHealthReport.filter({ user_id: user.id });
      const latest = reports.sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at))[0];
      if (!latest) return Response.json({ error: 'No report found' }, { status: 404 });

      const headers = [
        'User ID','Overall Score','Grade','Credit Score',
        'Credit Pillar','Savings Pillar','Spending Pillar','Debt Pillar',
        'Total Savings','Active Loans','Overdue Repayments','On-Time Rate',
        'Total Expenses (30d)','Top Expense Category','AI Summary','Generated At'
      ];
      csvContent = headers.map(q).join(',') + '\n';
      csvContent += [
        latest.user_id, latest.overall_score, latest.grade, latest.credit_score,
        latest.credit_pillar_score, latest.savings_pillar_score, latest.spending_pillar_score, latest.debt_pillar_score,
        latest.total_savings, latest.active_loans, latest.overdue_repayments, latest.on_time_repayment_rate,
        latest.total_expenses_last30, latest.top_expense_category,
        (latest.ai_summary || '').replace(/,/g, ';'), latest.generated_at
      ].map(q).join(',') + '\n';

    } else if (report_type === 'BC') {
      // Bounced Cheques — placeholder (no data entity, return empty template)
      filename = `${piCode}${today}BC.csv`;
      csvContent = buildHeader(piCode, instName, 'BC') + '\n';
      // No bounced cheque data in this app — empty dataset with header only

    } else if (report_type === 'PIS') {
      filename = `${piCode}${today}PIS.csv`;
      csvContent = buildHeader(piCode, instName, 'PIS') + '\n';

    } else if (report_type === 'BS') {
      filename = `${piCode}${today}BS.csv`;
      csvContent = buildHeader(piCode, instName, 'BS') + '\n';

    } else if (report_type === 'CMC') {
      filename = `${piCode}${today}CMC.csv`;
      csvContent = buildHeader(piCode, instName, 'CMC') + '\n';

    } else if (report_type === 'CCG') {
      filename = `${piCode}${today}CCG.csv`;
      csvContent = buildHeader(piCode, instName, 'CCG') + '\n';

    } else if (report_type === 'FRA') {
      filename = `${piCode}${today}FRA.csv`;
      csvContent = buildHeader(piCode, instName, 'FRA') + '\n';

    } else if (report_type === 'PI') {
      filename = `${piCode}${today}PI.csv`;
      csvContent = buildHeader(piCode, instName, 'PI') + '\n';
      const row = [q('D'), q(piCode), q('MDI'), q(instName), q(today), q(''), emptyPCI()].join('|');
      csvContent += row + '\n';

    } else if (report_type === 'IB') {
      filename = `${piCode}${today}IB.csv`;
      csvContent = buildHeader(piCode, instName, 'IB') + '\n';
      const row = [q('D'), q(piCode), q(branchCode), q('Head Office'), q('B'), q(today), emptyPCI()].join('|');
      csvContent += row + '\n';
    }

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});