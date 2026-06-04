import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, TrendingUp, Calendar, Wrench, DollarSign, Activity, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#006B3C', '#7BC943', '#F4B400', '#1a3a6b', '#2d5a8a', '#4a7ab8'];

export default function LenderAnalytics() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        } catch {
            setUser(null);
        }
    };

    const { data: analytics, isLoading, error } = useQuery({
        queryKey: ['lenderAnalytics', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const res = await base44.functions.invoke('getLenderAnalytics', {});
            return res.data;
        },
        enabled: !!user,
    });

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="py-12 text-center">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <h2 className="text-xl font-bold mb-2">Login Required</h2>
                        <p className="text-gray-600 mb-4">Please login to view your analytics</p>
                        <button 
                            onClick={() => base44.auth.redirectToLogin()}
                            className="bg-[#006B3C] text-white px-6 py-2 rounded-lg"
                        >
                            Login
                        </button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-green-100 border-t-[#006B3C] rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !analytics) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <Link to="/profile" className="flex items-center gap-1 text-[#006B3C] text-sm mb-4">
                    <ChevronLeft className="w-4 h-4" /> Back
                </Link>
                <Card>
                    <CardContent className="py-12 text-center">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-300" />
                        <h2 className="text-xl font-bold mb-2">Unable to Load Analytics</h2>
                        <p className="text-gray-600">Please try again later</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { fleet_summary, monthly_income, occupancy_by_device, reliability_by_device } = analytics;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="bg-[#006B3C] text-white px-4 pt-10 pb-6">
                <Link to="/profile" className="flex items-center gap-1 text-green-100 text-sm mb-3">
                    <ChevronLeft className="w-4 h-4" /> Back to Profile
                </Link>
                <h1 className="text-2xl font-bold">Lender Analytics</h1>
                <p className="text-green-100 text-sm mt-1">Track your rental performance</p>
            </div>

            <div className="px-4 mt-4 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity className="w-5 h-5 text-[#006B3C]" />
                                <p className="text-xs text-gray-500">Total Devices</p>
                            </div>
                            <p className="text-2xl font-bold">{fleet_summary.total_devices}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <p className="text-xs text-gray-500">Active Rentals</p>
                            </div>
                            <p className="text-2xl font-bold">{fleet_summary.active_rentals}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                <p className="text-xs text-gray-500">6M Revenue</p>
                            </div>
                            <p className="text-lg font-bold">UGX {fleet_summary.total_revenue_6m.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                                <p className="text-xs text-gray-500">Avg Occupancy</p>
                            </div>
                            <p className="text-2xl font-bold">{fleet_summary.avg_occupancy_rate}%</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Monthly Income Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthly_income}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `UGX ${value.toLocaleString()}`} />
                                    <Bar dataKey="revenue" fill="#006B3C" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Device Occupancy Rates</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {occupancy_by_device.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={occupancy_by_device}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="device_name" tick={{fontSize: 10}} />
                                        <YAxis label={{ value: 'Occupancy %', angle: -90, position: 'insideLeft' }} />
                                        <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                                        <Bar dataKey="occupancy_rate" fill="#7BC943" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No occupancy data available</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Wrench className="w-5 h-5" />
                            Device Reliability
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {reliability_by_device.length > 0 ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {reliability_by_device.map(device => (
                                    <div key={device.device_id} className="border rounded-lg p-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-semibold">{device.device_name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {device.maintenance_count} maintenance requests
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-[#006B3C]">
                                                    {device.avg_km_between_service?.toLocaleString()} km
                                                </p>
                                                <p className="text-xs text-gray-500">Avg between service</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 text-xs text-gray-600">
                                            <span>Last service: {device.last_service_date || 'N/A'}</span>
                                            <span>Next due: {device.next_service_due_km?.toLocaleString()} km</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">No reliability data available</p>
                        )}
                    </CardContent>
                </Card>

                {fleet_summary.pending_maintenance > 0 && (
                    <Card className="border-orange-200 bg-orange-50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-6 h-6 text-orange-600" />
                                <div>
                                    <p className="font-semibold text-orange-800">Pending Maintenance</p>
                                    <p className="text-sm text-orange-700">
                                        {fleet_summary.pending_maintenance} device(s) need attention
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}