/**
 * Rental Insurance Engine
 *
 * Triggered automatically by an entity automation whenever a new RentalAgreement is created.
 * Also supports manual invocation via action='underwrite_rental'.
 *
 * Logic:
 *   1. Load the device linked to the rental agreement.
 *   2. If device already has an active insurance policy → attach it to the rental, skip new underwriting.
 *   3. If device is uninsured → query InsuranceProduct for the most cost-effective product
 *      that covers the device type.
 *   4. Create an InsurancePolicy for the lender (device owner) covering the rental period.
 *   5. Calculate the total insurance premium for the rental duration and add it to the
 *      rental agreement's insurance cost fields.
 *   6. Notify the lender of the auto-allocated policy.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { action, event, data, rental_id } = body;

    // ── Entity automation trigger ─────────────────────────────────────────────
    // Called by the RentalAgreement 'create' entity automation
    if (event?.type === 'create' || action === 'underwrite_rental') {
      const rentalData = data || (rental_id ? await base44.asServiceRole.entities.RentalAgreement.filter({ id: rental_id }).then(r=>r[0]) : null);
      if (!rentalData) {
        return Response.json({ error: 'No rental data provided' }, { status: 400 });
      }
      const result = await underwriteRental(base44, rentalData);
      return Response.json(result);
    }

    // ── Manual bulk check (admin) ─────────────────────────────────────────────
    if (action === 'bulk_underwrite') {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Admin only' }, { status: 403 });
      }
      const activeRentals = await base44.asServiceRole.entities.RentalAgreement.filter({ status: 'Active' });
      const uninsured = activeRentals.filter(r => !r.insurance_bundled || !r.insurance_policy_id);
      const results = [];
      for (const rental of uninsured) {
        const res = await underwriteRental(base44, rental);
        results.push({ rental_id: rental.id, ...res });
      }
      return Response.json({ processed: results.length, results });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CORE UNDERWRITING LOGIC
// ─────────────────────────────────────────────────────────────────────────────

async function underwriteRental(base44, rental) {
  const { id: rentalId, device_id, lender_id, borrower_id, start_date, end_date, financing_type, total_rental_fee } = rental;

  if (!device_id || !lender_id) {
    return { skipped: true, reason: 'Missing device_id or lender_id' };
  }

  // ── 1. Load device ─────────────────────────────────────────────────────────
  const devices = await base44.asServiceRole.entities.Device.filter({ id: device_id });
  const device  = devices[0];
  if (!device) return { skipped: true, reason: 'Device not found' };

  // ── 2. Check if device already has an active insurance policy ───────────────
  if (device.insurance_status === 'Insured' && device.insurance_policy_id) {
    // Attach existing policy to rental agreement
    await base44.asServiceRole.entities.RentalAgreement.update(rentalId, {
      insurance_bundled:          true,
      insurance_policy_id:        device.insurance_policy_id,
      insurance_auto_allocated:   true,
    }).catch(() => null);
    return { success: true, action: 'existing_policy_attached', policy_id: device.insurance_policy_id };
  }

  if (device.insurance_status === 'Self-Insured') {
    // Owner opted out of platform insurance
    return { skipped: true, reason: 'Device is self-insured by owner' };
  }

  // ── 3. Find best insurance product ─────────────────────────────────────────
  const allProducts = await base44.asServiceRole.entities.InsuranceProduct.filter({ status: 'active' }).catch(() => []);
  if (!allProducts.length) return { skipped: true, reason: 'No active insurance products found' };

  // Filter products applicable to this device type, sort by lowest premium
  const deviceCategory = mapDeviceTypeToCategory(device.device_type);
  const eligible = allProducts
    .filter(p => {
      if (!p.covered_categories || !p.covered_categories.length) return true; // covers all
      return p.covered_categories.includes(deviceCategory) || p.covered_categories.includes('all');
    })
    .sort((a, b) => (a.monthly_premium || 0) - (b.monthly_premium || 0));

  const bestProduct = eligible[0];
  if (!bestProduct) return { skipped: true, reason: `No insurance product covers device type: ${device.device_type}` };

  // ── 4. Calculate premium for rental duration ────────────────────────────────
  const rentalDays    = calcRentalDays(start_date, end_date, financing_type);
  const monthlyPrem   = bestProduct.monthly_premium || 0;
  const dailyPrem     = monthlyPrem / 30;
  const totalPrem     = Math.ceil(dailyPrem * rentalDays);
  const policyRef     = `POL-${Date.now().toString(36).toUpperCase()}`;
  const policyEndDate = end_date || addDays(start_date, rentalDays);

  // ── 5. Create insurance policy ──────────────────────────────────────────────
  const newPolicy = await base44.asServiceRole.entities.InsurancePolicy.create({
    user_id:          lender_id,
    product_id:       bestProduct.id,
    policy_type:      bestProduct.name || 'Device Insurance',
    status:           'active',
    coverage_amount:  bestProduct.coverage_amount || 0,
    premium_amount:   monthlyPrem,
    start_date:       start_date,
    end_date:         policyEndDate,
    policy_ref:       policyRef,
    rental_id:        rentalId,
    device_id:        device_id,
    auto_allocated:   true,
    description:      `Auto-allocated for rental ${rental.rental_ref || rentalId}. Device: ${device.make} ${device.model}`,
  }).catch(() => null);

  if (!newPolicy) return { skipped: true, reason: 'Failed to create insurance policy' };

  // ── 6. Update device insurance status ──────────────────────────────────────
  await base44.asServiceRole.entities.Device.update(device_id, {
    insurance_status:    'Platform Allocated',
    insurance_policy_id: newPolicy.id,
    insurance_premium_monthly: monthlyPrem,
  }).catch(() => null);

  // ── 7. Update rental agreement with insurance cost ─────────────────────────
  const borrowerShare = Math.ceil(totalPrem * 0.5); // borrower shares 50% of premium
  const lenderShare   = totalPrem - borrowerShare;

  await base44.asServiceRole.entities.RentalAgreement.update(rentalId, {
    insurance_bundled:          true,
    insurance_policy_id:        newPolicy.id,
    insurance_premium_amount:   lenderShare,
    borrower_insurance_premium: borrowerShare,
    total_insurance_cost:       totalPrem,
    insurance_auto_allocated:   true,
    outstanding_balance:        (rental.outstanding_balance || rental.total_rental_fee || 0) + borrowerShare,
  }).catch(() => null);

  // ── 8. Notify lender ────────────────────────────────────────────────────────
  await base44.asServiceRole.entities.Notification.create({
    user_id: lender_id,
    title:   '✅ Device Auto-Insured',
    message: `Your ${device.make} ${device.model} has been automatically insured for rental ${rental.rental_ref || rentalId.slice(-6)}. Policy: ${policyRef}. Total premium: UGX ${totalPrem.toLocaleString()} (${rentalDays} days). Borrower covers 50%.`,
    is_read: false,
  }).catch(() => null);

  await base44.asServiceRole.entities.Notification.create({
    user_id: borrower_id,
    title:   '🛡️ Insurance Added to Rental',
    message: `Insurance has been added to your rental ${rental.rental_ref || rentalId.slice(-6)}. Your insurance contribution: UGX ${borrowerShare.toLocaleString()} covering the ${rentalDays}-day rental period.`,
    is_read: false,
  }).catch(() => null);

  // ── 9. Email lender ─────────────────────────────────────────────────────────
  const lenderUsers = await base44.asServiceRole.entities.User.list().then(u => u.find(x => x.id === lender_id)).catch(() => null);
  if (lenderUsers?.email) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to:      lenderUsers.email,
      subject: `Insurance Auto-Allocated — ${rental.rental_ref || rentalId.slice(-6)}`,
      body: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#006B3C;color:white;padding:24px;border-radius:8px 8px 0 0">
            <h2 style="margin:0">🛡️ Device Insurance Auto-Allocated</h2>
          </div>
          <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none">
            <p>Dear ${lenderUsers.full_name || 'Lender'},</p>
            <p>Your device <strong>${device.make} ${device.model}</strong> has been automatically enrolled in insurance coverage for the rental period.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:6px;color:#555">Policy Reference</td><td style="padding:6px;font-weight:bold">${policyRef}</td></tr>
              <tr style="background:#f9fafb"><td style="padding:6px;color:#555">Plan</td><td style="padding:6px;font-weight:bold">${bestProduct.name}</td></tr>
              <tr><td style="padding:6px;color:#555">Coverage</td><td style="padding:6px;font-weight:bold">UGX ${(bestProduct.coverage_amount||0).toLocaleString()}</td></tr>
              <tr style="background:#f9fafb"><td style="padding:6px;color:#555">Rental Period</td><td style="padding:6px;font-weight:bold">${rentalDays} days (${start_date} – ${policyEndDate})</td></tr>
              <tr><td style="padding:6px;color:#555">Total Premium</td><td style="padding:6px;font-weight:bold">UGX ${totalPrem.toLocaleString()}</td></tr>
              <tr style="background:#f9fafb"><td style="padding:6px;color:#555">Your Share (50%)</td><td style="padding:6px;font-weight:bold">UGX ${lenderShare.toLocaleString()}</td></tr>
              <tr><td style="padding:6px;color:#555">Borrower Share (50%)</td><td style="padding:6px;font-weight:bold">UGX ${borrowerShare.toLocaleString()}</td></tr>
            </table>
            <p style="font-size:12px;color:#888">Pipiya — Auto Insurance Engine</p>
          </div>
        </div>`,
    }).catch(() => null);
  }

  return {
    success: true,
    action:          'new_policy_created',
    policy_id:       newPolicy.id,
    policy_ref:      policyRef,
    product:         bestProduct.name,
    rental_days:     rentalDays,
    total_premium:   totalPrem,
    lender_share:    lenderShare,
    borrower_share:  borrowerShare,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function mapDeviceTypeToCategory(deviceType) {
  const map = {
    'Motorcycle': 'motor',
    'Car':        'motor',
    'Phone':      'electronics',
    'Laptop':     'electronics',
    'Solar Item': 'equipment',
    'Agro Input': 'equipment',
    'Fuel':       'equipment',
    'Other':      'other',
  };
  return map[deviceType] || 'other';
}

function calcRentalDays(startDate, endDate, financingType) {
  if (endDate && startDate) {
    const diff = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.ceil(diff));
  }
  if (financingType === 'Daily Hire')   return 1;
  if (financingType === 'Weekly Hire')  return 7;
  if (financingType === 'Monthly Hire') return 30;
  if (financingType === 'Hire Purchase') return 180;
  return 30; // default
}

function addDays(dateStr, days) {
  const d = new Date(dateStr || new Date());
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}