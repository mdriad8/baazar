'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/hooks/use-admin';
import AdminBaazarShell from '@/components/admin/AdminBaazarShell';
import { cn } from '@/lib/utils';
import { Headphones, Search, ChevronDown, ChevronUp, Send, Clock, CircleCheck as CheckCircle2, Circle as XCircle, CircleAlert as AlertCircle, Mail, Tag, Calendar, MessageSquare, Loader as Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SupportMessage {
  id: string;
  body: string;
  is_staff: boolean;
  created_at: string;
}

interface Ticket {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  contact_email: string;
  created_at: string;
  updated_at: string;
  support_messages: SupportMessage[];
}

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  in_progress: { label: 'In Progress', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  resolved: { label: 'Resolved', color: 'text-green-700 bg-green-50 border-green-200' },
  closed: { label: 'Closed', color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-600 bg-gray-50 border-gray-200' },
  normal: { label: 'Normal', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  high: { label: 'High', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  urgent: { label: 'Urgent', color: 'text-red-700 bg-red-50 border-red-200' },
};

export default function AdminSupportPage() {
  const { isAdmin, checking } = useAdmin();
  const supabase = createClient();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        id, ticket_number, user_id, subject, description, category,
        status, priority, contact_email, created_at, updated_at,
        support_messages(id, body, is_staff, created_at)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading tickets', description: error.message, variant: 'destructive' });
    } else {
      setTickets((data as unknown as Ticket[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const updateStatus = async (ticketId: string, status: string) => {
    setUpdatingStatus(ticketId);
    const { error } = await supabase
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId);
    if (!error) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
    }
    setUpdatingStatus(null);
  };

  const sendReply = async (ticketId: string) => {
    const text = replyTexts[ticketId]?.trim();
    if (!text) return;
    setSendingReply(ticketId);
    const { error } = await supabase.from('support_messages').insert({
      ticket_id: ticketId,
      body: text,
      is_staff: true,
    });
    if (!error) {
      setReplyTexts(prev => ({ ...prev, [ticketId]: '' }));
      // auto-move to in_progress if still open
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket?.status === 'open') {
        await updateStatus(ticketId, 'in_progress');
      }
      await load();
    }
    setSendingReply(null);
  };

  const filtered = tickets.filter(t => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || t.subject.toLowerCase().includes(q)
      || (t.contact_email ?? '').toLowerCase().includes(q)
      || t.category.toLowerCase().includes(q)
      || (t.ticket_number ?? '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  if (checking) return null;

  return (
    <AdminBaazarShell>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{tickets.length} total tickets</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'open', label: 'Open', icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
            { key: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { key: 'resolved', label: 'Resolved', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
            { key: 'closed', label: 'Closed', icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-100' },
          ].map(s => (
            <div key={s.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', s.bg)}>
                <s.icon className={cn('w-5 h-5', s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{counts[s.key as keyof typeof counts]}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by subject, email, category..."
              className="w-full pl-9 pr-3 h-9 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', ...STATUS_OPTIONS] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
                  statusFilter === s
                    ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                )}
              >
                {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label ?? s}
                {' '}
                <span className="opacity-60">({counts[s as keyof typeof counts] ?? 0})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ticket list */}
        <div className="space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-20" />
            ))
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-14 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-7 h-7 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">No tickets found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'No support tickets yet.'}
              </p>
            </div>
          ) : filtered.map(ticket => {
            const isExpanded = expanded === ticket.id;
            const sc = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
            const pc = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.normal;
            const messages = [...(ticket.support_messages ?? [])].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            const replyText = replyTexts[ticket.id] ?? '';

            return (
              <div key={ticket.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Ticket header row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : ticket.id)}
                  className="w-full flex items-start gap-4 p-4 text-left hover:bg-gray-50/80 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-sm text-gray-900">{ticket.subject}</p>
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize', sc.color)}>
                        {sc.label}
                      </span>
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize', pc.color)}>
                        {pc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {ticket.contact_email || 'No email'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {ticket.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ticket.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                  }
                </button>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Status controls */}
                    <div className="flex items-center gap-2 flex-wrap px-4 py-3 bg-gray-50/60 border-b border-gray-100">
                      <span className="text-xs font-medium text-gray-500 mr-1">Set status:</span>
                      {STATUS_OPTIONS.map(s => (
                        <button
                          key={s}
                          disabled={ticket.status === s || updatingStatus === ticket.id}
                          onClick={() => updateStatus(ticket.id, s)}
                          className={cn(
                            'text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all',
                            ticket.status === s
                              ? cn(STATUS_CONFIG[s].color, 'opacity-100 cursor-default')
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                          )}
                        >
                          {updatingStatus === ticket.id && ticket.status !== s ? STATUS_CONFIG[s].label : STATUS_CONFIG[s].label}
                        </button>
                      ))}
                    </div>

                    {/* Conversation */}
                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto bg-gray-50/30">
                      {/* Initial description */}
                      {ticket.description && (
                        <div className="flex justify-end">
                          <div className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm bg-[hsl(var(--primary))] text-white">
                            <p className="text-[10px] font-semibold text-white/70 mb-1">
                              {ticket.contact_email || 'Customer'} · Initial message
                            </p>
                            <p>{ticket.description}</p>
                            <p className="text-[10px] mt-1 text-white/60">
                              {new Date(ticket.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      )}

                      {messages.map(msg => (
                        <div key={msg.id} className={cn('flex', msg.is_staff ? 'justify-start' : 'justify-end')}>
                          <div className={cn(
                            'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm',
                            msg.is_staff
                              ? 'bg-white border border-gray-200 text-gray-700 rounded-tl-sm'
                              : 'bg-[hsl(var(--primary))] text-white rounded-tr-sm'
                          )}>
                            <p className={cn('text-[10px] font-semibold mb-1', msg.is_staff ? 'text-[hsl(var(--primary))]' : 'text-white/70')}>
                              {msg.is_staff ? 'Support Team (Admin)' : ticket.contact_email || 'Customer'}
                            </p>
                            <p>{msg.body}</p>
                            <p className={cn('text-[10px] mt-1', msg.is_staff ? 'text-gray-400' : 'text-white/60')}>
                              {new Date(msg.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}

                      {messages.length === 0 && !ticket.description && (
                        <p className="text-center text-xs text-gray-400 py-4">No messages yet.</p>
                      )}
                    </div>

                    {/* Reply box */}
                    {ticket.status !== 'closed' && (
                      <div className="p-4 border-t border-gray-100 bg-white">
                        <div className="flex gap-2">
                          <input
                            value={replyText}
                            onChange={e => setReplyTexts(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                            placeholder="Type a reply to the customer..."
                            className="flex-1 h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))]"
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(ticket.id); } }}
                          />
                          <button
                            onClick={() => sendReply(ticket.id)}
                            disabled={!replyText.trim() || sendingReply === ticket.id}
                            className="px-4 h-10 bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-all"
                          >
                            {sendingReply === ticket.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Send className="w-4 h-4" />
                            }
                            Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AdminBaazarShell>
  );
}
