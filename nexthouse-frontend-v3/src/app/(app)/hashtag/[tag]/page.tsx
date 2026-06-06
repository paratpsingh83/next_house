'use client';
import { useEffect } from 'react';
import { use } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Hash, Loader2 } from 'lucide-react';
import { postsApi } from '@/api';
import PostCard from '@/components/post/PostCard';

export default function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = use(params);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['posts', 'hashtag', tag],
    queryFn:  ({ pageParam = 0 }) => postsApi.hashtagFeed(tag, pageParam, 20),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: !!tag,
  });

  const posts = data?.pages.flatMap(p => p.content) ?? [];

  const { ref, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-2 sticky top-0 z-10">
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
          <Hash size={16} className="text-primary-600" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 leading-none">#{tag}</h1>
          {!isLoading && (
            <p className="text-xs text-gray-400 mt-0.5">
              {posts.length > 0
                ? `${data?.pages[0].totalElements ?? posts.length} posts`
                : 'No posts yet'}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto py-4">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary-500" size={28} />
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Hash size={28} className="text-gray-400" />
            </div>
            <p className="font-semibold text-gray-500">No posts with #{tag}</p>
            <p className="text-sm text-gray-400 mt-1">Be the first to post with this hashtag</p>
          </div>
        )}

        <div className="space-y-3 px-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        <div ref={ref} className="h-4" />
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-primary-400" size={22} />
          </div>
        )}
      </div>
    </div>
  );
}