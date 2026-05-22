import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { image_url } = await req.json();
  if (!image_url) return Response.json({ error: 'image_url required' }, { status: 400 });

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a receipt OCR assistant. Analyze this receipt image and extract:
1. Total amount paid (numeric only, in UGX or local currency - if currency symbol present convert to a number)
2. Merchant/store name
3. Best matching expense category from this list: food, transport, housing, health, education, entertainment, utilities, clothing, savings, loan_repayment, other
4. Date of transaction (YYYY-MM-DD format, use today if not visible)
5. A short description (merchant name + main item if visible)

Be precise. If amount is unclear, give your best estimate. Always return valid JSON.`,
    file_urls: [image_url],
    response_json_schema: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        merchant: { type: 'string' },
        category: { type: 'string' },
        date: { type: 'string' },
        description: { type: 'string' },
        confidence: { type: 'number', description: '0-1 confidence score' },
      },
    },
  });

  return Response.json(result);
});