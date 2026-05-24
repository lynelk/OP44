import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'process_schedule';

    if (action === 'process_schedule') {
      // Admin/system-level: process all due payments
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      return await processSchedule(base44);
    }

    if (action === 'manual_trigger') {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      return await processSchedule(base44);
    }

    if (action === 'generate_schedule') {
      return await generateSchedule(base44, body);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generateSchedule(base44, body) {
  const { rental_id, start_date, end_date, total_fee, financing_type, payment_method } = body;
  if (!rental_id || !total_fee || !start_date) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const start = new Date(start_date);
  const end = end_date ? new Date(end_date) : null;
  const schedule = [];

  if (financing_type === 'Daily Hire') {
    const days = end ? Math.ceil((end - start) / (1000 * 60 * 60 * 24)) : 1;
    const dailyAmount = total_fee / days;
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      schedule.push({
        installment_id: `inst_${rental_id}_${i + 1}`,
        due_date: d.toISOString().split('T')[0],
        amount: Math.round(dailyAmount),
        status: 'Scheduled'
      });
    }
  } else if (financing_type === 'Weekly Hire') {
    const weeks = end ? Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 7)) : 1;
    const weeklyAmount = total_fee / weeks;
    for (let i = 0; i < weeks; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * 7);
      schedule.push({
        installment_id: `inst_${rental_id}_${i + 1}`,
        due_date: d.toISOString().split('T')[0],
        amount: Math.round(weeklyAmount),
        status: 'Scheduled'
      });
    }
  } else if (financing_type === 'Monthly Hire') {
    const months = end ? Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 30)) : 1;
    const monthlyAmount = total_fee / months;
    for (let i = 0; i < months; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      schedule.push({
        installment_id: `inst_${rental_id}_${i + 1}`,
        due_date: d.toISOString().split('T')[0],
        amount: Math.round(monthlyAmount),
        status: 'Scheduled'
      });
    }
  } else {
    // Hire Purchase / Outright: single or milestone based
    schedule.push({
      installment_id: `inst_${rental_id}_1`,
      due_date: start.toISOString().split('T')[0],
      amount: total_fee,
      status: 'Scheduled'
    });
  }

  await base44.asServiceRole.entities.RentalAgreement.update(rental_id, {
    payment_schedule: schedule,
    next_payment_due_date: schedule[0]?.due_date,
    outstanding_balance: total_fee
  });

  return Response.json({ success: true, schedule });
}

async function processSchedule(base44) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const activeRentals = await base44.asServiceRole.entities.RentalAgreement.filter({ status: 'Active' });
  let processed = 0, overdueFlagged = 0, paymentRequests = 0;

  for (const rental of activeRentals) {
    const schedule = rental.payment_schedule || [];
    let updated = false;
    let newOverdueCount = rental.overdue_count || 0;

    for (const item of schedule) {
      if (item.status !== 'Scheduled' && item.status !== 'Overdue') continue;
      const dueDate = new Date(item.due_date);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate <= today && item.status === 'Scheduled') {
        // Mark as overdue if past due date
        if (dueDate < today) {
          item.status = 'Overdue';
          newOverdueCount += 1;
          overdueFlagged++;
          updated = true;

          // Send overdue alert to both lender and borrower
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: rental.borrower_id,
            subject: `⚠️ Rental Payment Overdue - ${rental.rental_ref || rental.id}`,
            body: `Your rental payment of UGX ${item.amount?.toLocaleString()} was due on ${item.due_date}. Please make payment immediately to avoid further penalties.`
          }).catch(() => null);

          await base44.asServiceRole.entities.Notification.create({
            user_id: rental.borrower_id,
            title: 'Rental Payment Overdue',
            message: `Payment of UGX ${item.amount?.toLocaleString()} for your rental was due on ${item.due_date}.`,
            is_read: false
          }).catch(() => null);

          await base44.asServiceRole.entities.Notification.create({
            user_id: rental.lender_id,
            title: 'Borrower Payment Overdue',
            message: `A payment of UGX ${item.amount?.toLocaleString()} due on ${item.due_date} has not been received.`,
            is_read: false
          }).catch(() => null);

        } else if (dueDate.getTime() === today.getTime()) {
          // Due today — trigger payment request
          item.status = 'Requested';
          updated = true;
          paymentRequests++;

          await base44.asServiceRole.entities.RentalPaymentTransaction.create({
            rental_agreement_id: rental.id,
            installment_id: item.installment_id,
            borrower_id: rental.borrower_id,
            lender_id: rental.lender_id,
            amount: item.amount,
            payment_method: rental.payment_method || 'MTN Mobile Money',
            status: 'Pending',
            initiated_at: new Date().toISOString()
          }).catch(() => null);

          await base44.asServiceRole.entities.Notification.create({
            user_id: rental.borrower_id,
            title: 'Rental Payment Due Today',
            message: `Your rental payment of UGX ${item.amount?.toLocaleString()} is due today.`,
            is_read: false
          }).catch(() => null);
        }
      }
    }

    if (updated) {
      const nextScheduled = schedule.find(s => s.status === 'Scheduled');
      await base44.asServiceRole.entities.RentalAgreement.update(rental.id, {
        payment_schedule: schedule,
        overdue_count: newOverdueCount,
        next_payment_due_date: nextScheduled?.due_date || null,
        last_payment_reminder_sent: new Date().toISOString()
      });
      processed++;
    }
  }

  return Response.json({ success: true, processed, overdueFlagged, paymentRequests });
}