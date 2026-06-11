import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format, isPast } from 'date-fns';
import { activitiesApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';
import type { ActivityResponse } from '@/types';

type Tab = 'joined' | 'hosting';

const TYPE_ICON: Record<string, string> = {
  SOCIAL: 'people-outline', SPORTS: 'football-outline', LEARNING: 'book-outline',
  VOLUNTEERING: 'heart-outline', FOOD: 'restaurant-outline', ARTS: 'color-palette-outline',
  OUTDOOR: 'leaf-outline', NEIGHBORHOOD_WATCH: 'eye-outline', OTHER: 'star-outline',
};

export default function MyActivitiesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('joined');

  const joinedQ = useInfiniteQuery({
    queryKey: ['activities', 'my-joined'],
    queryFn:  ({ pageParam = 0 }) => activitiesApi.myJoined(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'joined',
  });

  const hostingQ = useInfiniteQuery({
    queryKey: ['activities', 'my-hosting'],
    queryFn:  ({ pageParam = 0 }) => activitiesApi.myHosting(pageParam),
    getNextPageParam: l => l.hasNext ? l.page + 1 : undefined,
    initialPageParam: 0,
    enabled: tab === 'hosting',
  });

  const active = tab === 'joined' ? joinedQ : hostingQ;
  const items  = active.data?.pages.flatMap(p => p.content) ?? [];
  const upcoming = items.filter(a => !isPast(new Date(a.activityTime)));
  const past     = items.filter(a =>  isPast(new Date(a.activityTime)));

  type Section = { title: string; data: ActivityResponse[] };
  const sections: Section[] = [
    ...(upcoming.length > 0 ? [{ title: 'Upcoming', data: upcoming }] : []),
    ...(past.length     > 0 ? [{ title: 'Past',     data: past     }] : []),
  ];

  const renderItem = ({ item, section }: { item: ActivityResponse; section: Section }) => {
    const icon       = TYPE_ICON[item.activityType] ?? 'star-outline';
    const isPastItem = section.title === 'Past';
    return (
      <TouchableOpacity
        onPress={() => router.push(`/activity/${item.id}`)}
        style={[styles.card, isPastItem && styles.cardPast]}
        activeOpacity={0.85}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name={icon as any} size={20} color={colors.primary} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <View style={styles.badges}>
              {item.isHost && (
                <View style={styles.hostBadge}><Text style={styles.hostBadgeText}>Host</Text></View>
              )}
              {item.myJoinStatus === 'APPROVED' && !item.isHost && (
                <View style={styles.joinedBadge}><Text style={styles.joinedBadgeText}>Joined</Text></View>
              )}
              {item.myJoinStatus === 'PENDING' && (
                <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>Pending</Text></View>
              )}
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={styles.infoText}>{format(new Date(item.activityTime), 'MMM d, h:mm a')}</Text>
          </View>
          {item.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={styles.infoText} numberOfLines={1}>{item.address}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={12} color={colors.textMuted} />
            <Text style={styles.infoText}>
              {item.currentMemberCount}{item.maxMembers ? `/${item.maxMembers}` : ''} members
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Activities</Text>
        <TouchableOpacity onPress={() => router.push('/activity/create')} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['joined', 'hosting'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === 'joined' ? '✅ Joined' : '👑 Hosting'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {active.isLoading ? <Spinner full /> : (
        sections.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title={tab === 'joined' ? "You haven't joined any activities" : "You haven't hosted any activities"}
            subtitle={tab === 'joined' ? 'Browse activities near you' : 'Create an activity for your neighbours'}
          />
        ) : (
          <FlatList
            data={sections}
            keyExtractor={s => s.title}
            renderItem={({ item: section }) => (
              <View>
                <Text style={styles.sectionHeader}>{section.title} ({section.data.length})</Text>
                {section.data.map(a => renderItem({ item: a, section }))}
              </View>
            )}
            contentContainerStyle={styles.list}
            onEndReached={() => active.hasNextPage && active.fetchNextPage()}
            onEndReachedThreshold={0.4}
            ListFooterComponent={active.isFetchingNextPage ? <Spinner /> : null}
            refreshControl={
              <RefreshControl refreshing={active.isRefetching} onRefresh={active.refetch} colors={[colors.primary]} />
            }
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: colors.bg },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:      { fontSize: font.lg, fontWeight: '700', color: colors.text },
  addBtn:           { backgroundColor: colors.primary, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tabRow:           { flexDirection: 'row', margin: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  tabBtn:           { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive:     { backgroundColor: colors.primary },
  tabLabel:         { fontSize: font.sm, fontWeight: '600', color: colors.textMuted },
  tabLabelActive:   { color: '#fff' },
  list:             { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  sectionHeader:    { fontSize: font.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginVertical: spacing.sm },
  card:             { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, overflow: 'hidden' },
  cardPast:         { opacity: 0.6 },
  iconBox:          { width: 50, alignItems: 'center', justifyContent: 'center' },
  cardBody:         { flex: 1, padding: spacing.md },
  cardTop:          { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  title:            { flex: 1, fontSize: font.base, fontWeight: '700', color: colors.text, marginRight: 8 },
  badges:           { flexDirection: 'row', gap: 4 },
  hostBadge:        { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  hostBadgeText:    { fontSize: 10, fontWeight: '700', color: '#D97706' },
  joinedBadge:      { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  joinedBadgeText:  { fontSize: 10, fontWeight: '700', color: colors.secondary },
  pendingBadge:     { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  pendingBadgeText: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  infoRow:          { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  infoText:         { fontSize: font.sm, color: colors.textMuted, flex: 1 },
});