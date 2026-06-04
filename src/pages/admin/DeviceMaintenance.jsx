import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ChevronLeft, Wrench, CheckCircle, AlertCircle, Clock, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_CONFIG = {
  pending: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: 'Pending' },
  scheduled: { color: 'bg-blue-100 text-blue-700', icon: Calendar, label: 'Scheduled' },
  in_progress: { color: 'bg-purple-100 text-purple-700', icon: Wrench, label: 'In Progress' },
  completed: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Completed' },
  cancelled: { color: 'bg-gray-100 text-gray-700', icon: AlertCircle, label: 'Cancelled' },
};

const PRIORITY_CONFIG = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

export default function DeviceMaintenance() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    const all = await base44.asServiceRole.entities.DeviceMaintenanceRequest.filter({}, '-created_date', 300);
    setRequests(all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleUpdate = async (requestId, status, deviceId, currentKm, lenderId) => {
    await base44.functions.invoke('deviceMaintenanceEngine', {
      action: 'update_request',
      request_id: requestId,
      status,
      completed_date: status === 'completed' ? new Date().toISOString().split('T')[0] : undefined,
      device_id: deviceId,
      current_km_reading: currentKm,
      lender_id: lenderId,
    });
    loadRequests();
    setSelectedRequest(null);
  };

  const filteredRequests = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    in_progress: requests.filter(r => r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Admin
        </Link>
        <h1 className="text-xl font-bold">Device Maintenance</h1>
        <p className="text-blue-200 text-xs mt-0.5">Track & manage scheduled maintenance requests</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Clock className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-xs text-gray-400">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Wrench className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-purple-600">{stats.in_progress}</p>
              <p className="text-xs text-gray-400">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-gray-400">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Maintenance Requests</p>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {filteredRequests.map(request => {
            const StatusIcon = STATUS_CONFIG[request.status]?.icon || Clock;
            return (
              <Card key={request.id} className="cursor-pointer" onClick={() => setSelectedRequest(request)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">Device {request.device_id?.slice(-6)}</p>
                          <Badge className={PRIORITY_CONFIG[request.priority]}>
                            {request.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          {request.km_since_last_service?.toLocaleString()} km since last service
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <StatusIcon className="w-3 h-3" />
                            {STATUS_CONFIG[request.status]?.label}
                          </span>
                          <span>•</span>
                          <span>{new Date(request.created_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-gray-300 rotate-180" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filteredRequests.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-gray-400">
                <Wrench className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No maintenance requests</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold">Maintenance Details</h2>
              <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Device</p>
                <p className="font-semibold">{selectedRequest.device_id}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Current KM</p>
                  <p className="font-semibold">{selectedRequest.current_km_reading?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Since Last Service</p>
                  <p className="font-semibold">{selectedRequest.km_since_last_service?.toLocaleString() || 0} km</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <Badge className={STATUS_CONFIG[selectedRequest.status]?.color}>
                    {STATUS_CONFIG[selectedRequest.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Priority</p>
                  <Badge className={PRIORITY_CONFIG[selectedRequest.priority]}>
                    {selectedRequest.priority}
                  </Badge>
                </div>
              </div>
              {selectedRequest.admin_notes && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Admin Notes</p>
                  <p className="text-sm">{selectedRequest.admin_notes}</p>
                </div>
              )}
              {selectedRequest.trigger_reason && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Trigger Reason</p>
                  <p className="text-sm capitalize">{selectedRequest.trigger_reason.replace('_', ' ')}</p>
                </div>
              )}
              
              {/* Actions */}
              <div className="space-y-2 pt-4 border-t">
                <p className="text-xs font-semibold text-gray-500">Update Status</p>
                {selectedRequest.status === 'pending' && (
                  <>
                    <Button className="w-full" onClick={() => handleUpdate(selectedRequest.id, 'scheduled', selectedRequest.device_id, selectedRequest.current_km_reading, selectedRequest.lender_id)}>
                      Mark as Scheduled
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => handleUpdate(selectedRequest.id, 'in_progress', selectedRequest.device_id, selectedRequest.current_km_reading, selectedRequest.lender_id)}>
                      Mark as In Progress
                    </Button>
                  </>
                )}
                {selectedRequest.status === 'in_progress' && (
                  <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleUpdate(selectedRequest.id, 'completed', selectedRequest.device_id, selectedRequest.current_km_reading, selectedRequest.lender_id)}>
                    Mark as Completed
                  </Button>
                )}
                <Button variant="outline" className="w-full text-red-600 border-red-200" onClick={() => handleUpdate(selectedRequest.id, 'cancelled', selectedRequest.device_id, selectedRequest.current_km_reading, selectedRequest.lender_id)}>
                  Cancel Request
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}