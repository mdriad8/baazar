'use client';

import { useEffect, useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { cn } from '@/lib/utils';

interface Props {
  sellerId: string;
}

export default function SellerRatingWidget({ sellerId }: Props) {
  const supabase = createClient();
  const { user } = useAuth();

  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [hovered, setHovered] = useState(0);
  const [existing, setExisting] = useState<{ id: string; rating: number; comment: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [recentRatings, setRecentRatings] = useState<{ id: string; rating: number; comment: string | null; created_at: string; customer_profiles: { first_name: string; last_name: string } | null }[]>([]);

  useEffect(() => {
    loadRatings();
    if (user) loadMine();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sellerId]);

  const loadRatings = async () => {
    const { data } = await supabase
      .from('seller_ratings')
      .select('id, rating, comment, created_at, user_id')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) {
      const enriched = await Promise.all(
        data.map(async (r) => {
          const { data: cp } = await supabase
            .from('customer_profiles')
            .select('first_name, last_name')
            .eq('user_id', r.user_id)
            .maybeSingle();
          return { ...r, customer_profiles: cp };
        })
      );
      setRecentRatings(enriched);
    }
  };

  const loadMine = async () => {
    const { data } = await supabase
      .from('seller_ratings')
      .select('id, rating, comment')
      .eq('seller_id', sellerId)
      .eq('user_id', user!.id)
      .maybeSingle();
    if (data) {
      setExisting(data);
      setMyRating(data.rating);
      setMyComment(data.comment ?? '');
    }
  };

  const handleSubmit = async () => {
    if (!user || myRating === 0) return;
    setSubmitting(true);
    if (existing) {
      await supabase.from('seller_ratings').update({ rating: myRating, comment: myComment || null, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('seller_ratings').insert({ seller_id: sellerId, user_id: user.id, rating: myRating, comment: myComment || null });
    }
    setSubmitting(false);
    setSubmitted(true);
    setShowForm(false);
    await loadRatings();
    await loadMine();
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleDelete = async () => {
    if (!existing) return;
    setSubmitting(true);
    await supabase.from('seller_ratings').delete().eq('id', existing.id);
    setExisting(null);
    setMyRating(0);
    setMyComment('');
    setSubmitting(false);
    setShowForm(false);
    await loadRatings();
  };

  const LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[hsl(var(--primary))]" />
          Customer Ratings
        </h3>
        {user && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs font-medium text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30 px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--primary))]/5 transition-colors"
          >
            {existing ? 'Edit your rating' : 'Rate this seller'}
          </button>
        )}
      </div>

      {/* Rating form */}
      {showForm && user && (
        <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            {existing ? 'Update your rating' : 'How would you rate this seller?'}
          </p>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setMyRating(s)}
                className="transition-transform hover:scale-110"
              >
                <Star className={cn('w-8 h-8 transition-colors', (hovered || myRating) >= s ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200')} />
              </button>
            ))}
            {(hovered || myRating) > 0 && (
              <span className="ml-2 text-sm font-medium text-gray-600">{LABELS[(hovered || myRating) - 1]}</span>
            )}
          </div>
          <textarea
            value={myComment}
            onChange={e => setMyComment(e.target.value)}
            placeholder="Leave an optional comment..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))] mt-2"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSubmit}
              disabled={submitting || myRating === 0}
              className="px-4 py-1.5 bg-[hsl(var(--primary))] text-white text-xs font-semibold rounded-lg hover:bg-[hsl(142,74%,24%)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Saving...' : existing ? 'Update Rating' : 'Submit Rating'}
            </button>
            <button
              onClick={() => { setShowForm(false); if (existing) { setMyRating(existing.rating); setMyComment(existing.comment ?? ''); } }}
              className="px-4 py-1.5 text-gray-600 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            {existing && (
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="px-4 py-1.5 text-red-600 text-xs font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors ml-auto"
              >
                Remove rating
              </button>
            )}
          </div>
        </div>
      )}

      {submitted && (
        <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium">
          Thank you for your rating!
        </div>
      )}

      {!user && (
        <p className="text-xs text-gray-500 mb-4">
          <a href="/auth/login" className="text-[hsl(var(--primary))] hover:underline font-medium">Sign in</a> to rate this seller.
        </p>
      )}

      {/* Recent ratings list */}
      {recentRatings.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">No ratings yet. Be the first to rate this seller!</p>
      ) : (
        <div className="space-y-3">
          {recentRatings.map(r => {
            const name = r.customer_profiles
              ? `${r.customer_profiles.first_name} ${r.customer_profiles.last_name[0]}.`
              : 'Customer';
            return (
              <div key={r.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                  {name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-800">{name}</span>
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={cn('w-3 h-3', s <= r.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200')} />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  {r.comment && <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{r.comment}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
