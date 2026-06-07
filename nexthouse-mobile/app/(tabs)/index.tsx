import React, { useState, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Text, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { postsApi, storiesApi } from '@/api';
import PostCard from '@/components/post/PostCard';
import StoryRing from '@/components/stories/StoryRing';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing } from '@/theme';
import type { PostResponse, StoryResponse } from '@/types';

type FeedTab = 'following' | 'nearby';

export default function FeedScreen() {
  const router   = useRouter();
  const [tab, setTab] = useState<FeedTab>('following');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['feed', tab],
      queryFn:  ({ pageParam = 0 }) =>
        tab === 'following'
          ? postsApi.followingFeed(pageParam, 15)
          : postsApi.nearbyFeed(0, 0, 10000, pageParam, 15),
      getNextPageParam: (last) => last.hasNext ? last.page + 1 : undefined,
      initialPageParam: 0,
    });

  const { data: stories } = useInfiniteQuery({
    queryKey: ['stories-feed'],
    queryFn:  () => storiesApi.getFeed(),
    getNextPageParam: () => undefined,
    initialPageParam: 0,
  });

  const posts = data?.pages.flatMap(p => p.content) ?? [];
  const storyList: StoryResponse[] = stories?.pages.flat() ?? [];

  const storyGroups = React.useMemo(() => {
    const map = new Map<number, { user: any; stories: StoryResponse[]; allViewed: boolean }>();
    storyList.forEach(s => {
      if (!map.has(s.author.id)) map.set(s.author.id, { user: s.author, stories: [], allViewed: true });
      const g = map.get(s.author.id)!;
      g.stories.push(s);
      if (!s.viewedByMe) g.allViewed = false;
    });
    return Array.from(map.values());
  }, [storyList]);

  const renderItem = useCallback(({ item }: { item: PostResponse }) => (
    <PostCard key={item.id} post={item} />
  ), []);

  const header = (
    <View>
      {storyGroups.length > 0 && (
        <StoryRing groups={storyGroups} onPress={() => {}} onAddStory={() => router.push('/stories/create')} />
      )}
      {/* Feed tabs */}
      <View style={styles.tabRow}>
        {(['following', 'nearby'] as FeedTab[]).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>{t === 'following' ? 'Following' : 'Nearby'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (isLoading) return <Spinner full />;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.logo}>NextHouse</Text>
        <TouchableOpacity onPress={() => router.push('/post/create')} style={styles.createBtn}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={p => String(p.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState icon="newspaper-outline" title="No posts yet" subtitle="Follow neighbours to see their posts here" />}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  logo:           { fontSize: font.xl, fontWeight: '800', color: colors.primary },
  createBtn:      { padding: 4 },
  tabRow:         { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBtn:         { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive:   { borderBottomWidth: 2.5, borderBottomColor: colors.primary },
  tabLabel:       { fontSize: font.base, color: colors.textMuted, fontWeight: '500' },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
  list:           { flex: 1 },
});
