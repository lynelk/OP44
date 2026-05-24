import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userProfile = await base44.entities.UserProfile.filter({ user_id: user.id }).then(r => r[0]);
        if (!userProfile || (userProfile.account_type !== 'lender' && userProfile.account_type !== 'both')) {
            return Response.json({ error: 'Only lenders can access analytics' }, { status: 403 });
        }

        const lenderId = user.id;
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const [devices, rentals, maintenanceRequests] = await Promise.all([
            base44.entities.Device.filter({ lender_id: lenderId }),
            base44.entities.RentalAgreement.filter({ lender_id: lenderId }),
            base44.entities.DeviceMaintenanceRequest.filter({ lender_id: lenderId }),
        ]);

        const deviceIds = devices.map(d => d.id);
        const activeRentals = rentals.filter(r => 
            r.status === 'Active' && 
            new Date(r.end_date) >= now
        );

        const totalIncome = rentals
            .filter(r => r.status === 'Active' || r.status === 'Completed')
            .reduce((sum, r) => sum + (r.total_rental_fee || 0), 0);

        const monthlyIncome = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date();
            monthDate.setMonth(monthDate.getMonth() - i);
            const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
            const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
            
            const monthRevenue = rentals
                .filter(r => {
                    const rentalStart = new Date(r.start_date);
                    return r.status === 'Active' || r.status === 'Completed' ? 
                        rentalStart >= monthStart && rentalStart <= monthEnd : false;
                })
                .reduce((sum, r) => sum + (r.total_rental_fee || 0), 0);
            
            monthlyIncome.push({
                month: monthDate.toLocaleString('default', { month: 'short', year: '2-digit' }),
                revenue: monthRevenue,
            });
        }

        const occupancyData = devices.map(device => {
            const deviceRentals = rentals.filter(r => r.device_id === device.id);
            const totalDaysRented = deviceRentals.reduce((days, r) => {
                const start = new Date(r.start_date);
                const end = new Date(r.end_date);
                const rentalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                return days + (r.status === 'Active' || r.status === 'Completed' ? rentalDays : 0);
            }, 0);
            
            const daysSinceListing = 180;
            const occupancyRate = daysSinceListing > 0 ? (totalDaysRented / daysSinceListing) * 100 : 0;
            
            return {
                device_id: device.id,
                device_name: `${device.make} ${device.model}`,
                device_type: device.device_type,
                total_days_rented: totalDaysRented,
                occupancy_rate: Math.min(occupancyRate, 100),
            };
        });

        const reliabilityData = devices.map(device => {
            const deviceMaintenance = maintenanceRequests.filter(m => m.device_id === device.id);
            const completedMaintenance = deviceMaintenance.filter(m => m.status === 'completed');
            
            let avgKmBetweenService = null;
            let avgDaysBetweenService = null;
            
            if (completedMaintenance.length >= 2) {
                const sorted = completedMaintenance.sort((a, b) => 
                    new Date(a.completed_date) - new Date(b.completed_date)
                );
                
                const intervals = [];
                for (let i = 1; i < sorted.length; i++) {
                    const prev = sorted[i - 1];
                    const curr = sorted[i];
                    
                    if (prev.last_service_km && curr.current_km_reading) {
                        intervals.push(curr.current_km_reading - prev.last_service_km);
                    }
                    
                    if (prev.completed_date && curr.completed_date) {
                        const days = Math.ceil((new Date(curr.completed_date) - new Date(prev.completed_date)) / (1000 * 60 * 60 * 24));
                        intervals.push(days);
                    }
                }
                
                if (intervals.length > 0) {
                    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                    avgKmBetweenService = Math.round(avg);
                }
            }
            
            return {
                device_id: device.id,
                device_name: `${device.make} ${device.model}`,
                maintenance_count: completedMaintenance.length,
                avg_km_between_service: avgKmBetweenService || device.service_interval_km || 5000,
                last_service_date: device.last_service_date,
                next_service_due_km: (device.last_service_km_reading || 0) + (device.service_interval_km || 5000),
            };
        });

        const fleetSummary = {
            total_devices: devices.length,
            active_rentals: activeRentals.length,
            total_revenue_6m: totalIncome,
            avg_occupancy_rate: occupancyData.length > 0 
                ? Math.round(occupancyData.reduce((sum, d) => sum + d.occupancy_rate, 0) / occupancyData.length)
                : 0,
            total_maintenance_requests: maintenanceRequests.length,
            pending_maintenance: maintenanceRequests.filter(m => m.status === 'pending' || m.status === 'scheduled').length,
        };

        return Response.json({
            fleet_summary: fleetSummary,
            monthly_income: monthlyIncome,
            occupancy_by_device: occupancyData,
            reliability_by_device: reliabilityData,
        });
    } catch (error) {
        console.error('Error in getLenderAnalytics:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});