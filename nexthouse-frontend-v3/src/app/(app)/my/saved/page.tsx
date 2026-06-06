'use client';
import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { Bookmark, Loader2 } from 'lucide-react';
import { postsApi } from '@/api';
import PostCard from '@/components/post/PostCard';

export default function SavedPostsPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['posts', 'saved'],
    queryFn:  ({ pageParam = 0 }) => postsApi.savedPosts(undefined, pageParam, 20),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
  });

  const posts = data?.pages.flatMap(p => p.content) ?? [];

  const { ref, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3 sticky top-0 z-10">
        <Bookmark size={20} className="text-primary-500" />
        <h1 className="font-bold text-gray-900">Saved Posts</h1>
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
              <Bookmark size={28} className="text-gray-400" />
            </div>
            <p className="font-semibold text-gray-500">No saved posts yet</p>
            <p className="text-sm text-gray-400 mt-1">Tap the bookmark icon on any post to save it here</p>
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