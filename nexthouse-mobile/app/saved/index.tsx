import React from 'react';
import { SafeAreaView, FlatList, View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { postsApi } from '@/api';
import PostCard from '@/components/post/PostCard';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing } from '@/theme';

export default function SavedPostsScreen() {
  const router = useRouter();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['saved-posts'],
      queryFn:  ({ pageParam = 0 }) => postsApi.savedPosts(pageParam, 20),
      getNextPageParam: (last) => last.hasNext ? last.page + 1 : undefined,
      initialPageParam: 0,
    });

  const posts = data?.pages.flatMap(p => p.content) ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Posts</Text>
        <View style={{ width: 24 }} />
      </View>
      {isLoading ? <Spinner full /> : (
        <FlatList
          data={posts}
          keyExtractor={p => String(p.id)}
          renderItem={({ item }) => <PostCard post={item} />}
          ListEmptyComponent={<EmptyState icon="bookmark-outline" title="No saved posts" subtitle="Bookmark posts to see them here" />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text },
});
