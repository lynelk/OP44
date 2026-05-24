import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'update_location') {
      // Called by GPS device/webhook — service role
      const { tracker_id, latitude, longitude, speed_kph, heading, rental_id, battery_level, event_type } = body;
      const now = new Date().toISOString();

      // Update tracker last position
      await base44.asServiceRole.entities.GPSTracker.update(tracker_id, {
        last_location_lat: latitude,
        last_location_lon: longitude,
        last_updated_at: now,
        current_speed_kph: speed_kph || 0,
        is_moving: (speed_kph || 0) > 2,
        battery_level_percent: battery_level
      });

      // Log to history
      await base44.asServiceRole.entities.LocationHistory.create({
        tracker_id,
        device_id: body.device_id,
        rental_id,
        latitude,
        longitude,
        speed_kph: speed_kph || 0,
        heading_degrees: heading || 0,
        event_type: event_type || 'Periodic',
        timestamp: now
      });

      // Check for speed violations
      const trackers = await base44.asServiceRole.entities.GPSTracker.filter({ id: tracker_id });
      if (trackers.length) {
        const tracker = trackers[0];
        if ((speed_kph || 0) > (tracker.speed_limit_kph || 80)) {
          await base44.asServiceRole.entities.GPSAlert.create({
            tracker_id,
            device_id: tracker.device_id,
            lender_id: tracker.lender_id,
            rental_id,
            alert_type: 'Speeding',
            message: `Speed alert: ${speed_kph} km/h exceeds limit of ${tracker.speed_limit_kph || 80} km/h`,
            location_lat: latitude,
            location_lon: longitude,
            speed_kph,
            severity: speed_kph > (tracker.speed_limit_kph * 1.5) ? 'Critical' : 'High',
            is_read: false,
            timestamp: now
          });

          await base44.asServiceRole.entities.Notification.create({
            user_id: tracker.lender_id,
            title: '🚨 Speed Alert',
            message: `Your device is traveling at ${speed_kph} km/h — exceeds the ${tracker.speed_limit_kph} km/h limit.`,
            is_read: false
          }).catch(() => null);
        }

        // Check geofences
        const geofences = await base44.asServiceRole.entities.Geofence.filter({ lender_id: tracker.lender_id, is_active: true });
        for (const gf of geofences) {
          if (gf.type === 'Circle' && gf.center_lat && gf.center_lon && gf.radius_meters) {
            const dist = haversineDistance(latitude, longitude, gf.center_lat, gf.center_lon);
            const wasInside = tracker.geofence_status === 'Inside';
            const isInside = dist <= gf.radius_meters;
            if (wasInside !== isInside) {
              const alertType = isInside ? 'GeofenceEntry' : 'GeofenceExit';
              if ((isInside && gf.alert_on_entry) || (!isInside && gf.alert_on_exit)) {
                await base44.asServiceRole.entities.GPSAlert.create({
                  tracker_id,
                  device_id: tracker.device_id,
                  lender_id: tracker.lender_id,
                  rental_id,
                  alert_type: alertType,
                  message: `Device ${isInside ? 'entered' : 'exited'} geofence: ${gf.name}`,
                  location_lat: latitude,
                  location_lon: longitude,
                  geofence_id: gf.id,
                  severity: 'Medium',
                  is_read: false,
                  timestamp: now
                });

                await base44.asServiceRole.entities.Notification.create({
                  user_id: tracker.lender_id,
                  title: `📍 Geofence ${isInside ? 'Entry' : 'Exit'}`,
                  message: `Your device ${isInside ? 'entered' : 'left'} the zone: ${gf.name}`,
                  is_read: false
                }).catch(() => null);
              }
              await base44.asServiceRole.entities.GPSTracker.update(tracker_id, {
                geofence_status: isInside ? 'Inside' : 'Outside'
              });
            }
          }
        }
      }

      return Response.json({ success: true });
    }

    if (action === 'get_route_history') {
      const { tracker_id, from_date, to_date, rental_id: rid } = body;
      const filter = { tracker_id };
      if (rid) filter.rental_id = rid;
      const history = await base44.asServiceRole.entities.LocationHistory.filter(filter, 'timestamp', 500);
      const filtered = history.filter(h => {
        const t = new Date(h.timestamp);
        const from = from_date ? new Date(from_date) : null;
        const to = to_date ? new Date(to_date) : null;
        return (!from || t >= from) && (!to || t <= to);
      });
      return Response.json({ history: filtered });
    }

    if (action === 'get_lender_trackers') {
      const trackers = await base44.entities.GPSTracker.filter({ lender_id: user.id });
      return Response.json({ trackers });
    }

    if (action === 'get_alerts') {
      const alerts = await base44.entities.GPSAlert.filter({ lender_id: user.id }, '-timestamp', 50);
      return Response.json({ alerts });
    }

    if (action === 'mark_alert_read') {
      const { alert_id } = body;
      await base44.entities.GPSAlert.update(alert_id, { is_read: true });
      return Response.json({ success: true });
    }

    if (action === 'create_geofence') {
      const { name, type, center_lat, center_lon, radius_meters, polygon_json, alert_on_entry, alert_on_exit, device_id, color } = body;
      const gf = await base44.entities.Geofence.create({
        lender_id: user.id,
        device_id: device_id || null,
        name, type,
        center_lat, center_lon,
        radius_meters,
        polygon_coordinates_json: polygon_json,
        alert_on_entry: alert_on_entry !== false,
        alert_on_exit: alert_on_exit !== false,
        color: color || '#006B3C',
        is_active: true
      });
      return Response.json({ success: true, geofence: gf });
    }

    if (action === 'delete_geofence') {
      const { geofence_id } = body;
      await base44.entities.Geofence.update(geofence_id, { is_active: false });
      return Response.json({ success: true });
    }

    if (action === 'simulate_location') {
      // For demo/testing: simulate device movement
      const { tracker_id, lat, lon, speed } = body;
      const trackers = await base44.asServiceRole.entities.GPSTracker.filter({ id: tracker_id });
      if (!trackers.length) return Response.json({ error: 'Tracker not found' }, { status: 404 });
      // Re-invoke update_location flow
      const res = await base44.asServiceRole.functions.invoke('gpsTrackerManager', {
        action: 'update_location',
        tracker_id, latitude: lat, longitude: lon, speed_kph: speed || 0,
        device_id: trackers[0].device_id, battery_level: 85, event_type: 'Manual'
      });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}