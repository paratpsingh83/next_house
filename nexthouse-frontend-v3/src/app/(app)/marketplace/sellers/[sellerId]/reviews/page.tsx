'use client';
import { useParams, useRouter } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Star } from 'lucide-react';
import { reviewsApi } from '@/api';
import { formatDistanceToNow } from 'date-fns';

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={12} className={`${value >= n ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}

export default function SellerReviewsPage() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const router = useRouter();
  const id = Number(sellerId);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['seller-reviews-all', id],
    queryFn:  ({ pageParam = 0 }) => reviewsApi.getBySeller(id, pageParam, 20),
    getNextPageParam: (last, pages) => last.last ? undefined : pages.length,
    initialPageParam: 0,
  });

  const reviews = data?.pages.flatMap(p => p.content) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Seller Reviews</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-primary-500" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No reviews yet</div>
        ) : (
          reviews.map(r => (
            <div key={r.id} className="card p-4 flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                {r.reviewer.profileImage
                  ? <img src={r.reviewer.profileImage} className="w-full h-full object-cover" alt={r.reviewer.name} />
                  : <span className="w-full h-full flex items-center justify-center font-bold text-gray-500">{r.reviewer.name[0]}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{r.reviewer.name}</p>
                  <StarRow value={r.rating} />
                </div>
                {r.itemTitle && (
                  <p className="text-xs text-gray-400 mt-0.5">Re: {r.itemTitle}</p>
                )}
                {r.comment && (
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">{r.comment}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}

        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full py-3 text-sm font-semibold text-primary-600 hover:text-primary-700 transition flex items-center justify-center gap-2"
          >
            {isFetchingNextPage ? <Loader2 size={16} className="animate-spin" /> : null}
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
