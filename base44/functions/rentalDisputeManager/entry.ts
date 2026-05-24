import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'open_dispute') {
      const { rental_id, reason, description } = body;
      const rental = await base44.entities.RentalAgreement.filter({ id: rental_id });
      if (!rental.length) return Response.json({ error: 'Rental not found' }, { status: 404 });
      const r = rental[0];

      const isParty = r.borrower_id === user.id || r.lender_id === user.id;
      if (!isParty) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (r.dispute_status !== 'None') return Response.json({ error: 'A dispute already exists for this rental' }, { status: 400 });

      await base44.entities.RentalAgreement.update(rental_id, {
        status: 'Disputed',
        dispute_status: 'Open',
        dispute_opened_at: new Date().toISOString(),
        dispute_opened_by: user.id,
        dispute_reason: reason,
        dispute_description: description
      });

      // Log audit entry
      await base44.asServiceRole.entities.DisputeAuditLog.create({
        rental_agreement_id: rental_id,
        actor_user_id: user.id,
        actor_role: r.borrower_id === user.id ? 'Borrower' : 'Lender',
        action: 'Dispute Opened',
        previous_status: 'None',
        new_status: 'Open',
        notes: `Reason: ${reason}. ${description}`,
        timestamp: new Date().toISOString()
      });

      // Notify the other party and admin
      const otherPartyId = r.borrower_id === user.id ? r.lender_id : r.borrower_id;
      await base44.asServiceRole.entities.Notification.create({
        user_id: otherPartyId,
        title: '⚠️ Rental Dispute Opened',
        message: `A dispute has been opened for rental agreement ${r.rental_ref || rental_id}. Reason: ${reason}`,
        is_read: false
      });
      await base44.asServiceRole.entities.Notification.create({
        user_id: 'admin',
        title: 'New Rental Dispute Requires Mediation',
        message: `Rental ${r.rental_ref || rental_id} has a new dispute. Reason: ${reason}`,
        is_read: false
      }).catch(() => null);

      return Response.json({ success: true, message: 'Dispute opened successfully' });
    }

    if (action === 'submit_evidence') {
      const { rental_id, evidence_type, title, description, file_urls } = body;
      const rental = await base44.entities.RentalAgreement.filter({ id: rental_id });
      if (!rental.length) return Response.json({ error: 'Rental not found' }, { status: 404 });
      const r = rental[0];

      const isParty = r.borrower_id === user.id || r.lender_id === user.id || user.role === 'admin';
      if (!isParty) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const evidence = await base44.asServiceRole.entities.DisputeEvidence.create({
        rental_agreement_id: rental_id,
        submitted_by_user_id: user.id,
        submitter_role: user.role === 'admin' ? 'Admin' : (r.borrower_id === user.id ? 'Borrower' : 'Lender'),
        evidence_type,
        title,
        description,
        file_urls: file_urls || [],
        submitted_at: new Date().toISOString()
      });

      await base44.asServiceRole.entities.DisputeAuditLog.create({
        rental_agreement_id: rental_id,
        actor_user_id: user.id,
        actor_role: user.role === 'admin' ? 'Admin' : (r.borrower_id === user.id ? 'Borrower' : 'Lender'),
        action: 'Evidence Submitted',
        notes: `${evidence_type}: ${title}`,
        timestamp: new Date().toISOString()
      });

      // Notify other party
      const otherPartyId = r.borrower_id === user.id ? r.lender_id : r.borrower_id;
      await base44.asServiceRole.entities.Notification.create({
        user_id: otherPartyId,
        title: 'New Evidence Submitted',
        message: `New ${evidence_type} evidence has been submitted for rental dispute ${r.rental_ref || rental_id}: "${title}"`,
        is_read: false
      }).catch(() => null);

      return Response.json({ success: true, evidence });
    }

    if (action === 'request_mediation') {
      const { rental_id } = body;
      const rental = await base44.entities.RentalAgreement.filter({ id: rental_id });
      if (!rental.length) return Response.json({ error: 'Rental not found' }, { status: 404 });
      const r = rental[0];
      const isParty = r.borrower_id === user.id || r.lender_id === user.id;
      if (!isParty) return Response.json({ error: 'Forbidden' }, { status: 403 });

      await base44.asServiceRole.entities.RentalAgreement.update(rental_id, {
        dispute_status: 'Under Mediation'
      });

      await base44.asServiceRole.entities.DisputeAuditLog.create({
        rental_agreement_id: rental_id,
        actor_user_id: user.id,
        actor_role: r.borrower_id === user.id ? 'Borrower' : 'Lender',
        action: 'Mediation Requested',
        previous_status: 'Open',
        new_status: 'Under Mediation',
        timestamp: new Date().toISOString()
      });

      await base44.asServiceRole.entities.Notification.create({
        user_id: 'admin',
        title: '🧑‍⚖️ Mediation Requested',
        message: `Rental ${r.rental_ref || rental_id} — parties have requested admin mediation.`,
        is_read: false
      }).catch(() => null);

      return Response.json({ success: true });
    }

    if (action === 'resolve_dispute') {
      if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });
      const { rental_id, outcome, resolution_notes } = body;
      // outcome: 'Favour Borrower' | 'Favour Lender' | 'Compromise' | 'No Action'

      const rental = await base44.asServiceRole.entities.RentalAgreement.filter({ id: rental_id });
      if (!rental.length) return Response.json({ error: 'Rental not found' }, { status: 404 });
      const r = rental[0];

      await base44.asServiceRole.entities.RentalAgreement.update(rental_id, {
        dispute_status: 'Resolved',
        status: 'Active',
        dispute_resolved_at: new Date().toISOString(),
        dispute_resolution_notes: resolution_notes,
        dispute_resolved_by: user.id,
        dispute_outcome: outcome
      });

      await base44.asServiceRole.entities.DisputeAuditLog.create({
        rental_agreement_id: rental_id,
        actor_user_id: user.id,
        actor_role: 'Admin',
        action: 'Resolution Applied',
        previous_status: r.dispute_status,
        new_status: 'Resolved',
        notes: `Outcome: ${outcome}. ${resolution_notes}`,
        timestamp: new Date().toISOString()
      });

      // Notify both parties
      for (const uid of [r.borrower_id, r.lender_id]) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: uid,
          title: '✅ Dispute Resolved',
          message: `The dispute for rental ${r.rental_ref || rental_id} has been resolved. Outcome: ${outcome}. ${resolution_notes}`,
          is_read: false
        }).catch(() => null);
      }

      return Response.json({ success: true, outcome });
    }

    if (action === 'add_comment') {
      const { rental_id, notes } = body;
      const rental = await base44.entities.RentalAgreement.filter({ id: rental_id });
      if (!rental.length) return Response.json({ error: 'Rental not found' }, { status: 404 });
      const r = rental[0];
      const isParty = r.borrower_id === user.id || r.lender_id === user.id || user.role === 'admin';
      if (!isParty) return Response.json({ error: 'Forbidden' }, { status: 403 });

      await base44.asServiceRole.entities.DisputeAuditLog.create({
        rental_agreement_id: rental_id,
        actor_user_id: user.id,
        actor_role: user.role === 'admin' ? 'Admin' : (r.borrower_id === user.id ? 'Borrower' : 'Lender'),
        action: 'Comment Added',
        notes,
        timestamp: new Date().toISOString()
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});