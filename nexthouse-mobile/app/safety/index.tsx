import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { safetyApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';
import type { SafetyAlertResponse } from '@/types';

const SEVERITY_COLOR: Record<string, string> = {
  LOW: '#22C55E', MEDIUM: '#F59E0B', HIGH: '#EF4444', CRITICAL: '#7C3AED',
};

export default function SafetyScreen() {
  const router = useRouter();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['safety-nearby'],
      queryFn:  ({ pageParam = 0 }) => safetyApi.nearby(0, 0, 10000, pageParam, 20),
      getNextPageParam: (last) => last.hasNext ? last.page + 1 : undefined,
      initialPageParam: 0,
    });

  const alerts = data?.pages.flatMap(p => p.content) ?? [];

  const renderItem = ({ item }: { item: SafetyAlertResponse }) => {
    const color = SEVERITY_COLOR[item.severity] ?? colors.textMuted;
    return (
      <View style={styles.card}>
        <View style={[styles.severityBar, { backgroundColor: color }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Ionicons name={item.emergency ? 'alert-circle' : 'warning-outline'} size={18} color={color} />
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <View style={[styles.severityBadge, { backgroundColor: color + '22' }]}>
              <Text style={[styles.severityText, { color }]}>{item.severity}</Text>
            </View>
          </View>
          {item.description && <Text style={styles.description} numberOfLines={3}>{item.description}</Text>}
          <View style={styles.cardFooter}>
            <Text style={styles.reporter}>by {item.reportedBy.name}</Text>
            <Text style={styles.time}>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</Text>
          </View>
          {item.address && (
            <View style={styles.location}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.locationText} numberOfLines={1}>{item.address}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safety Alerts</Text>
        <TouchableOpacity onPress={() => router.push('/safety/create')} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? <Spinner full /> : (
        <FlatList
          data={alerts}
          keyExtractor={a => String(a.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title="No alerts nearby" subtitle="Your neighbourhood is safe!" />}
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
  safe:          { flex: 1, backgroundColor: colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:   { fontSize: font.xl, fontWeight: '800', color: colors.text },
  addBtn:        { backgroundColor: colors.danger, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list:          { padding: spacing.md, gap: spacing.sm },
  card:          { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  severityBar:   { width: 5 },
  cardContent:   { flex: 1, padding: spacing.md },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle:     { flex: 1, fontSize: font.base, fontWeight: '700', color: colors.text },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  severityText:  { fontSize: 10, fontWeight: '700' },
  description:   { fontSize: font.sm, color: colors.textMuted, lineHeight: 18, marginBottom: 8 },
  cardFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reporter:      { fontSize: font.sm - 1, color: colors.textMuted },
  time:          { fontSize: font.sm - 1, color: colors.textMuted },
  location:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText:  { fontSize: font.sm - 1, color: colors.textMuted, flex: 1 },
});
