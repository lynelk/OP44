/**
 * Device Maintenance Engine
 * 
 * Automated maintenance tracking based on GPS data.
 * Calculates distance traveled, triggers service requests at thresholds,
 * notifies lenders, and updates device status.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Allow both admin-triggered and automation-triggered calls
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, device_id } = body;

    if (action === 'check_all_devices') {
      const result = await checkAllDevicesForMaintenance(base44);
      return Response.json(result);
    }

    if (action === 'check_device') {
      if (!device_id) {
        return Response.json({ error: 'device_id required' }, { status: 400 });
      }
      const result = await checkDeviceMaintenance(base44, device_id);
      return Response.json(result);
    }

    if (action === 'create_manual_request') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
      const result = await createMaintenanceRequest(base44, body);
      return Response.json(result);
    }

    if (action === 'update_request') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }
      const result = await updateMaintenanceRequest(base44, body);
      return Response.json(result);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function checkAllDevicesForMaintenance(base44) {
  const devices = await base44.asServiceRole.entities.Device.filter({ status: 'Available' });
  const results = [];
  
  for (const device of devices) {
    if (!device.has_gps_tracker || !device.gps_tracker_id) continue;
    
    const result = await checkDeviceMaintenance(base44, device.id);
    if (result.action_taken) {
      results.push(result);
    }
  }
  
  return {
    checked: devices.length,
    maintenance_created: results.length,
    results,
  };
}

async function checkDeviceMaintenance(base44, device_id) {
  const devices = await base44.asServiceRole.entities.Device.filter({ id: device_id });
  const device = devices[0];
  
  if (!device) {
    return { skipped: true, reason: 'Device not found' };
  }
  
  if (!device.has_gps_tracker || !device.gps_tracker_id) {
    return { skipped: true, reason: 'No GPS tracker' };
  }
  
  // Get GPS tracker
  const trackers = await base44.asServiceRole.entities.GPSTracker.filter({ device_id });
  const tracker = trackers[0];
  
  if (!tracker) {
    return { skipped: true, reason: 'No GPS tracker record' };
  }
  
  // Calculate total distance from location history
  const locationHistory = await base44.asServiceRole.entities.LocationHistory.filter({ 
    tracker_id: tracker.tracker_id_external || tracker.id 
  });
  
  // Calculate distance using Haversine formula
  let totalKm = 0;
  const sortedLocations = locationHistory.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  for (let i = 1; i < sortedLocations.length; i++) {
    const dist = haversineDistance(
      sortedLocations[i-1].latitude,
      sortedLocations[i-1].longitude,
      sortedLocations[i].latitude,
      sortedLocations[i].longitude
    );
    totalKm += dist;
  }
  
  // Update device total km
  await base44.asServiceRole.entities.Device.update(device_id, {
    total_km_traveled: Math.round(totalKm),
  });
  
  // Check if maintenance needed
  const serviceInterval = device.service_interval_km || 5000;
  const lastServiceKm = device.last_service_km_reading || 0;
  const kmSinceService = totalKm - lastServiceKm;
  
  if (kmSinceService >= serviceInterval) {
    // Create maintenance request
    const request = await createMaintenanceRequest(base44, {
      device_id,
      lender_id: device.lender_id,
      request_type: 'scheduled_service',
      trigger_reason: 'distance_threshold',
      current_km_reading: totalKm,
      last_service_km: lastServiceKm,
      km_since_last_service: kmSinceService,
      service_interval_km: serviceInterval,
      priority: kmSinceService > serviceInterval * 1.2 ? 'high' : 'medium',
    });
    
    // Update device status
    await base44.asServiceRole.entities.Device.update(device_id, {
      status: 'Under Maintenance',
      is_listed_on_marketplace: false,
    });
    
    // Notify lender
    const lenderUsers = await base44.asServiceRole.entities.User.filter({ id: device.lender_id });
    const lender = lenderUsers[0];
    
    if (lender?.email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: lender.email,
        subject: `🔧 Maintenance Required - ${device.make} ${device.model}`,
        body: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#006B3C;color:white;padding:24px;border-radius:8px 8px 0 0">
              <h2 style="margin:0">Scheduled Maintenance Due</h2>
            </div>
            <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none">
              <p>Dear ${lender.full_name || 'Lender'},</p>
              <p>Your <strong>${device.make} ${device.model}</strong> has reached its scheduled maintenance interval.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr><td style="padding:6px;color:#555">Service Interval</td><td style="padding:6px;font-weight:bold">${serviceInterval.toLocaleString()} km</td></tr>
                <tr style="background:#f9fafb"><td style="padding:6px;color:#555">Current Reading</td><td style="padding:6px;font-weight:bold">${totalKm.toLocaleString()} km</td></tr>
                <tr><td style="padding:6px;color:#555">Since Last Service</td><td style="padding:6px;font-weight:bold">${kmSinceService.toLocaleString()} km</td></tr>
              </table>
              <p>The device status has been updated to <strong>Under Maintenance</strong> and is temporarily unavailable for new rentals.</p>
              <p style="font-size:12px;color:#888">Pipiya — Automated Maintenance System</p>
            </div>
          </div>
        `,
      });
    }
    
    await base44.asServiceRole.entities.Notification.create({
      user_id: device.lender_id,
      title: '🔧 Maintenance Required',
      message: `Your ${device.make} ${device.model} needs scheduled service (${kmSinceService.toLocaleString()} km since last service). Device status set to Under Maintenance.`,
      is_read: false,
    });
    
    return {
      success: true,
      action_taken: 'maintenance_request_created',
      request_id: request.id,
      device_id,
      km_since_service: kmSinceService,
    };
  }
  
  return {
    skipped: true,
    reason: 'Maintenance not due',
    km_since_service: kmSinceService,
    next_service_at: serviceInterval - kmSinceService,
  };
}

async function createMaintenanceRequest(base44, data) {
  const request = await base44.asServiceRole.entities.DeviceMaintenanceRequest.create({
    device_id: data.device_id,
    lender_id: data.lender_id,
    request_type: data.request_type || 'scheduled_service',
    trigger_reason: data.trigger_reason || 'distance_threshold',
    current_km_reading: data.current_km_reading,
    last_service_km: data.last_service_km || 0,
    km_since_last_service: data.km_since_last_service || 0,
    service_interval_km: data.service_interval_km || 5000,
    status: 'pending',
    priority: data.priority || 'medium',
    lender_notified: false,
  });
  
  return request;
}

async function updateMaintenanceRequest(base44, data) {
  const { request_id, status, admin_notes, scheduled_date, service_provider, service_cost, completed_date } = data;
  
  const updates = {};
  if (status) updates.status = status;
  if (admin_notes) updates.admin_notes = admin_notes;
  if (scheduled_date) updates.scheduled_date = scheduled_date;
  if (service_provider) updates.service_provider = service_provider;
  if (service_cost) updates.service_cost = service_cost;
  if (completed_date) updates.completed_date = completed_date;
  
  if (status === 'completed' && data.device_id) {
    // Update device
    await base44.asServiceRole.entities.Device.update(data.device_id, {
      status: 'Available',
      is_listed_on_marketplace: true,
      last_service_km_reading: data.current_km_reading,
      last_service_date: completed_date || new Date().toISOString().split('T')[0],
    });
    
    // Notify lender
    await base44.asServiceRole.entities.Notification.create({
      user_id: data.lender_id,
      title: '✅ Maintenance Completed',
      message: `Your device maintenance has been completed and marked as Available.`,
      is_read: false,
    });
  }
  
  await base44.asServiceRole.entities.DeviceMaintenanceRequest.update(request_id, updates);
  
  return { success: true, request_id, updates };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(degrees) {
  return degrees * Math.PI / 180;
}