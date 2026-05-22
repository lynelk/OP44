import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Activity, CheckCircle, XCircle, Clock, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_STYLES = {
  active:    'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  timeout:   'bg-amber-100 text-amber-700',
  error:     'bg-red-100 text-red-700',
};

const ACTION_LABELS = {
  none:               'Browse',
  balance_check:      'Balance Check',
  loan_status:        'Loan Status',
  loan_application:   'Loan Application',
  repayment:          'Repayment',
  savings_deposit:    'Savings Deposit',
  savings_withdrawal: 'Savings Withdrawal',
};

export default function USSDMonitor() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.USSDSession.list('-created_date', 100);
    setSessions(data);
    setLoading(false);
  };

  const totalSessions   = sessions.length;
  const completed       = sessions.filter(s => s.status === 'completed').length;
  const transactions    = sessions.filter(s => !['none', 'balance_check', 'loan_status'].includes(s.action_taken)).length;
  const uniquePhones    = new Set(sessions.map(s => s.phone_number)).size;

  const stats = [
    { label: 'Total Sessions', value: totalSessions, icon: Wifi, color: 'text-blue-600' },
    { label: 'Completed',      value: completed,     icon: CheckCircle, color: 'text-emerald-600' },
    { label: 'Transactions',   value: transactions,  icon: Activity, color: 'text-purple-600' },
    { label: 'Unique Users',   value: uniquePhones,  icon: Phone, color: 'text-orange-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="bg-slate-900 text-white px-5 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Phone className="w-5 h-5 text-emerald-400" />
              <h1 className="text-xl font-bold">USSD Monitor</h1>
            </div>
            <p className="text-slate-400 text-sm">Africa's Talking session log</p>
          </div>
          <Button size="sm" variant="outline" onClick={load} className="border-slate-600 text-slate-300 hover:bg-slate-800">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {stats.map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No USSD sessions yet</p>
            <p className="text-xs mt-1">Sessions appear here once users dial in</p>
          </div>
        ) : (
          sessions.map(session => (
            <Card key={session.id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">{session.phone_number}</p>
                      <Badge className={`text-xs ${STATUS_STYLES[session.status] || STATUS_STYLES.active}`}>
                        {session.status}
                      </Badge>
                      {session.action_taken && session.action_taken !== 'none' && (
                        <Badge variant="outline" className="text-xs">
                          {ACTION_LABELS[session.action_taken] || session.action_taken}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      Session: <span className="font-mono">{session.session_id?.slice(0, 16)}…</span>
                    </p>

                    {session.response_text && (
                      <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded p-2 font-mono leading-relaxed line-clamp-3">
                        {session.response_text}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(session.created_date).toLocaleString('en-UG', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <span>{session.steps} steps</span>
                      {session.amount && <span>UGX {Number(session.amount).toLocaleString()}</span>}
                      <span className="capitalize">{session.gateway?.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}