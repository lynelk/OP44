import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, Search, SlidersHorizontal, ChevronLeft, Star, Shield, Zap, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';

const DEVICE_TYPE_EMOJI = {
  Motorcycle: '🏍️', Car: '🚗', Phone: '📱', Laptop: '💻',
  'Agro Input': '🌾', Fuel: '⛽', 'Solar Item': '☀️', Other: '📦'
};

const FINANCING_COLOR = {
  'Daily Hire': 'bg-blue-100 text-blue-700',
  'Weekly Hire': 'bg-purple-100 text-purple-700',
  'Monthly Hire': 'bg-teal-100 text-teal-700',
  'Hire Purchase': 'bg-amber-100 text-amber-700',
  'Outright Purchase': 'bg-green-100 text-green-700'
};

export default function DeviceMarketplace() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [filterFinancing, setFilterFinancing] = useState('All');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);

  const load = async () => {
    setLoading(true);
    const res = await base44.entities.Device.filter({ is_listed_on_marketplace: true, admin_verification_status: 'Approved' });
    setDevices(res || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = devices.filter(d => {
    const matchSearch = !search || `${d.make} ${d.model} ${d.device_type} ${d.district}`.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'All' || d.device_type === filterType;
    const matchFinancing = filterFinancing === 'All' || d.financing_options?.includes(filterFinancing);
    const matchDistrict = !filterDistrict || d.district?.toLowerCase().includes(filterDistrict.toLowerCase());
    return matchSearch && matchType && matchFinancing && matchDistrict;
  });

  const deviceTypes = ['All', 'Motorcycle', 'Car', 'Phone', 'Laptop', 'Agro Input', 'Fuel', 'Solar Item'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-5 pt-14 pb-6">
        <Link to="/" className="flex items-center gap-1 text-green-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Home
        </Link>
        <h1 className="text-xl font-black">Asset Marketplace</h1>
        <p className="text-green-200 text-xs mt-0.5">{filtered.length} verified assets available</p>

        <div className="flex gap-2 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by type, make, district..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white text-gray-800 border-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${showFilters ? 'bg-white text-[#006B3C]' : 'bg-white/20 text-white'}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {showFilters && (
          <div className="bg-white/10 rounded-2xl p-4 mt-3 space-y-3">
            <div>
              <p className="text-xs text-green-200 mb-2 font-semibold">Device Type</p>
              <div className="flex flex-wrap gap-1.5">
                {deviceTypes.map(t => (
                  <button key={t} onClick={() => setFilterType(t)} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${filterType === t ? 'bg-white text-[#006B3C]' : 'bg-white/15 text-white'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-green-200 mb-2 font-semibold">Financing Option</p>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Daily Hire', 'Weekly Hire', 'Monthly Hire', 'Hire Purchase', 'Outright Purchase'].map(f => (
                  <button key={f} onClick={() => setFilterFinancing(f)} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${filterFinancing === f ? 'bg-white text-[#006B3C]' : 'bg-white/15 text-white'}`}>{f}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-green-200 mb-1 font-semibold">District</p>
              <Input placeholder="e.g. Kampala, Entebbe..." value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} className="bg-white/20 border-none text-white placeholder:text-green-200 text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* Type scroll bar */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-white border-b border-gray-100">
        {deviceTypes.map(t => (
          <button key={t} onClick={() => setFilterType(t)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filterType === t ? 'bg-[#006B3C] text-white' : 'bg-gray-100 text-gray-600'}`}>
            {t !== 'All' ? DEVICE_TYPE_EMOJI[t] : ''} {t}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 pb-24 space-y-3">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-36 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium">No assets found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : filtered.map(device => (
          <button key={device.id} onClick={() => setSelectedDevice(device)} className="w-full bg-white rounded-2xl overflow-hidden shadow-sm text-left hover:shadow-md transition-shadow">
            {device.image_urls?.[0] && (
              <img src={device.image_urls[0]} alt={`${device.make} ${device.model}`} className="w-full h-40 object-cover" />
            )}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-black text-base">{DEVICE_TYPE_EMOJI[device.device_type]} {device.make} {device.model}</p>
                  <p className="text-xs text-gray-500">{device.year || ''} · {device.condition_type}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-lg text-[#006B3C]">UGX {device.daily_rate?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">per day</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                {device.financing_options?.slice(0, 3).map(f => (
                  <span key={f} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${FINANCING_COLOR[f] || 'bg-gray-100 text-gray-600'}`}>{f}</span>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{device.district || device.location_address || 'Location N/A'}</span>
                <div className="flex items-center gap-2">
                  {device.has_gps_tracker && <span className="flex items-center gap-0.5 text-green-600 font-semibold"><Zap className="w-3 h-3" />GPS</span>}
                  {device.insurance_status === 'Insured' && <span className="flex items-center gap-0.5 text-blue-600 font-semibold"><Shield className="w-3 h-3" />Insured</span>}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Device Detail Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <div className="relative">
              {selectedDevice.image_urls?.[0] ? (
                <img src={selectedDevice.image_urls[0]} alt="" className="w-full h-48 object-cover rounded-t-3xl" />
              ) : (
                <div className="w-full h-20 bg-gray-100 rounded-t-3xl" />
              )}
              <button onClick={() => setSelectedDevice(null)} className="absolute top-3 right-3 bg-white/80 w-8 h-8 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-black text-xl">{selectedDevice.make} {selectedDevice.model}</h2>
                  <p className="text-sm text-gray-500">{selectedDevice.device_type} · {selectedDevice.year} · {selectedDevice.condition_type}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-xl text-[#006B3C]">UGX {selectedDevice.daily_rate?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">/day</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['Weekly Rate', selectedDevice.weekly_rate ? `UGX ${selectedDevice.weekly_rate?.toLocaleString()}` : 'N/A'],
                  ['Monthly Rate', selectedDevice.monthly_rate ? `UGX ${selectedDevice.monthly_rate?.toLocaleString()}` : 'N/A'],
                  ['Location', selectedDevice.district || selectedDevice.location_address || 'N/A'],
                  ['Min. Rental', `${selectedDevice.min_rental_days || 1} day(s)`],
                  ['Insurance', selectedDevice.insurance_status],
                  ['GPS Tracker', selectedDevice.has_gps_tracker ? 'Yes ✓' : 'No'],
                ].map(([label, val]) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-2.5">
                    <p className="text-gray-400 text-xs">{label}</p>
                    <p className="font-semibold text-sm">{val}</p>
                  </div>
                ))}
              </div>

              {selectedDevice.description && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                  <p className="text-gray-400 text-xs mb-1">Description</p>
                  <p className="text-gray-700">{selectedDevice.description}</p>
                </div>
              )}

              {selectedDevice.financing_options?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Financing Options</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDevice.financing_options.map(f => (
                      <span key={f} className={`text-xs font-semibold px-3 py-1 rounded-full ${FINANCING_COLOR[f] || 'bg-gray-100 text-gray-600'}`}>{f}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                <p className="font-bold mb-0.5">💡 Insurance Note</p>
                <p>All rentals include auto-calculated insurance. If not bundled, both device and individual insurance will be auto-allocated.</p>
              </div>

              <Button className="w-full bg-[#006B3C] hover:bg-[#005530] font-bold h-12 text-base">
                Request This Device
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}