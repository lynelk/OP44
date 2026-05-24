import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'submit_for_verification') {
      // Lender submits device for admin review
      const { device_id } = body;
      const device = await base44.entities.Device.filter({ id: device_id });
      if (!device.length) return Response.json({ error: 'Device not found' }, { status: 404 });
      if (device[0].lender_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

      await base44.entities.Device.update(device_id, {
        admin_verification_status: 'Pending',
        is_listed_on_marketplace: false
      });

      // Notify admins
      await base44.asServiceRole.entities.Notification.create({
        user_id: 'admin',
        title: 'New Device Submitted for Verification',
        message: `A ${device[0].device_type} (${device[0].make} ${device[0].model}) has been submitted for verification.`,
        is_read: false
      }).catch(() => null);

      return Response.json({ success: true, message: 'Device submitted for verification' });
    }

    if (action === 'admin_review') {
      if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

      const { device_id, decision, notes, revision_fields } = body;
      // decision: 'Approved' | 'Rejected' | 'Needs Revision' | 'Under Review'
      const updateData = {
        admin_verification_status: decision,
        admin_verified_by: user.id,
        admin_verification_date: new Date().toISOString(),
        admin_verification_notes: notes || '',
        is_listed_on_marketplace: decision === 'Approved'
      };
      if (decision === 'Needs Revision') {
        updateData.revision_requested_fields = revision_fields || notes;
      }
      if (decision === 'Approved') {
        updateData.status = 'Available';
      }
      if (decision === 'Rejected') {
        updateData.status = 'Pending Verification';
        updateData.is_listed_on_marketplace = false;
      }

      await base44.asServiceRole.entities.Device.update(device_id, updateData);

      // Get device to notify lender
      const deviceRec = await base44.asServiceRole.entities.Device.filter({ id: device_id });
      if (deviceRec.length) {
        const msgMap = {
          'Approved': '✅ Your device has been approved and is now live on the marketplace!',
          'Rejected': `❌ Your device verification was rejected. Reason: ${notes}`,
          'Needs Revision': `📝 Your device submission needs revision: ${revision_fields || notes}`,
          'Under Review': '🔍 Your device is now under admin review.'
        };
        await base44.asServiceRole.entities.Notification.create({
          user_id: deviceRec[0].lender_id,
          title: `Device Verification: ${decision}`,
          message: msgMap[decision] || `Status updated to: ${decision}`,
          is_read: false
        }).catch(() => null);
      }

      return Response.json({ success: true, decision });
    }

    if (action === 'get_queue') {
      if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
      const pending = await base44.asServiceRole.entities.Device.filter({ admin_verification_status: 'Pending' });
      const underReview = await base44.asServiceRole.entities.Device.filter({ admin_verification_status: 'Under Review' });
      const needsRevision = await base44.asServiceRole.entities.Device.filter({ admin_verification_status: 'Needs Revision' });
      return Response.json({ pending, underReview, needsRevision });
    }

    if (action === 'get_signed_url') {
      // Get a signed URL for a private document
      const { file_uri } = body;
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
      return Response.json({ signed_url });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});