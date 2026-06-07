import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Image, SafeAreaView, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { communitiesApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';
import type { CommunityResponse } from '@/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export default function CommunitiesScreen() {
  const router   = useRouter();
  const qc       = useQueryClient();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 400);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['communities', debounced],
      queryFn:  ({ pageParam = 0 }) =>
        debounced
          ? communitiesApi.search(debounced, pageParam, 20)
          : communitiesApi.mine(pageParam, 20),
      getNextPageParam: (last) => last.hasNext ? last.page + 1 : undefined,
      initialPageParam: 0,
    });

  const joinMut = useMutation({
    mutationFn: (id: number) => communitiesApi.join(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['communities'] }),
  });

  const communities = data?.pages.flatMap(p => p.content) ?? [];

  const renderItem = ({ item }: { item: CommunityResponse }) => (
    <TouchableOpacity onPress={() => router.push(`/community/${item.id}`)} style={styles.card} activeOpacity={0.85}>
      {item.coverImage
        ? <Image source={{ uri: item.coverImage }} style={styles.cover} resizeMode="cover" />
        : <View style={[styles.cover, { backgroundColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="people" size={32} color={colors.primary} />
          </View>
      }
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          {item.verified && <Ionicons name="shield-checkmark" size={14} color={colors.secondary} />}
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description ?? 'No description'}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.memberCount}>
            <Ionicons name="people-outline" size={13} color={colors.textMuted} />
            <Text style={styles.memberText}>{item.memberCount}</Text>
          </View>
          {!item.isMember ? (
            <TouchableOpacity onPress={() => joinMut.mutate(item.id)} style={styles.joinBtn} disabled={joinMut.isPending}>
              <Text style={styles.joinBtnText}>{item.isPending ? 'Pending' : 'Join'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.memberBadge}><Text style={styles.memberBadgeText}>Member</Text></View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Communities</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search communities..."
          placeholderTextColor={colors.textLight}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {isLoading ? <Spinner full /> : (
        <FlatList
          data={communities}
          keyExtractor={c => String(c.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="people-circle-outline" title="No communities" subtitle="Search or join one nearby" />}
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
  safe:           { flex: 1, backgroundColor: colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:    { fontSize: font.lg, fontWeight: '700', color: colors.text },
  searchWrap:     { flexDirection: 'row', alignItems: 'center', margin: spacing.md, backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, gap: 8 },
  searchInput:    { flex: 1, fontSize: font.base, color: colors.text },
  list:           { padding: spacing.md, gap: spacing.sm },
  card:           { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cover:          { width: '100%', height: 100 },
  cardBody:       { padding: spacing.md },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardTitle:      { flex: 1, fontSize: font.base, fontWeight: '700', color: colors.text },
  cardDesc:       { fontSize: font.sm, color: colors.textMuted, lineHeight: 18, marginBottom: 8 },
  cardFooter:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberCount:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberText:     { fontSize: font.sm, color: colors.textMuted },
  joinBtn:        { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.full },
  joinBtnText:    { color: '#fff', fontSize: font.sm, fontWeight: '700' },
  memberBadge:    { backgroundColor: colors.secondary + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  memberBadgeText:{ color: colors.secondary, fontSize: font.sm, fontWeight: '700' },
});
