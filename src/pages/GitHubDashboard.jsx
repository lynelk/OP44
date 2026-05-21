import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitBranch, GitPullRequest, AlertCircle, GitCommit, RefreshCw, ExternalLink, Star, Eye } from 'lucide-react';

export default function GitHubDashboard() {
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [prs, setPrs] = useState([]);
  const [issues, setIssues] = useState([]);
  const [commits, setCommits] = useState([]);
  const [ghUser, setGhUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);

  const invoke = (action, extra = {}) =>
    base44.functions.invoke('githubRepos', { action, ...extra });

  useEffect(() => {
    Promise.all([
      invoke('list_repos'),
      invoke('get_user'),
    ]).then(([reposRes, userRes]) => {
      setRepos(reposRes.data.repos || []);
      setGhUser(userRes.data.user);
    }).finally(() => setLoading(false));
  }, []);

  const loadRepoDetails = async (repo) => {
    setSelectedRepo(repo);
    setTabLoading(true);
    const [owner, name] = repo.full_name.split('/');
    const [prsRes, issuesRes, commitsRes] = await Promise.all([
      invoke('list_prs', { owner, repo: name }),
      invoke('list_issues', { owner, repo: name }),
      invoke('list_commits', { owner, repo: name }),
    ]);
    setPrs(prsRes.data.prs || []);
    setIssues((issuesRes.data.issues || []).filter(i => !i.pull_request));
    setCommits(commitsRes.data.commits || []);
    setTabLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">GitHub Dashboard</h1>
              {ghUser && <p className="text-sm text-slate-500">@{ghUser.login} · {ghUser.public_repos} repos</p>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Repo List */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Repositories ({repos.length})</h2>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {repos.map(repo => (
                <Card
                  key={repo.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedRepo?.id === repo.id ? 'border-slate-800 shadow-md' : ''}`}
                  onClick={() => loadRepoDetails(repo)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate text-sm">{repo.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{repo.description || 'No description'}</p>
                      </div>
                      <a href={repo.html_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-2 hover:text-slate-700 flex-shrink-0" />
                      </a>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-slate-500"><Star className="w-3 h-3" />{repo.stargazers_count}</span>
                      <span className="flex items-center gap-1 text-xs text-slate-500"><Eye className="w-3 h-3" />{repo.watchers_count}</span>
                      {repo.language && <Badge variant="secondary" className="text-xs py-0">{repo.language}</Badge>}
                      {repo.private && <Badge className="text-xs py-0 bg-amber-100 text-amber-700">Private</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Repo Details */}
          <div className="lg:col-span-2">
            {!selectedRepo ? (
              <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-400">Select a repository to view details</p>
              </div>
            ) : tabLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    {selectedRepo.full_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="prs">
                    <TabsList className="mb-4">
                      <TabsTrigger value="prs">
                        <GitPullRequest className="w-4 h-4 mr-1" /> PRs ({prs.length})
                      </TabsTrigger>
                      <TabsTrigger value="issues">
                        <AlertCircle className="w-4 h-4 mr-1" /> Issues ({issues.length})
                      </TabsTrigger>
                      <TabsTrigger value="commits">
                        <GitCommit className="w-4 h-4 mr-1" /> Commits
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="prs" className="space-y-2 max-h-96 overflow-y-auto">
                      {prs.length === 0 ? <p className="text-slate-400 text-sm">No open pull requests</p> :
                        prs.map(pr => (
                          <div key={pr.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{pr.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">#{pr.number} by {pr.user?.login} · {new Date(pr.created_at).toLocaleDateString()}</p>
                            </div>
                            <a href={pr.html_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 ml-2 flex-shrink-0" />
                            </a>
                          </div>
                        ))
                      }
                    </TabsContent>

                    <TabsContent value="issues" className="space-y-2 max-h-96 overflow-y-auto">
                      {issues.length === 0 ? <p className="text-slate-400 text-sm">No open issues</p> :
                        issues.map(issue => (
                          <div key={issue.id} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{issue.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">#{issue.number} by {issue.user?.login} · {new Date(issue.created_at).toLocaleDateString()}</p>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {issue.labels?.map(l => (
                                  <span key={l.id} className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `#${l.color}22`, color: `#${l.color}` }}>{l.name}</span>
                                ))}
                              </div>
                            </div>
                            <a href={issue.html_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 ml-2 flex-shrink-0" />
                            </a>
                          </div>
                        ))
                      }
                    </TabsContent>

                    <TabsContent value="commits" className="space-y-2 max-h-96 overflow-y-auto">
                      {commits.length === 0 ? <p className="text-slate-400 text-sm">No commits found</p> :
                        commits.map(c => (
                          <div key={c.sha} className="flex items-start justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{c.commit?.message?.split('\n')[0]}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{c.sha?.slice(0, 7)} · {c.commit?.author?.name} · {new Date(c.commit?.author?.date).toLocaleDateString()}</p>
                            </div>
                            <a href={c.html_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 ml-2 flex-shrink-0" />
                            </a>
                          </div>
                        ))
                      }
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}