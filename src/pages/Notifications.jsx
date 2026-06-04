import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCheck, ChevronRight, AlertTriangle, CreditCard, PiggyBank, Trophy, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationRoute } from '@/lib/notificationRoutes';

const TYPE_CONFIG = {
  repayment_due: { icon: CreditCard, color: 'text-red-500', bg: 'bg-red-50' },
  loan_approved: { icon: CreditCard, color: 'text-[#006B3C]', bg: 'bg-[#006B3C]/10' },
  loan_rejected: { icon: CreditCard, color: 'text-red-500', bg: 'bg-red-50' },
  savings_goal: { icon: PiggyBank, color: 'text-[#7BC943]', bg: 'bg-[#7BC943]/10' },
  gamification: { icon: Trophy, color: 'text-[#F4B400]', bg: 'bg-[#F4B400]/10' },
  nudge: { icon: AlertTriangle, color: 'text-[#F4B400]', bg: 'bg-[#F4B400]/10' },
  system: { icon: Bell, color: 'text-[#006B3C]', bg: 'bg-[#006B3C]/10' },
  kyc_update: { icon: Settings, color: 'text-[#006B3C]', bg: 'bg-[#006B3C]/10' },
  rosca_contribution: { icon: PiggyBank, color: 'text-[#7BC943]', bg: 'bg-[#7BC943]/10' },
};

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-[#F4B400]/10 text-[#006B3C]',
  medium: 'bg-[#006B3C]/10 text-[#006B3C]',
  low: 'bg-gray-100 text-gray-600',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [marking, setMarking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.Notification.filter({}, '-created_date', 100).then(ns =>
      setNotifications(ns.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)))
    );
  }, []);

  const markAllRead = async () => {
    setMarking(true);
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setMarking(false);
  };

  const markRead = async (id) => {
    await base44.entities.Notification.update(id, { is_read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleOpen = (notif) => {
    if (!notif.is_read) markRead(notif.id);
    const route = notificationRoute(notif);
    if (route) navigate(route);
  };

  const filtered = filter === 'all' ? notifications
    : filter === 'unread' ? notifications.filter(n => !n.is_read)
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-[#004d2b] via-[#006B3C] to-[#007a44] text-white px-4 pt-14 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-green-200 text-sm">{unreadCount} unread</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="outline" className="border-green-300 text-white bg-white/10 text-xs"
                onClick={markAllRead} disabled={marking}>
                <CheckCheck className="w-3 h-3 mr-1" /> Mark All Read
              </Button>
            )}
            <button onClick={() => navigate('/notification-settings')}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center" aria-label="Notification settings">
              <Settings className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-b">
        {['all', 'unread', 'nudge', 'repayment_due', 'gamification'].map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-[#006B3C] text-white' : 'bg-gray-100 text-gray-600'}`}>
            {f === 'nudge' ? '⚠️ Budget' : f === 'repayment_due' ? '💳 Repayment' : f === 'gamification' ? '🏆 Rewards' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="px-4 mt-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No notifications</p>
          </div>
        ) : filtered.map(notif => {
          const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
          const Icon = cfg.icon;
          const route = notificationRoute(notif);
          return (
            <Card key={notif.id} className={`shadow-sm cursor-pointer ${!notif.is_read ? 'border-l-4 border-l-[#006B3C]' : ''}`}
              onClick={() => handleOpen(notif)}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium leading-tight ${!notif.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {notif.title}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge className={`text-xs px-1.5 py-0 ${PRIORITY_COLORS[notif.priority] || PRIORITY_COLORS.medium}`}>
                          {notif.priority}
                        </Badge>
                        {!notif.is_read && <div className="w-2 h-2 rounded-full bg-[#7BC943]" />}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{notif.body}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">{timeAgo(notif.created_date)}</span>
                      {route && (
                        <span className="flex items-center gap-0.5 text-xs text-[#006B3C] font-medium">
                          View <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}