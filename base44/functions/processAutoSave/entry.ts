import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// processAutoSave — scheduled job that fulfils the auto-save promise shown in the UI.
// Register this on a daily cron in the Base44 console. For each active SavingsPocket
// with an auto_save_frequency of daily/weekly/monthly, it credits auto_save_amount to
// the balance when the pocket is due, logs an AutoSaveLog entry, and stamps
// last_auto_save_at so the same period isn't double-credited.
//
// Idempotency: a pocket is only credited if its last_auto_save_at is older than the
// cadence window, so re-running the job the same day is a no-op.

const DAY_MS = 24 * 60 * 60 * 1000;
const CADENCE_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 30 };

function isDue(freq: string, lastAt: string | null | undefined, now: Date): boolean {
  const days = CADENCE_DAYS[freq];
  if (!days) return false;
  if (!lastAt) return true; // never auto-saved → due now
  return now.getTime() - new Date(lastAt).getTime() >= days * DAY_MS - DAY_MS / 2; // small slack
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    // Allow either an admin trigger or the platform scheduler (no user = cron).
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Pull all pockets that have an auto-save cadence configured.
    const pockets = await base44.asServiceRole.entities.SavingsPocket.list('-updated_date', 2000);
    const candidates = pockets.filter((p: any) =>
      p.status === 'active' &&
      p.auto_save_frequency && p.auto_save_frequency !== 'none' &&
      p.auto_save_amount > 0 &&
      isDue(p.auto_save_frequency, p.last_auto_save_at, now)
    );

    let credited = 0;
    let totalAmount = 0;

    await Promise.all(candidates.map(async (p: any) => {
      const amount = p.auto_save_amount;
      const newBalance = (p.current_balance || 0) + amount;
      try {
        await base44.asServiceRole.entities.SavingsPocket.update(p.id, {
          current_balance: newBalance,
          last_auto_save_at: now.toISOString(),
        });
        await base44.asServiceRole.entities.AutoSaveLog.create({
          user_id: p.user_id,
          pocket_id: p.id,
          amount,
          frequency: p.auto_save_frequency,
          balance_after: newBalance,
          executed_at: now.toISOString(),
          status: 'success',
        }).catch(() => null);

        // Notify the saver (best-effort, routed through the central dispatcher).
        await base44.asServiceRole.functions.invoke('dispatchNotification', {
          user_id: p.user_id,
          title: 'Auto-save successful',
          body: `UGX ${amount.toLocaleString()} moved to "${p.name}". New balance: UGX ${newBalance.toLocaleString()}.`,
          type: 'savings',
          priority: 'low',
          action_url: '/savings',
        }).catch(() => null);

        credited++;
        totalAmount += amount;
      } catch (e) {
        await base44.asServiceRole.entities.AutoSaveLog.create({
          user_id: p.user_id, pocket_id: p.id, amount,
          frequency: p.auto_save_frequency, executed_at: now.toISOString(),
          status: 'failed', error: String(e),
        }).catch(() => null);
      }
    }));

    return Response.json({
      success: true, date: today,
      pockets_scanned: pockets.length,
      pockets_credited: credited,
      total_amount: totalAmount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
