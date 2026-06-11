'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Loader2, MapPin, Tag, Share2,
  MessageCircle, CheckCircle, Trash2, Edit3, Package, Star, ShoppingBag,
  Send,
} from 'lucide-react';
import { marketplaceApi, chatApi, reviewsApi } from '@/api';
import { useAppSelector } from '@/store';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';

const CONDITION_COLOR: Record<string, string> = {
  NEW:      'bg-green-50 text-green-600',
  LIKE_NEW: 'bg-teal-50 text-teal-600',
  GOOD:     'bg-blue-50 text-blue-600',
  FAIR:     'bg-yellow-50 text-yellow-700',
  POOR:     'bg-red-50 text-red-600',
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          className="p-0.5"
        >
          <Star
            size={onChange ? 24 : 14}
            className={`${(hover || value) >= n ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

export default function MarketplaceItemPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const qc        = useQueryClient();
  const me        = useAppSelector(s => s.auth.user);
  const [activeImg, setActiveImg] = useState(0);
  const [deleting,  setDeleting]  = useState(false);
  const [reviewRating,  setReviewRating]  = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const itemId = Number(id);

  const { data: item, isLoading, refetch } = useQuery({
    queryKey: ['marketplace-item', itemId],
    queryFn:  () => marketplaceApi.get(itemId),
  });

  const sellerId = item?.seller.id;

  const { data: ratingSummary } = useQuery({
    queryKey: ['seller-rating', sellerId],
    queryFn:  () => reviewsApi.getRatingSummary(sellerId!),
    enabled:  !!sellerId,
  });

  const { data: reviewsPage } = useQuery({
    queryKey: ['seller-reviews', sellerId],
    queryFn:  () => reviewsApi.getBySeller(sellerId!, 0, 5),
    enabled:  !!sellerId,
  });

  const { mutate: submitReview, isPending: submittingReview } = useMutation({
    mutationFn: () => reviewsApi.create(itemId, { rating: reviewRating, comment: reviewComment || undefined }),
    onSuccess:  () => {
      toast.success('Review submitted!');
      setReviewRating(0);
      setReviewComment('');
      qc.invalidateQueries({ queryKey: ['seller-rating', sellerId] });
      qc.invalidateQueries({ queryKey: ['seller-reviews', sellerId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to submit review'),
  });

  const isMine = item?.seller.id === me?.id;
  const canReview = !isMine && !!me && !ratingSummary?.reviewedByMe;

  const handleContact = async () => {
    if (!item) return;
    try {
      const room = await chatApi.directRoom(item.seller.id);
      router.push(`/chat/${room.id}`);
    } catch { toast.error('Failed to open chat'); }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/marketplace/${itemId}`;
    if (navigator.share) navigator.share({ title: item?.title, url }).catch(() => {});
    else { await navigator.clipboard.writeText(url); toast.success('Link copied!'); }
  };

  const handleMarkSold = async () => {
    if (!confirm('Mark this item as sold?')) return;
    try { await marketplaceApi.markSold(itemId); toast.success('Marked as sold!'); refetch(); }
    catch { toast.error('Failed'); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    setDeleting(true);
    try { await marketplaceApi.delete(itemId); toast.success('Listing deleted'); router.back(); }
    catch { toast.error('Failed to delete'); setDeleting(false); }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="animate-spin text-primary-500" size={32} />
    </div>
  );

  if (!item) return (
    <div className="p-8 text-center">
      <p className="text-gray-400">Item not found</p>
      <button onClick={() => router.back()} className="btn-primary mt-4">Go back</button>
    </div>
  );

  const images = item.media && item.media.length > 0
    ? item.media.map(m => m.url)
    : item.thumbnailUrl ? [item.thumbnailUrl] : [];

  const isSold = item.status === 'SOLD' || !item.available;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Image gallery */}
      <div className="relative bg-white">
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {images.length > 0
            ? <img src={images[activeImg]} className="w-full h-full object-cover" alt={item.title} />
            : <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
                <ShoppingBag size={48} />
                <p className="text-sm">No photos</p>
              </div>
          }
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={handleShare}
            className="absolute top-4 right-4 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10"
          >
            <Share2 size={16} />
          </button>
          {isSold && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="bg-white rounded-2xl px-6 py-3">
                <p className="text-lg font-bold text-gray-900">SOLD</p>
              </div>
            </div>
          )}
          {item.featured && (
            <div className="absolute bottom-4 left-4 z-10">
              <span className="badge bg-yellow-400 text-yellow-900 gap-1">
                <Star size={11} className="fill-current" />Featured
              </span>
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition ${
                  activeImg === i ? 'border-primary-500' : 'border-transparent'
                }`}
              >
                <img src={img} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Item info */}
      <div className="bg-white px-4 pt-4 pb-5 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {item.category && (
            <span className="badge bg-gray-100 text-gray-600 gap-1 text-xs"><Tag size={10} />{item.category}</span>
          )}
          {item.conditionType && (
            <span className={`badge text-xs ${CONDITION_COLOR[item.conditionType] ?? 'bg-gray-100 text-gray-600'}`}>
              {item.conditionType.replace('_', ' ')}
            </span>
          )}
          {item.negotiable && <span className="badge bg-blue-50 text-blue-600 text-xs">Negotiable</span>}
        </div>

        <h1 className="text-xl font-bold text-gray-900">{item.title}</h1>
        <div className="mt-2">
          {item.price != null
            ? <p className="text-2xl font-bold text-primary-600">RM {Number(item.price).toFixed(2)}</p>
            : <p className="text-xl font-bold text-green-600">Free</p>
          }
        </div>
        {item.address && (
          <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
            <MapPin size={14} className="text-primary-500 flex-shrink-0" />
            <span>{item.address}</span>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">
          Listed {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </p>

        {!isMine && !isSold && (
          <div className="flex gap-2 mt-4">
            <button onClick={handleContact} className="btn-primary flex-1 py-3 gap-2">
              <MessageCircle size={18} />Chat with Seller
            </button>
          </div>
        )}

        {isMine && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {!isSold && (
              <>
                <button
                  onClick={() => router.push(`/marketplace/${itemId}/edit`)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-primary-200 text-primary-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary-50 transition"
                >
                  <Edit3 size={16} />Edit
                </button>
                <button
                  onClick={handleMarkSold}
                  className="flex-1 py-2.5 rounded-xl border-2 border-green-200 text-green-600 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-green-50 transition"
                >
                  <CheckCircle size={16} />Sold
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-50 transition"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete
            </button>
          </div>
        )}

        {isSold && (
          <div className="mt-4 py-3 rounded-xl bg-gray-100 text-center">
            <p className="text-gray-500 font-semibold text-sm">This item has been sold</p>
          </div>
        )}
      </div>

      {/* Seller info + rating */}
      <div className="mx-4 mt-4">
        <Link href={`/profile/${item.seller.id}`}>
          <div className="card p-4 flex items-center gap-3 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
              {item.seller.profileImage
                ? <img src={item.seller.profileImage} className="w-full h-full object-cover" alt={item.seller.name} />
                : <span className="text-primary-600 font-bold text-lg">{item.seller.name[0]}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{item.seller.name}</p>
                {item.seller.addressVerified && (
                  <span className="badge bg-blue-50 text-blue-600 text-xs gap-1">
                    <CheckCircle size={9} />Verified
                  </span>
                )}
                {item.seller.online && <div className="w-2 h-2 rounded-full bg-green-400" />}
              </div>
              {ratingSummary && ratingSummary.totalReviews > 0 ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <StarRating value={ratingSummary.averageRating} />
                  <span className="text-xs text-gray-500 font-medium">
                    {ratingSummary.averageRating.toFixed(1)} · {ratingSummary.totalReviews} review{ratingSummary.totalReviews !== 1 ? 's' : ''}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No reviews yet · Trust score: {item.seller.trustScore ?? 0}</p>
              )}
            </div>
            <ArrowLeft size={16} className="rotate-180 text-gray-300" />
          </div>
        </Link>
      </div>

      {/* Description */}
      {item.description && (
        <div className="mx-4 mt-4">
          <div className="card p-4">
            <h3 className="font-bold text-gray-900 mb-2">Description</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{item.description}</p>
          </div>
        </div>
      )}

      {/* Community */}
      {item.community && (
        <div className="mx-4 mt-4">
          <Link href={`/communities/${item.community.id}`}>
            <div className="card p-4 flex items-center gap-3 hover:shadow-sm transition">
              <Package size={18} className="text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Listed in</p>
                <p className="font-semibold text-sm text-gray-900">{item.community.name}</p>
              </div>
              <ArrowLeft size={16} className="rotate-180 text-gray-300 ml-auto" />
            </div>
          </Link>
        </div>
      )}

      {/* Reviews section */}
      <div className="mx-4 mt-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Reviews</h3>
            {ratingSummary && ratingSummary.totalReviews > 0 && (
              <Link
                href={`/marketplace/sellers/${sellerId}/reviews`}
                className="text-xs text-primary-600 font-semibold"
              >
                See all
              </Link>
            )}
          </div>

          {/* Write review */}
          {canReview && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">Leave a review</p>
              <StarRating value={reviewRating} onChange={setReviewRating} />
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="Share your experience (optional)"
                maxLength={1000}
                rows={3}
                className="mt-2 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
              <button
                onClick={() => submitReview()}
                disabled={reviewRating === 0 || submittingReview}
                className="mt-2 btn-primary py-2 px-4 text-sm gap-2 disabled:opacity-50"
              >
                {submittingReview ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Submit
              </button>
            </div>
          )}

          {ratingSummary?.reviewedByMe && !isMine && (
            <div className="mb-3 text-xs text-gray-400 text-center">You have already reviewed this seller</div>
          )}

          {/* Recent reviews */}
          {reviewsPage && reviewsPage.content.length > 0 ? (
            <div className="space-y-3">
              {reviewsPage.content.map(r => (
                <div key={r.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                    {r.reviewer.profileImage
                      ? <img src={r.reviewer.profileImage} className="w-full h-full object-cover" alt={r.reviewer.name} />
                      : <span className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">{r.reviewer.name[0]}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-gray-800">{r.reviewer.name}</p>
                      <StarRating value={r.rating} />
                    </div>
                    {r.comment && <p className="text-xs text-gray-600 mt-0.5">{r.comment}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">No reviews yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
