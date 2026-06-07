import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { borrowApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';
import type { BorrowRequestResponse } from '@/types';

export default function BorrowScreen() {
  const router = useRouter();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['borrow-mine'],
      queryFn:  ({ pageParam = 0 }) => borrowApi.mine(pageParam, 20),
      getNextPageParam: (last) => last.hasNext ? last.page + 1 : undefined,
      initialPageParam: 0,
    });

  const requests = data?.pages.flatMap(p => p.content) ?? [];

  const statusColor: Record<string, string> = { OPEN: colors.primary, CLOSED: colors.textMuted, RESPONDED: colors.secondary };

  const renderItem = ({ item }: { item: BorrowRequestResponse }) => (
    <View style={styles.card}>
      <View style={[styles.statusBar, { backgroundColor: statusColor[item.status] ?? colors.border }]} />
      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        {item.description && <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>}
        <View style={styles.footer}>
          <Text style={styles.time}>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</Text>
          <View style={[styles.statusBadge, { backgroundColor: (statusColor[item.status] ?? colors.textMuted) + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor[item.status] ?? colors.textMuted }]}>{item.status}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Borrow Requests</Text>
        <TouchableOpacity onPress={() => router.push('/borrow/create')} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? <Spinner full /> : (
        <FlatList
          data={requests}
          keyExtractor={r => String(r.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="hand-left-outline" title="No borrow requests" subtitle="Ask your neighbours to borrow something!" />}
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
  addBtn:      { backgroundColor: colors.primary, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  list:        { padding: spacing.md, gap: spacing.sm },
  card:        { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  statusBar:   { width: 5 },
  cardBody:    { flex: 1, padding: spacing.md },
  title:       { fontSize: font.base, fontWeight: '700', color: colors.text, marginBottom: 4 },
  desc:        { fontSize: font.sm, color: colors.textMuted, lineHeight: 18, marginBottom: 8 },
  footer:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time:        { fontSize: font.sm - 1, color: colors.textLight },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full },
  statusText:  { fontSize: 11, fontWeight: '700' },
});
