import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { postsApi } from '@/api';
import PostCard from '@/components/post/PostCard';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing } from '@/theme';

export default function HashtagScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const router = useRouter();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['hashtag', tag],
      queryFn: ({ pageParam = 0 }) => postsApi.hashtagFeed(tag, pageParam, 15),
      getNextPageParam: (last) => last.hasNext ? last.page + 1 : undefined,
      initialPageParam: 0,
      enabled: !!tag,
    });

  const posts = data?.pages.flatMap(p => p.content) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>#{tag}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? <Spinner full /> : (
        <FlatList
          data={posts}
          keyExtractor={p => String(p.id)}
          renderItem={({ item }) => <PostCard post={item} />}
          ListEmptyComponent={
            <EmptyState icon="pricetag-outline" title="No posts" subtitle={`Nothing tagged #${tag} yet`} />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4 },
  title:   { fontSize: font.lg, fontWeight: '700', color: colors.text },
});