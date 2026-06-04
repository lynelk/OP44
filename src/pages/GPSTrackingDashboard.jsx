import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Bell, MapPin, Zap, Shield, Clock, ChevronLeft, RefreshCw, AlertTriangle, Battery, Navigation, Plus, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MOVING_ICON = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  shadowSize: [41, 41]
});

const ALERT_SEVERITY_COLOR = { Low: 'text-blue-500', Medium: 'text-amber-500', High: 'text-orange-500', Critical: 'text-red-600' };
const ALERT_TYPE_ICON = { Speeding: '🚨', GeofenceEntry: '📍', GeofenceExit: '📤', LowBattery: '🔋', DeviceMovement: '📡', IgnitionOn: '🔑', IgnitionOff: '🔒', HardBraking: '⚠️' };

function GeofenceCreator({ onCreated }) {
  const [drawing, setDrawing] = useState(false);
  const [center, setCenter] = useState(null);
  const [radius, setRadius] = useState(500);
  const [name, setName] = useState('');

  useMapEvents({
    click(e) {
      if (drawing) {
        setCenter([e.latlng.lat, e.latlng.lng]);
      }
    }
  });

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-2xl shadow-lg p-4 w-64">
      <p className="font-bold text-sm mb-2">Create Geofence</p>
      <Input placeholder="Zone name" value={name} onChange={e => setName(e.target.value)} className="mb-2 text-sm" />
      <div className="flex items-center gap-2 mb-2">
        <label className="text-xs text-gray-500">Radius (m)</label>
        <Input type="number" value={radius} onChange={e => setRadius(Number(e.target.value))} className="text-sm w-20" />
      </div>
      {center && <p className="text-xs text-emerald-600 mb-2">✓ Center set: {center[0].toFixed(4)}, {center[1].toFixed(4)}</p>}
      {!drawing ? (
        <Button size="sm" className="w-full" onClick={() => setDrawing(true)}>
          <MapPin className="w-3 h-3 mr-1" /> Click map to set center
        </Button>
      ) : (
        <div className="space-y-2">
          {center && (
            <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => {
              if (name && center) {
                onCreated({ name, center_lat: center[0], center_lon: center[1], radius_meters: radius, type: 'Circle' });
                setDrawing(false); setCenter(null); setName('');
              }
            }}>Save Geofence</Button>
          )}
          <Button size="sm" variant="outline" className="w-full" onClick={() => { setDrawing(false); setCenter(null); }}>Cancel</Button>
        </div>
      )}
      {center && drawing && <Circle center={center} radius={radius} pathOptions={{ color: '#006B3C', fillOpacity: 0.15 }} />}
    </div>
  );
}

