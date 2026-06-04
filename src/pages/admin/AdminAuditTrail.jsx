import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Search, RefreshCw, FileText, User, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const ACTION_COLORS = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-orange-100 text-orange-700',
  flagged: 'bg-yellow-100 text-yellow-700',
};

// Normalise a stored `changes` value (JSON string or object) into safe pretty text.
function formatChanges(changes) {
  try {
    const obj = typeof changes === 'string' ? JSON.parse(changes) : changes;
    return JSON.stringify(obj, null, 2);
  } catch {
    // Not valid JSON — render as a plain string (React still escapes it).
    return String(changes);
  }
}

export default function AdminAuditTrail() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    const [logsRes, usersRes] = await Promise.all([
      base44.entities.DisputeAuditLog.filter({}, '-created_date', 200),
      base44.functions.invoke('adminManager', { action: 'list', entity: 'users' }),
    ]);
    const userMap = {};
    (usersRes.data?.users || []).forEach(u => { userMap[u.id] = u; });
    setLogs(logsRes);
    setUsers(userMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const entities = [...new Set(logs.map(l => l.entity_type).filter(Boolean))];
  const actions = [...new Set(logs.map(l => l.action).filter(Boolean))];

  const filtered = logs.filter(l => {
    const u = users[l.performed_by] || {};
    const matchSearch = !search
      || l.entity_id?.includes(search)
      || l.entity_type?.toLowerCase().includes(search.toLowerCase())
      || u.full_name?.toLowerCase().includes(search.toLowerCase())
      || l.action?.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'all' || l.action === filterAction;
    const matchEntity = filterEntity === 'all' || l.entity_type === filterEntity;
    return matchSearch && matchAction && matchEntity;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#1a3a6b] text-white px-4 pt-10 pb-5">
        <Link to="/admin" className="flex items-center gap-1 text-blue-200 text-sm mb-3">
          <ChevronLeft className="w-4 h-4" /> Admin
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5" /> Audit Trail
            </h1>
            <p className="text-blue-200 text-xs">{logs.length} total entries</p>
          </div>
          <button onClick={load} className="p-2 bg-white/15 rounded-full">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input className="pl-9 text-sm" placeholder="Search entity, actor, action..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="flex-1 text-xs"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="flex-1 text-xs"><SelectValue placeholder="Entity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {entities.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-10"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No audit entries found</p>
          </div>
        ) : filtered.map(log => {
          const actor = users[log.performed_by];
          const isExpanded = expanded === log.id;
          return (
            <Card key={log.id} className="cursor-pointer" onClick={() => setExpanded(isExpanded ? null : log.id)}>
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                      {actor ? actor.full_name?.[0] || actor.email?.[0] || '?' : '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {actor?.full_name || actor?.email || log.performed_by_email || log.performed_by || 'System'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {log.entity_type} · {log.entity_id?.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action || 'action'}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {log.created_date ? new Date(log.created_date).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </p>
                  </div>
                </div>
                {log.notes && <p className="text-xs text-gray-500 mt-2 pl-10 truncate">{log.notes}</p>}
                {isExpanded && log.changes && (
                  <div className="mt-2 ml-10 bg-gray-50 rounded-lg p-2">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Changes</p>
                    {/* React escapes text children, so this cannot inject HTML. We also
                        normalise through JSON.parse/stringify to pretty-print and strip
                        anything that isn't valid serialised data. */}
                    <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-all">
                      {formatChanges(log.changes)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
