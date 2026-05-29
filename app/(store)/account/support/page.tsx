'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';
import { Headphones, Plus, ChevronDown, ChevronUp, MessageSquare, Clock, CircleCheck as CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import AccountLayout from '@/components/account/AccountLayout';

interface SupportMessage {
  body: string;
  is_staff: boolean;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  description: string;
  created_at: string;
  updated_at: string;
  support_messages: SupportMessage[];
}

const STATUS_COLORS: Record<string, string> = {
  open: 'text-blue-700 bg-blue-50 border-blue-200',
  in_progress: 'text-amber-700 bg-amber-50 border-amber-200',
  resolved: 'text-green-700 bg-green-50 border-green-200',
  closed: 'text-gray-600 bg-gray-50 border-gray-200',
};

const CATEGORIES = [
  'Order Issue',
  'Delivery Problem',
  'Product Quality',
  'Refund / Return',
  'Account Issue',
  'Payment Problem',
  'General Enquiry',
  'Other',
];

export default function SupportPage() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: '', category: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  // Pre-fill form when arriving from order detail with ?order=&type=refund
  useEffect(() => {
    const orderNum = searchParams.get('order');
    const type = searchParams.get('type');
    if (orderNum && type === 'refund') {
      setForm({
        subject: `Return/Refund Request — ${orderNum}`,
        category: 'Refund / Return',
        description: `I would like to request a return/refund for order ${orderNum}.\n\nReason: `,
      });
      setShowForm(true);
    }
  }, [searchParams]);

  const fetchTickets = async () => {
    if (!user) return;
    setFetching(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('id, subject, category, status, priority, description, created_at, updated_at, support_messages(body, is_staff, created_at)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    setTickets((data as unknown as Ticket[]) ?? []);
    setFetching(false);
  };

  useEffect(() => {
    if (user) fetchTickets();
  }, [user]);

  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        contact_email: user.email ?? '',
        subject: form.subject,
        category: form.category,
        description: form.description,
        status: 'open',
        priority: 'normal',
      });
    toast({ title: 'Support ticket submitted', description: "We'll get back to you within 24 hours." });
    setForm({ subject: '', category: '', description: '' });
    setShowForm(false);
    fetchTickets();
    setSaving(false);
  };

  const sendReply = async (ticketId: string) => {
    const text = replyTexts[ticketId]?.trim();
    if (!text || !user) return;
    await supabase.from('support_messages').insert({
      ticket_id: ticketId,
      user_id: user.id,
      body: text,
      is_staff: false,
    });
    setReplyTexts(prev => ({ ...prev, [ticketId]: '' }));
    fetchTickets();
  };

  if (loading) return (
    <AccountLayout>
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-20" />
        ))}
      </div>
    </AccountLayout>
  );
  if (!user) return null;

  return (
    <AccountLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Support</h1>
            <p className="text-sm text-muted-foreground mt-0.5">We're here to help</p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2 text-sm" size="sm">
              <Plus className="w-4 h-4" /> New Ticket
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: MessageSquare, label: 'Chat Support', sub: 'Mon–Fri 9am–6pm', color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: Clock, label: 'Avg Response', sub: 'Within 24 hours', color: 'text-amber-600', bg: 'bg-amber-50' },
            { icon: CheckCircle2, label: 'Resolution Rate', sub: '97% satisfied', color: 'text-green-600', bg: 'bg-green-50' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2', card.bg)}>
                <card.icon className={cn('w-4 h-4', card.color)} />
              </div>
              <p className="font-semibold text-xs text-gray-900">{card.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold mb-5">New Support Ticket</h2>
            <form onSubmit={submitTicket} className="space-y-4">
              <div>
                <Label>Category</Label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="mt-1.5 h-10 w-full border border-gray-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))]"
                  required
                >
                  <option value="">Select a category...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input
                  className="mt-1.5 h-10"
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Brief summary of your issue"
                  required
                />
              </div>
              <div>
                <Label>Message</Label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="mt-1.5 w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))]"
                  placeholder="Describe your issue in detail..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={saving} className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white gap-2">
                  {saving ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit Ticket</>}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        )}

        <div>
          <h2 className="font-semibold text-sm text-gray-700 mb-3">Your Tickets</h2>
          {fetching ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-7 h-7 text-blue-300" />
              </div>
              <p className="font-semibold text-gray-700">No support tickets</p>
              <p className="text-sm text-muted-foreground mt-1">Have an issue? Create a support ticket and we'll help.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map(ticket => {
                const isExpanded = expanded === ticket.id;
                const messages = (ticket.support_messages ?? []).slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                const replyText = replyTexts[ticket.id] ?? '';
                return (
                  <div key={ticket.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : ticket.id)}
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm truncate">{ticket.subject}</p>
                          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize', STATUS_COLORS[ticket.status] ?? STATUS_COLORS.open)}>
                            {ticket.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {ticket.category} · {new Date(ticket.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-3">
                        {ticket.description && (
                          <div className="flex justify-end">
                            <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm bg-[hsl(var(--primary))] text-white">
                              <p>{ticket.description}</p>
                              <p className="text-[10px] mt-1 text-white/60">
                                {new Date(ticket.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        )}
                        {messages.map((msg, idx) => (
                          <div key={idx} className={cn('flex', msg.is_staff ? 'justify-start' : 'justify-end')}>
                            <div className={cn(
                              'max-w-[80%] px-4 py-2.5 rounded-2xl text-sm',
                              msg.is_staff
                                ? 'bg-white border border-gray-200 text-gray-700 rounded-tl-sm'
                                : 'bg-[hsl(var(--primary))] text-white rounded-tr-sm'
                            )}>
                              {msg.is_staff && <p className="text-[10px] font-semibold text-[hsl(var(--primary))] mb-1">Support Team</p>}
                              <p>{msg.body}</p>
                              <p className={cn('text-[10px] mt-1', msg.is_staff ? 'text-gray-400' : 'text-white/60')}>
                                {new Date(msg.created_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}

                        {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                          <div className="flex gap-2 pt-2">
                            <Input
                              value={replyText}
                              onChange={e => setReplyTexts(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                              placeholder="Type a reply..."
                              className="h-9 text-sm"
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(ticket.id); } }}
                            />
                            <Button
                              size="sm"
                              onClick={() => sendReply(ticket.id)}
                              disabled={!replyText.trim()}
                              className="bg-[hsl(var(--primary))] hover:bg-[hsl(142,74%,24%)] text-white h-9 px-3 flex-shrink-0"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  );
}
