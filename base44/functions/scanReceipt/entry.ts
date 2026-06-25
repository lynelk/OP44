import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // AI receipt scanning is temporarily disabled to conserve integration credits.
  // Return a placeholder so the UI can prompt manual entry instead.
  return Response.json({
    amount: null,
    merchant: '',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    description: '',
    confidence: 0,
    disabled: true,
    message: 'Receipt scanning is temporarily unavailable. Please enter the details manually.',
  });
});