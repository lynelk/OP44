import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_ICON = {
  success: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
  failed:  <XCircle className="w-3.5 h-3.5 text-red-500" />,
  pending: <Clock className="w-3.5 h-3.5 text-yellow-500" />,
};

export default function AutoSaveHistory({ userId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AutoSaveLog.filter({ user_id: userId })
      .then(data => {
        setLogs(data.sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at)).slice(0, 20));
        setLoading(false);
      });
  }, [userId]);

  if (loading) return null;
  if (logs.length === 0) return (
    <p className="text-xs text-slate-400 text-center py-4">No auto-save transactions yet</p>
  );

  return (
    <div className="space-y-2">
      {logs.map(log => (
        <Card key={log.id} className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {STATUS_ICON[log.status] || STATUS_ICON.success}
              <div>
                <p className="text-xs font-medium text-slate-700">{log.pocket_name}</p>
                <p className="text-xs text-slate-400">
                  {new Date(log.executed_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })} · {log.frequency}
                </p>
              </div>
            </div>
            <p className="text-sm font-bold text-emerald-600">+UGX {log.amount?.toLocaleString()}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}