'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { useAdmin } from '@/hooks/use-admin';
import { Bell, Plus, Send, Users, Store, User, Trash2, CircleAlert as AlertCircle, Info, CircleCheck as CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  target_audience: string;
  created_at: string;
  sent_count: number;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  info: <Info className="w-4 h-4 text-blue-500" />,
  success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  warning: <AlertCircle className="w-4 h-4 text-amber-500" />,
  promo: <Bell className="w-4 h-4 text-purple-500" />,
};

export default function NotificationsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const supabase = createClient();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'info',
    target_audience: 'all_customers',
  });

  const load = async () => {
    const { data } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, supabase]);

  const handleSend = async () => {
    if (!form.title || !form.body) return;
    setSending(true);
    const { error } = await supabase.from('admin_notifications').insert({
      title: form.title,
      body: form.body,
      type: form.type,
      target_audience: form.target_audience,
      sent_count: 0,
    });
    if (error) {
      toast({ title: 'Error sending notification', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Notification sent' });
      setForm({ title: '', body: '', type: 'info', target_audience: 'all_customers' });
      setShowForm(false);
      await load();
    }
    setSending(false);
  };

  const deleteNotification = async (id: string) => {
    if (!confirm('Delete this notification?')) return;
    await supabase.from('admin_notifications').delete().eq('id', id);
    await load();
    toast({ title: 'Notification deleted' });
  };

  const AUDIENCE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
    all_customers: { label: 'All Customers', icon: <Users className="w-3 h-3" /> },
    all_sellers: { label: 'All Sellers', icon: <Store className="w-3 h-3" /> },
    all_users: { label: 'Everyone', icon: <User className="w-3 h-3" /> },
  };

  if (adminLoading) return null;

  return (
    <AdminBaazarShell title="Notifications" subtitle="Send platform-wide announcements">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(v => !v)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Send Notification'}
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold mb-4">New Notification</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Target Audience</Label>
                  <select value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))} className="mt-1.5 h-9 w-full border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                    <option value="all_customers">All Customers</option>
                    <option value="all_sellers">All Sellers</option>
                    <option value="all_users">Everyone</option>
                  </select>
                </div>
                <div>
                  <Label>Type</Label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="mt-1.5 h-9 w-full border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="promo">Promotion</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Title <span className="text-red-500">*</span></Label>
                <Input className="mt-1.5 h-9" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. New Ramadan Deals Available" />
              </div>
              <div>
                <Label>Message <span className="text-red-500">*</span></Label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  rows={3}
                  className="mt-1.5 w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Write your notification message..."
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSend} disabled={sending || !form.title || !form.body} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Notification'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Sent Notifications</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 animate-pulse"><div className="h-14 bg-gray-100 rounded" /></div>
              ))
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No notifications sent yet</p>
              </div>
            ) : notifications.map(n => (
              <div key={n.id} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  {TYPE_ICONS[n.type] ?? <Bell className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 flex items-center gap-1">
                      {AUDIENCE_LABELS[n.target_audience]?.icon}
                      {AUDIENCE_LABELS[n.target_audience]?.label ?? n.target_audience}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => deleteNotification(n.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminBaazarShell>
  );
}
