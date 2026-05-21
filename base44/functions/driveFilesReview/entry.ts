import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const headers = { Authorization: `Bearer ${accessToken}` };

    // Search for files shared with me or pending review (sharedWithMe or waiting for my action)
    const query = encodeURIComponent(
      `(sharedWithMe = true or 'me' in writers) and trashed = false`
    );
    const fields = encodeURIComponent(
      'files(id,name,mimeType,modifiedTime,createdTime,owners,sharingUser,webViewLink,iconLink,size,parents,permissions)'
    );

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime+desc&pageSize=50`,
      { headers }
    );

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: err.error?.message || 'Drive API error' }, { status: res.status });
    }

    const data = await res.json();
    const files = (data.files || []).filter(f => {
      // Filter to files likely awaiting review: shared with me, not owned by me
      const isShared = f.sharingUser && f.sharingUser.emailAddress;
      const hasCommentPermission = f.permissions?.some(p =>
        p.type === 'user' && (p.role === 'commenter' || p.role === 'writer')
      );
      return isShared || hasCommentPermission;
    });

    return Response.json({ files });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});