export default function GPSTrackingDashboard() {
  const [trackers, setTrackers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [selectedTracker, setSelectedTracker] = useState(null);
  const [routeHistory, setRouteHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('map');
  const [loading, setLoading] = useState(true);
  const [showGeofenceCreator, setShowGeofenceCreator] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 86400000).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [simLat, setSimLat] = useState('0.3476');
  const [simLon, setSimLon] = useState('32.5825');
  const [simSpeed, setSimSpeed] = useState('60');
  const mapRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const [tRes, aRes, gfRes] = await Promise.all([
      base44.functions.invoke('gpsTrackerManager', { action: 'get_lender_trackers' }),
      base44.functions.invoke('gpsTrackerManager', { action: 'get_alerts' }),
      base44.entities.Geofence.filter({}, '-created_date', 200)
    ]);
    setTrackers(tRes.data?.trackers || []);
    setAlerts(aRes.data?.alerts || []);
    setGeofences(gfRes || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadRoute = async (tracker) => {
    setLoadingRoute(true);
    const res = await base44.functions.invoke('gpsTrackerManager', {
      action: 'get_route_history', tracker_id: tracker.id, from_date: fromDate, to_date: toDate
    });
    setRouteHistory(res.data?.history || []);
    setLoadingRoute(false);
  };

  const handleCreateGeofence = async (gfData) => {
    await base44.functions.invoke('gpsTrackerManager', { action: 'create_geofence', ...gfData });
    setShowGeofenceCreator(false);
    load();
  };

  const handleDeleteGeofence = async (gfId) => {
    await base44.functions.invoke('gpsTrackerManager', { action: 'delete_geofence', geofence_id: gfId });
    load();
  };

  const handleMarkAlertRead = async (alertId) => {
    await base44.functions.invoke('gpsTrackerManager', { action: 'mark_alert_read', alert_id: alertId });
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
  };

  const handleSimulate = async () => {
    if (!selectedTracker) return;
    await base44.functions.invoke('gpsTrackerManager', {
      action: 'simulate_location',
      tracker_id: selectedTracker.id,
      lat: parseFloat(simLat), lon: parseFloat(simLon), speed: parseFloat(simSpeed)
    });
    load();
  };

  const mapCenter = selectedTracker?.last_location_lat
    ? [selectedTracker.last_location_lat, selectedTracker.last_location_lon]
    : trackers.find(t => t.last_location_lat)
      ? [trackers.find(t => t.last_location_lat).last_location_lat, trackers.find(t => t.last_location_lat).last_location_lon]
      : [0.3476, 32.5825];

  const unreadAlerts = alerts.filter(a => !a.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-5 pt-14 pb-5">
        <Link to="/" className="flex items-center gap-1 text-green-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black">GPS Tracker</h1>
            <p className="text-green-200 text-xs mt-0.5">{trackers.length} devices monitored</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadAlerts > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{unreadAlerts} alerts</span>
            )}
            <button onClick={load} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide">
          {[
            { key: 'map', label: 'Live Map', icon: MapPin },
            { key: 'alerts', label: `Alerts ${unreadAlerts > 0 ? `(${unreadAlerts})` : ''}`, icon: Bell },
            { key: 'geofences', label: 'Geofences', icon: Shield },
            { key: 'history', label: 'Route History', icon: Clock },
            { key: 'simulate', label: 'Simulate', icon: Navigation },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === key ? 'bg-white text-[#006B3C]' : 'bg-white/15 text-white'
              }`}
            >
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-24">
        {/* Tracker list */}
        {trackers.length > 0 && (
          <div className="px-4 py-3 overflow-x-auto">
            <div className="flex gap-2">
              {trackers.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTracker(t); loadRoute(t); }}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    selectedTracker?.id === t.id ? 'bg-[#006B3C] text-white border-[#006B3C]' : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${t.is_moving ? 'bg-green-400' : 'bg-gray-400'}`} />
                  {t.tracker_label || `Tracker ${t.id.slice(-4)}`}
                  {t.battery_level_percent != null && (
                    <span className={`${t.battery_level_percent < 20 ? 'text-red-400' : 'text-gray-400'}`}>
                      {t.battery_level_percent}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MAP TAB */}
        {activeTab === 'map' && (
          <div className="relative" style={{ height: '70vh' }}>
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} ref={mapRef}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />

              {trackers.filter(t => t.last_location_lat).map(t => (
                <Marker key={t.id} position={[t.last_location_lat, t.last_location_lon]} icon={MOVING_ICON}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold">{t.tracker_label || 'Device'}</p>
                      <p>Speed: {t.current_speed_kph || 0} km/h</p>
                      <p>Battery: {t.battery_level_percent ?? 'N/A'}%</p>
                      <p className={t.is_moving ? 'text-green-600' : 'text-gray-500'}>{t.is_moving ? 'Moving' : 'Stationary'}</p>
                      <p className="text-xs text-gray-400 mt-1">Updated: {t.last_updated_at ? new Date(t.last_updated_at).toLocaleTimeString() : 'N/A'}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {geofences.filter(gf => gf.is_active && gf.type === 'Circle').map(gf => (
                <Circle
                  key={gf.id}
                  center={[gf.center_lat, gf.center_lon]}
                  radius={gf.radius_meters}
                  pathOptions={{ color: gf.color || '#006B3C', fillOpacity: 0.1, weight: 2 }}
                >
                  <Popup><p className="font-bold text-sm">{gf.name}</p><p className="text-xs">Radius: {gf.radius_meters}m</p></Popup>
                </Circle>
              ))}

              {routeHistory.length > 1 && (
                <Polyline
                  positions={routeHistory.map(h => [h.latitude, h.longitude])}
                  pathOptions={{ color: '#F4B400', weight: 3, opacity: 0.8 }}
                />
              )}

              {showGeofenceCreator && <GeofenceCreator onCreated={handleCreateGeofence} />}
            </MapContainer>

            <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
              <button
                onClick={() => setShowGeofenceCreator(!showGeofenceCreator)}
                className="bg-white shadow-lg rounded-xl px-3 py-2 text-xs font-bold text-[#006B3C] flex items-center gap-1"
              >
                <Shield className="w-3 h-3" /> {showGeofenceCreator ? 'Cancel' : 'Add Zone'}
              </button>
            </div>
          </div>
        )}

        {/* ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div className="px-4 py-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No alerts yet</p>
              </div>
            ) : alerts.map(alert => (
              <div key={alert.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${!alert.is_read ? 'border-orange-200' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{ALERT_TYPE_ICON[alert.alert_type] || '🔔'}</span>
                    <div>
                      <p className={`font-bold text-sm ${ALERT_SEVERITY_COLOR[alert.severity] || 'text-gray-800'}`}>{alert.alert_type}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{alert.timestamp ? new Date(alert.timestamp).toLocaleString() : ''}</p>
                    </div>
                  </div>
                  {!alert.is_read && (
                    <button onClick={() => handleMarkAlertRead(alert.id)} className="text-xs text-[#006B3C] font-semibold">Mark read</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GEOFENCES TAB */}
        {activeTab === 'geofences' && (
          <div className="px-4 py-4 space-y-3">
            <button
              onClick={() => { setActiveTab('map'); setShowGeofenceCreator(true); }}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-[#006B3C] text-[#006B3C] font-bold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create New Geofence (via Map)
            </button>
            {geofences.filter(gf => gf.is_active).length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No geofences created yet</p>
              </div>
            ) : geofences.filter(gf => gf.is_active).map(gf => (
              <div key={gf.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${gf.color || '#006B3C'}22` }}>
                      <Shield className="w-5 h-5" style={{ color: gf.color || '#006B3C' }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{gf.name}</p>
                      <p className="text-xs text-gray-400">{gf.type} · {gf.radius_meters ? `${gf.radius_meters}m radius` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setActiveTab('map')} className="text-gray-400 hover:text-blue-500">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteGeofence(gf.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 mt-3 text-xs text-gray-500">
                  {gf.alert_on_entry && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Entry Alert ✓</span>}
                  {gf.alert_on_exit && <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">Exit Alert ✓</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="px-4 py-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <p className="font-bold text-sm mb-3">Filter Route History</p>
              {!selectedTracker && (
                <p className="text-xs text-amber-600 mb-2">Select a tracker above first</p>
              )}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">From</label>
                  <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">To</label>
                  <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="text-sm" />
                </div>
              </div>
              <Button
                className="w-full bg-[#006B3C] hover:bg-[#005530]"
                disabled={!selectedTracker || loadingRoute}
                onClick={() => selectedTracker && loadRoute(selectedTracker)}
              >
                {loadingRoute ? 'Loading...' : 'Load Route'}
              </Button>
            </div>

            {routeHistory.length > 0 && (
              <>
                <p className="text-sm font-bold text-gray-700 mb-2">{routeHistory.length} location points</p>
                <div style={{ height: '40vh' }}>
                  <MapContainer center={[routeHistory[0].latitude, routeHistory[0].longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Polyline positions={routeHistory.map(h => [h.latitude, h.longitude])} pathOptions={{ color: '#F4B400', weight: 3 }} />
                    <Marker position={[routeHistory[0].latitude, routeHistory[0].longitude]}><Popup>Start</Popup></Marker>
                    <Marker position={[routeHistory[routeHistory.length - 1].latitude, routeHistory[routeHistory.length - 1].longitude]}><Popup>End</Popup></Marker>
                  </MapContainer>
                </div>
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                  {routeHistory.slice(0, 20).map((h, i) => (
                    <div key={i} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 text-xs shadow-sm">
                      <span className="text-gray-500">{new Date(h.timestamp).toLocaleTimeString()}</span>
                      <span className="font-bold">{h.speed_kph} km/h</span>
                      <span className="text-gray-400">{h.event_type}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* SIMULATE TAB */}
        {activeTab === 'simulate' && (
          <div className="px-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-xs text-amber-700">
              <p className="font-bold mb-1">⚠️ Test Mode</p>
              <p>Simulate GPS pings for testing alerts and geofences. Use with Kampala coordinates.</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <p className="font-bold text-sm">Simulate Location Update</p>
              {!selectedTracker && <p className="text-xs text-red-500">Select a tracker above first</p>}
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-500 block mb-1">Latitude</label><Input value={simLat} onChange={e => setSimLat(e.target.value)} className="text-sm" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Longitude</label><Input value={simLon} onChange={e => setSimLon(e.target.value)} className="text-sm" /></div>
              </div>
              <div><label className="text-xs text-gray-500 block mb-1">Speed (km/h)</label><Input type="number" value={simSpeed} onChange={e => setSimSpeed(e.target.value)} className="text-sm" /></div>
              <Button onClick={handleSimulate} disabled={!selectedTracker} className="w-full bg-[#006B3C] hover:bg-[#005530]">
                <Navigation className="w-4 h-4 mr-2" /> Send Simulated Ping
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}