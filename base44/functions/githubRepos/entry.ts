import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    };

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list_repos';

    if (action === 'list_repos') {
      const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', { headers });
      const repos = await res.json();
      return Response.json({ repos });
    }

    if (action === 'list_prs') {
      const { owner, repo } = body;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=30`, { headers });
      const prs = await res.json();
      return Response.json({ prs });
    }

    if (action === 'list_issues') {
      const { owner, repo } = body;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=30`, { headers });
      const issues = await res.json();
      return Response.json({ issues });
    }

    if (action === 'list_commits') {
      const { owner, repo } = body;
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=20`, { headers });
      const commits = await res.json();
      return Response.json({ commits });
    }

    if (action === 'get_user') {
      const res = await fetch('https://api.github.com/user', { headers });
      const ghUser = await res.json();
      return Response.json({ user: ghUser });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});