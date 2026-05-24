import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a record in a hypothetical AccountDeletionRequest entity
    // or handle via admin notification
    await base44.entities.User.update(user.id, {
      account_deletion_requested: true,
      account_deletion_requested_at: new Date().toISOString(),
      status: 'deletion_pending'
    });

    // Optionally: Send notification to admin
    try {
      await base44.functions.invoke('sendSmartNotifications', {
        user_id: user.id,
        type: 'account_deletion_requested',
        message: `Account deletion requested by ${user.email}`
      });
    } catch (e) {
      // Notification service might not be available
      console.log('Admin notification skipped:', e.message);
    }

    return Response.json({ 
      success: true, 
      message: 'Account deletion request submitted successfully' 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});