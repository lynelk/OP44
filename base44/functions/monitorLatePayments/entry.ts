import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const now = new Date();
        const allRentals = await base44.entities.RentalAgreement.filter({});
        
        const activeRentals = allRentals.filter(r => 
            r.status === 'Active' && 
            r.payment_schedule && 
            Array.isArray(r.payment_schedule)
        );

        const lateFeeConfig = await base44.entities.P2PConfig.filter({ 
            config_key: 'late_fee_percentage' 
        }).then(r => r[0]);
        
        const lateFeePercentage = lateFeeConfig ? lateFeeConfig.value_number : 5;

        let processedCount = 0;
        let totalLateFeesApplied = 0;
        const notificationsSent = [];

        for (const rental of activeRentals) {
            const overdueInstallments = rental.payment_schedule.filter(installment => {
                const dueDate = new Date(installment.due_date);
                return dueDate < now && 
                       installment.status !== 'Paid' && 
                       installment.status !== 'Waived';
            });

            for (const installment of overdueInstallments) {
                if (installment.status === 'Overdue') {
                    continue;
                }

                const lateFee = Math.round((installment.amount * lateFeePercentage) / 100);
                const updatedBalance = (rental.outstanding_balance || 0) + lateFee;

                const updatedSchedule = rental.payment_schedule.map(inst => {
                    if (inst.installment_id === installment.installment_id) {
                        return { ...inst, status: 'Overdue' };
                    }
                    return inst;
                });

                await base44.entities.RentalAgreement.update(rental.id, {
                    outstanding_balance: updatedBalance,
                    payment_schedule: updatedSchedule,
                    overdue_count: (rental.overdue_count || 0) + 1,
                });

                await base44.entities.RevenueTransaction.create({
                    transaction_type: 'late_fee',
                    product_type: 'rental',
                    amount: lateFee,
                    currency: 'UGX',
                    partner_id: rental.lender_id,
                    reference_id: rental.id,
                    status: 'pending',
                    transaction_date: now.toISOString(),
                    description: `Late fee for overdue payment - ${rental.rental_ref}`,
                });

                const borrowerProfile = await base44.entities.UserProfile.filter({ user_id: rental.borrower_id }).then(r => r[0]);
                if (borrowerProfile) {
                    await base44.entities.Notification.create({
                        user_id: rental.borrower_id,
                        title: 'Payment Overdue',
                        message: `Your rental payment of UGX ${installment.amount.toLocaleString()} is overdue. A late fee of UGX ${lateFee.toLocaleString()} has been applied. Please pay immediately to avoid additional fees.`,
                        type: 'payment_overdue',
                        is_read: false,
                        created_date: now.toISOString(),
                    });
                    notificationsSent.push(rental.borrower_id);
                }

                processedCount++;
                totalLateFeesApplied += lateFee;
            }
        }

        return Response.json({
            success: true,
            processed_rentals: processedCount,
            total_late_fees_applied: totalLateFeesApplied,
            notifications_sent: notificationsSent.length,
        });
    } catch (error) {
        console.error('Error in monitorLatePayments:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});