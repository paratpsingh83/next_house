import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { chatApi } from '@/api';
import { setRooms, setTotalUnread } from '@/store/slices/chatSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useInboxSocket } from '@/hooks/useInboxSocket';
import Avatar from '@/components/common/Avatar';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing } from '@/theme';
import type { ChatRoomResponse } from '@/types';

export default function ChatInboxScreen() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const me       = useAppSelector(s => s.auth.user);

  // WS pushes badge updates instantly; 30s poll is a fallback only
  useInboxSocket();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['chat-inbox'],
    queryFn:  () => chatApi.inbox(0, 30),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (data?.content) {
      dispatch(setRooms(data.content));
      // Drive the tab badge from the inbox cache directly — no separate API call
      const total = data.content.reduce((sum: number, r: ChatRoomResponse) => sum + (r.unreadCount ?? 0), 0);
      dispatch(setTotalUnread(total));
    }
  }, [data]);

  const rooms = data?.content ?? [];

  const renderRoom = ({ item: room }: { item: ChatRoomResponse }) => {
    const isGroup = room.roomType !== 'DIRECT';
    const other   = room.members?.find(m => m.id !== me?.id);
    const title   = isGroup ? (room.title ?? 'Group') : (other?.name ?? 'Chat');
    const avatar  = isGroup ? room.avatarUrl : other?.profileImage;
    const online  = !isGroup && other?.online;
    const unread  = (room.unreadCount ?? 0) > 0;

    return (
      <TouchableOpacity onPress={() => router.push(`/chat/${room.id}`)} style={styles.row} activeOpacity={0.7}>
        <Avatar uri={avatar} name={title} size={50} online={online} />
        <View style={styles.info}>
          <View style={styles.topLine}>
            <Text style={[styles.roomTitle, unread && styles.bold]} numberOfLines={1}>{title}</Text>
            {room.lastMessageAt && (
              <Text style={styles.time}>{formatDistanceToNow(new Date(room.lastMessageAt), { addSuffix: false })}</Text>
            )}
          </View>
          <View style={styles.bottomLine}>
            <Text style={[styles.preview, unread && styles.bold]} numberOfLines={1}>
              {room.lastMessagePreview
                ? `${room.lastMessageSenderName ? room.lastMessageSenderName + ': ' : ''}${room.lastMessagePreview}`
                : 'No messages yet'}
            </Text>
            {unread && <View style={styles.unreadDot}><Text style={styles.unreadText}>{room.unreadCount}</Text></View>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) return <Spinner full />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={() => router.push('/chat/new')} style={styles.headerBtn}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={r => String(r.id)}
        renderItem={renderRoom}
        ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="No conversations" subtitle="Start chatting with your neighbours" />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:{ fontSize: font.xl, fontWeight: '800', color: colors.text },
  headerBtn:  { padding: 4 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 12, backgroundColor: colors.surface },
  info:       { flex: 1, marginLeft: 12 },
  topLine:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  roomTitle:  { fontSize: font.base, color: colors.text, flex: 1 },
  time:       { fontSize: font.sm - 1, color: colors.textMuted },
  bottomLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview:    { fontSize: font.sm, color: colors.textMuted, flex: 1 },
  bold:       { fontWeight: '700', color: colors.text },
  unreadDot:  { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  sep:        { height: 1, backgroundColor: colors.border, marginLeft: 74 },
});
