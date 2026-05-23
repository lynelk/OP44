/**
 * GnuGrid Validation — NIN, Phone, Personal Info & KYC Enquiry
 *
 * Endpoints:
 *   POST /v1/validate-nin           — ValidateNIN
 *   POST /v1/validate-phone         — PhoneValidation
 *   POST /v1/validate-personal-info — ValidatePersonalInformation
 *   POST /v1/kyc-enquiries/request/new — KYCEnquiry
 *
 * Usage:
 *   POST { action: "validate_nin", nin: "CM..." }
 *   POST { action: "validate_phone", phone_number: "25677..." }
 *   POST { action: "validate_personal_info", nin, document_id, surname?, given_name?, date_of_birth? }
 *   POST { action: "kyc_enquiry", identifier, identification_type, reason? }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getGnugridToken() {
  const baseUrl = Deno.env.get('GNUGRID_BASE_URL');
  const clientId = Deno.env.get('GNUGRID_CLIENT_ID');
  const clientSecret = Deno.env.get('GNUGRID_CLIENT_SECRET');
  if (!baseUrl || !clientId || !clientSecret) throw new Error('GnuGrid credentials not configured');

  const res = await fetch(`${baseUrl}/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  });
  if (!res.ok) throw new Error(`GnuGrid auth failed (${res.status}): ${await res.text()}`);
  const d = await res.json();
  if (!d.access_token) throw new Error(`GnuGrid auth: no token returned`);
  return d.access_token;
}

async function gnugridPost(path, payload) {
  const baseUrl = Deno.env.get('GNUGRID_BASE_URL');
  const token = await getGnugridToken();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ── Validate NIN ──────────────────────────────────────────────────────────
    if (action === 'validate_nin') {
      const { nin } = body;
      if (!nin) return Response.json({ error: 'nin is required' }, { status: 400 });

      const { ok, data } = await gnugridPost('/v1/validate-nin', { nin });
      const validation = data?.validation || {};

      // If NIN is valid, update UserProfile identity_verified
      if (validation.nin_status === 'VALID') {
        const profiles = await base44.asServiceRole.entities.UserProfile.filter({ user_id: user.id });
        if (profiles[0]) {
          await base44.asServiceRole.entities.UserProfile.update(profiles[0].id, {
            identity_verified: true,
            kyc_status: 'in_progress',
          });
        }
      }

      return Response.json({
        success: ok && validation.status === 'SUCCESSFUL',
        nin_status: validation.nin_status,
        name: validation.name,
        date_of_birth: validation.date_of_birth,
        cost: validation.cost,
        reference: validation.reference,
      });
    }

    // ── Validate Phone ────────────────────────────────────────────────────────
    if (action === 'validate_phone') {
      const { phone_number } = body;
      if (!phone_number) return Response.json({ error: 'phone_number is required' }, { status: 400 });

      const { ok, data } = await gnugridPost('/v1/validate-phone', { phonenumber: phone_number });
      const validation = data?.validation || {};

      return Response.json({
        success: ok && validation.status === 'SUCCESSFUL',
        phone_status: validation.phone_status,
        name: [validation.surname, validation.firstname, validation.middlename].filter(Boolean).join(' ') || null,
        cost: validation.cost,
        reference: validation.reference,
      });
    }

    // ── Validate Personal Information (NIN + document_id + name/DOB) ─────────
    if (action === 'validate_personal_info') {
      const { nin, document_id, surname, given_name, other_name, date_of_birth } = body;
      if (!nin || !document_id) return Response.json({ error: 'nin and document_id are required' }, { status: 400 });
      if (!surname && !given_name && !other_name && !date_of_birth) {
        return Response.json({ error: 'At least one of: surname, given_name, other_name, date_of_birth must be supplied' }, { status: 400 });
      }

      const { ok, data } = await gnugridPost('/v1/validate-personal-info', { nin, document_id, surname, given_name, other_name, date_of_birth });
      const validation = data?.validation || {};

      return Response.json({
        success: ok && validation.status === 'SUCCESSFUL',
        nin_status: validation.nin_status,
        matching_status: validation.matching_status,
        card_status: validation.card_status,
        cost: validation.cost,
        reference: validation.reference,
      });
    }

    // ── KYC Enquiry ───────────────────────────────────────────────────────────
    if (action === 'kyc_enquiry') {
      const { identifier, identification_type, reason } = body;
      if (!identifier || !identification_type) {
        return Response.json({ error: 'identifier and identification_type are required' }, { status: 400 });
      }

      const { ok, data } = await gnugridPost('/v1/kyc-enquiries/request/new', {
        identifier, entity_type: 0, identification_type,
        reason: reason || 'KYC verification for loan application',
        client_consented: 'Yes',
      });

      return Response.json({ success: ok, enquiry: data?.enquiry || data });
    }

    // ── Credit Enquiry ────────────────────────────────────────────────────────
    if (action === 'credit_enquiry') {
      // Admin only
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { identifier, identification_type, reason } = body;
      if (!identifier || !identification_type) {
        return Response.json({ error: 'identifier and identification_type are required' }, { status: 400 });
      }

      const { ok, data } = await gnugridPost('/v1/credit-enquiries/request/new', {
        identifier, entity_type: 0, identification_type,
        reason: reason || 'Loan application credit assessment',
        format: 'summary',
        client_consented: 'Yes',
      });

      return Response.json({ success: ok, enquiry: data?.enquiry || data });
    }

    return Response.json({ error: `Unknown action: ${action}. Valid: validate_nin, validate_phone, validate_personal_info, kyc_enquiry, credit_enquiry` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});