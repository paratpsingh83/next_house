import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { marketplaceApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';
import type { MarketplaceItemResponse } from '@/types';

export default function MyListingsScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const {
    data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey: ['my-listings'],
    queryFn:  ({ pageParam = 0 }) => marketplaceApi.mine(pageParam, 20),
    getNextPageParam: (last) => last.hasNext ? last.page + 1 : undefined,
    initialPageParam: 0,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => marketplaceApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-listings'] }),
    onError: () => Alert.alert('Error', 'Failed to delete listing'),
  });

  const markSoldMut = useMutation({
    mutationFn: (id: number) => marketplaceApi.markSold(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-listings'] }),
    onError: () => Alert.alert('Error', 'Failed to mark as sold'),
  });

  const confirmDelete = (item: MarketplaceItemResponse) => {
    Alert.alert('Delete Listing', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate(item.id) },
    ]);
  };

  const items = data?.pages.flatMap(p => p.content) ?? [];

  if (isLoading) return <Spinner full />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity onPress={() => router.push('/marketplace/create')} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={
          <EmptyState
            icon="storefront-outline"
            title="No listings yet"
            subtitle="Tap + to create your first marketplace listing"
          />
        }
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { padding: spacing.md, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <View style={styles.cardInfo}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.price}>₹{item.price}</Text>
                <View style={[styles.badge, item.status === 'SOLD' ? styles.badgeSold : styles.badgeActive]}>
                  <Text style={[styles.badgeText, item.status === 'SOLD' ? styles.badgeSoldText : styles.badgeActiveText]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                {item.status !== 'SOLD' && (
                  <TouchableOpacity
                    onPress={() => markSoldMut.mutate(item.id)}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                    <Text style={styles.actionText}>Mark Sold</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => router.push(`/marketplace/${item.id}`)}
                  style={styles.actionBtn}
                >
                  <Ionicons name="eye-outline" size={20} color={colors.textMuted} />
                  <Text style={[styles.actionText, { color: colors.textMuted }]}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDelete(item)}
                  style={styles.actionBtn}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:        { padding: 4 },
  headerTitle:    { fontSize: font.lg, fontWeight: '700', color: colors.text },
  addBtn:         { padding: 4 },
  card:           { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardBody:       { padding: spacing.md, gap: spacing.sm },
  cardInfo:       { gap: 4 },
  title:          { fontSize: font.base, fontWeight: '700', color: colors.text },
  price:          { fontSize: font.lg, fontWeight: '800', color: colors.primary },
  badge:          { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeActive:    { backgroundColor: '#DCFCE7' },
  badgeSold:      { backgroundColor: '#F3F4F6' },
  badgeText:      { fontSize: font.sm - 1, fontWeight: '700' },
  badgeActiveText: { color: '#16A34A' },
  badgeSoldText:  { color: colors.textMuted },
  actions:        { flexDirection: 'row', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText:     { fontSize: font.sm, fontWeight: '600', color: colors.primary },
});