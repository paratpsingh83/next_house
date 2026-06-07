import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '@/api';
import { setUnreadCount } from '@/store/slices/notifSlice';
import { useAppDispatch } from '@/store/hooks';
import Avatar from '@/components/common/Avatar';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';
import type { NotificationResponse } from '@/types';

const NOTIF_ICON: Record<string, string> = {
  FOLLOW: 'person-add-outline', LIKE: 'heart-outline', COMMENT: 'chatbubble-outline',
  MENTION: 'at-outline', SAFETY: 'warning-outline', ACTIVITY: 'calendar-outline',
  COMMUNITY: 'people-outline', CHAT: 'chatbubbles-outline',
};

export default function NotificationsScreen() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const qc       = useQueryClient();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['notifications'],
      queryFn:  ({ pageParam = 0 }) => notificationsApi.getAll(false, pageParam, 20),
      getNextPageParam: (last) => last.hasNext ? last.page + 1 : undefined,
      initialPageParam: 0,
    });

  useEffect(() => {
    notificationsApi.unreadCount().then(n => dispatch(setUnreadCount(n))).catch(() => {});
  }, [data]);

  const markAllMut = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess:  () => { dispatch(setUnreadCount(0)); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const markReadMut = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items: NotificationResponse[] = data?.pages.flatMap(p => p.content) ?? [];

  const renderItem = ({ item: n }: { item: NotificationResponse }) => {
    const icon = NOTIF_ICON[n.notificationType] ?? 'notifications-outline';
    return (
      <TouchableOpacity
        onPress={() => { if (!n.read) markReadMut.mutate(n.id); }}
        style={[styles.item, !n.read && styles.itemUnread]}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, !n.read && styles.iconWrapActive]}>
          <Ionicons name={icon as any} size={20} color={n.read ? colors.textMuted : colors.primary} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{n.title}</Text>
          {n.message && <Text style={styles.message} numberOfLines={2}>{n.message}</Text>}
          <Text style={styles.time}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</Text>
        </View>
        {!n.read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  if (isLoading) return <Spinner full />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={() => markAllMut.mutate()} style={styles.headerBtn}>
          <Ionicons name="checkmark-done-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={n => String(n.id)}
        renderItem={renderItem}
        ListEmptyComponent={<EmptyState icon="notifications-off-outline" title="No notifications" subtitle="You're all caught up!" />}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:   { fontSize: font.xl, fontWeight: '800', color: colors.text },
  headerBtn:     { padding: 4 },
  item:          { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.lg, backgroundColor: colors.surface },
  itemUnread:    { backgroundColor: colors.primary + '08' },
  iconWrap:      { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconWrapActive:{ backgroundColor: colors.primary + '15' },
  content:       { flex: 1 },
  title:         { fontSize: font.base, fontWeight: '600', color: colors.text, marginBottom: 2 },
  message:       { fontSize: font.sm, color: colors.textMuted, marginBottom: 4 },
  time:          { fontSize: font.sm - 1, color: colors.textLight },
  dot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 4, marginLeft: 8 },
  sep:           { height: 1, backgroundColor: colors.border },
});
