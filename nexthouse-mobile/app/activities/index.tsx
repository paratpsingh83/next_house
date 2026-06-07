import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, RefreshControl, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { activitiesApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';
import type { ActivityResponse } from '@/types';

const TYPE_ICON: Record<string, string> = {
  SOCIAL: 'people-outline', SPORTS: 'football-outline', LEARNING: 'book-outline',
  VOLUNTEERING: 'heart-outline', FOOD: 'restaurant-outline', ARTS: 'color-palette-outline',
  OUTDOOR: 'leaf-outline', NEIGHBORHOOD_WATCH: 'eye-outline', OTHER: 'star-outline',
};

export default function ActivitiesScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['activities-nearby'],
      queryFn:  ({ pageParam = 0 }) => activitiesApi.nearby(0, 0, 10000, undefined, pageParam, 20),
      getNextPageParam: (last) => last.hasNext ? last.page + 1 : undefined,
      initialPageParam: 0,
    });

  const joinMut = useMutation({
    mutationFn: (id: number) => activitiesApi.join(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['activities-nearby'] }),
  });

  const activities = data?.pages.flatMap(p => p.content) ?? [];

  const renderItem = ({ item }: { item: ActivityResponse }) => {
    const icon = TYPE_ICON[item.activityType] ?? 'star-outline';
    const canJoin = item.myJoinStatus === 'NONE' && item.status === 'OPEN';
    return (
      <TouchableOpacity onPress={() => router.push(`/activity/${item.id}`)} style={styles.card} activeOpacity={0.85}>
        <View style={styles.cardLeft}>
          <View style={styles.typeIcon}><Ionicons name={icon as any} size={22} color={colors.primary} /></View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <Text style={styles.infoText}>{format(new Date(item.activityTime), 'MMM d, h:mm a')}</Text>
          </View>
          {item.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.infoText} numberOfLines={1}>{item.address}</Text>
            </View>
          )}
          <View style={styles.cardFooter}>
            <View style={styles.memberPill}>
              <Ionicons name="people-outline" size={13} color={colors.textMuted} />
              <Text style={styles.memberText}>{item.currentMemberCount}{item.maxMembers ? `/${item.maxMembers}` : ''}</Text>
            </View>
            {canJoin && (
              <TouchableOpacity onPress={() => joinMut.mutate(item.id)} style={styles.joinBtn} disabled={joinMut.isPending}>
                <Text style={styles.joinText}>Join</Text>
              </TouchableOpacity>
            )}
            {item.myJoinStatus === 'APPROVED' && <View style={styles.joinedBadge}><Text style={styles.joinedText}>Joined</Text></View>}
            {item.myJoinStatus === 'PENDING'  && <View style={[styles.joinedBadge, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.joinedText, { color: '#D97706' }]}>Pending</Text></View>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Activities</Text>
        <TouchableOpacity onPress={() => router.push('/activity/create')} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? <Spinner full /> : (
        <FlatList
          data={activities}
          keyExtractor={a => String(a.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="No activities nearby" subtitle="Create one for your neighbourhood!" />}
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
  card:        { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardLeft:    { width: 56, alignItems: 'center', paddingTop: spacing.md, backgroundColor: colors.primary + '10' },
  typeIcon:    { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  cardBody:    { flex: 1, padding: spacing.md },
  title:       { fontSize: font.base, fontWeight: '700', color: colors.text, marginBottom: 6 },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  infoText:    { fontSize: font.sm, color: colors.textMuted, flex: 1 },
  cardFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  memberPill:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberText:  { fontSize: font.sm, color: colors.textMuted },
  joinBtn:     { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 5, borderRadius: radius.full },
  joinText:    { color: '#fff', fontSize: font.sm, fontWeight: '700' },
  joinedBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  joinedText:  { color: colors.secondary, fontSize: font.sm, fontWeight: '700' },
});
