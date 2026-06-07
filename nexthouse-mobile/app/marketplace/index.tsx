import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Image, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { marketplaceApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';
import type { MarketplaceItemResponse } from '@/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export default function MarketplaceScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 400);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['marketplace', debounced],
      queryFn:  ({ pageParam = 0 }) =>
        debounced
          ? marketplaceApi.search(debounced, pageParam, 20)
          : marketplaceApi.nearby(0, 0, 20000, undefined, undefined, undefined, pageParam, 20),
      getNextPageParam: (last) => last.hasNext ? last.page + 1 : undefined,
      initialPageParam: 0,
    });

  const items = data?.pages.flatMap(p => p.content) ?? [];

  const renderItem = ({ item }: { item: MarketplaceItemResponse }) => (
    <TouchableOpacity onPress={() => router.push({ pathname: '/marketplace/[id]' as any, params: { id: item.id } })} style={styles.card} activeOpacity={0.85}>
      {item.thumbnailUrl
        ? <Image source={{ uri: item.thumbnailUrl }} style={styles.cardImage} resizeMode="cover" />
        : <View style={[styles.cardImage, styles.noImage]}><Ionicons name="image-outline" size={32} color={colors.border} /></View>
      }
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.price != null
          ? <Text style={styles.price}>${item.price.toFixed(2)}{item.negotiable ? ' (neg.)' : ''}</Text>
          : <Text style={[styles.price, { color: colors.secondary }]}>Free</Text>
        }
        <Text style={styles.seller} numberOfLines={1}>{item.seller.name}</Text>
        {item.category && <View style={styles.catBadge}><Text style={styles.catText}>{item.category}</Text></View>}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <TouchableOpacity onPress={() => router.push('/marketplace/create' as any)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor={colors.textLight}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {isLoading ? <Spinner full /> : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md }}
          contentContainerStyle={{ padding: spacing.sm, gap: spacing.sm }}
          ListEmptyComponent={<EmptyState icon="storefront-outline" title="No items nearby" subtitle="Be the first to list something!" />}
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
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: font.xl, fontWeight: '800', color: colors.text },
  addBtn:      { backgroundColor: colors.primary, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', margin: spacing.md, backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, gap: 8 },
  searchInput: { flex: 1, fontSize: font.base, color: colors.text },
  card:        { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardImage:   { width: '100%', height: 140 },
  noImage:     { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  cardInfo:    { padding: 10 },
  cardTitle:   { fontSize: font.sm, fontWeight: '600', color: colors.text, marginBottom: 4 },
  price:       { fontSize: font.md, fontWeight: '800', color: colors.primary, marginBottom: 2 },
  seller:      { fontSize: font.sm - 1, color: colors.textMuted, marginBottom: 4 },
  catBadge:    { backgroundColor: colors.primary + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full, alignSelf: 'flex-start' },
  catText:     { fontSize: 10, color: colors.primary, fontWeight: '700' },
});
