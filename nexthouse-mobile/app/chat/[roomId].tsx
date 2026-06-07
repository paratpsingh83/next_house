import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { chatApi } from '@/api';
import { useAppSelector } from '@/store/hooks';
import { useRoomSocket } from '@/hooks/useRoomSocket';
import ChatBubble from '@/components/chat/ChatBubble';
import Avatar from '@/components/common/Avatar';
import Spinner from '@/components/common/Spinner';
import { colors, font, spacing, radius } from '@/theme';
import type { ChatMessageResponse } from '@/types';

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router      = useRouter();
  const me          = useAppSelector(s => s.auth.user);
  const queryClient = useQueryClient();
  const [text, setText]           = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const flatRef = useRef<FlatList>(null);

  const { data: room } = useQuery({
    queryKey: ['room', roomId],
    queryFn:  () => chatApi.getRoomDetails(Number(roomId)),
    staleTime: 60_000,
  });

  // Initial history — no polling interval; WS handles real-time delivery.
  // A 5-minute stale time avoids re-fetching when the screen re-focuses briefly.
  const { data: history, isLoading } = useQuery({
    queryKey: ['messages', roomId],
    queryFn:  () => chatApi.getHistory(Number(roomId), 0, 50),
    enabled:  !!roomId,
    staleTime: 5 * 60_000,
  });

  // Real-time: inject WS message directly into cache — no HTTP refetch.
  // invalidateQueries on the room list (inbox) so badge + preview update.
  useRoomSocket(roomId, useCallback((msg: ChatMessageResponse) => {
    queryClient.setQueryData(['messages', roomId], (old: any) => {
      if (!old) return old;
      if (old.content?.some((m: any) => m.id === msg.id)) return old; // dedupe
      return { ...old, content: [msg, ...(old.content ?? [])] };
    });
    queryClient.invalidateQueries({ queryKey: ['chat-inbox'] });
    if (isAtBottom) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 60);
    }
  }, [roomId, isAtBottom]));

  const messages: ChatMessageResponse[] = [...(history?.content ?? [])].reverse();

  // Mark read once on mount; optimistically clear inbox badge immediately.
  useEffect(() => {
    const rid = Number(roomId);
    queryClient.setQueryData(['chat-inbox'], (old: any) => {
      if (!old?.content) return old;
      return { ...old, content: old.content.map((r: any) => r.id === rid ? { ...r, unreadCount: 0 } : r) };
    });
    chatApi.markRead(rid).catch(() => {});
  }, [roomId]);

  const sendMut = useMutation({
    mutationFn: (msg: string) =>
      chatApi.sendMessage(Number(roomId), { message: msg, messageType: 'TEXT' }),
    onSuccess: () => {
      // WS will deliver the sent message back to this room subscription — no need to refetch.
      queryClient.invalidateQueries({ queryKey: ['chat-inbox'] });
      setText('');
    },
    onError: () => {},
  });

  const onSend = () => {
    const msg = text.trim();
    if (!msg || sendMut.isPending) return;
    sendMut.mutate(msg);
  };

  const isGroup = room?.roomType !== 'DIRECT';
  const other   = room?.members?.find(m => m.id !== me?.id);
  const title   = isGroup ? (room?.title ?? 'Group Chat') : (other?.name ?? 'Chat');

  if (isLoading) return <Spinner full />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Avatar
          uri={isGroup ? room?.avatarUrl : other?.profileImage}
          name={title}
          size={36}
          online={!isGroup && (other?.online ?? false)}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          {!isGroup && other?.online && (
            <Text style={styles.onlineText}>Online</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => String(m.id)}
          renderItem={({ item }) => (
            <ChatBubble message={item} isMine={item.sender.id === me?.id} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
          onScrollBeginDrag={() => setIsAtBottom(false)}
          onMomentumScrollEnd={e => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            setIsAtBottom(contentOffset.y + layoutMeasurement.height >= contentSize.height - 40);
          }}
        />

        {/* Scroll-to-bottom button when user has scrolled up */}
        {!isAtBottom && (
          <TouchableOpacity
            style={styles.scrollDownBtn}
            onPress={() => { flatRef.current?.scrollToEnd({ animated: true }); setIsAtBottom(true); }}
          >
            <Ionicons name="chevron-down" size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Input bar */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor={colors.textLight}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <TouchableOpacity
            onPress={onSend}
            disabled={!text.trim() || sendMut.isPending}
            style={[styles.sendBtn, { opacity: text.trim() && !sendMut.isPending ? 1 : 0.4 }]}
          >
            <Ionicons name="send" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.bg },
  flex:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:       { padding: 4 },
  headerInfo:    { flex: 1 },
  headerTitle:   { fontSize: font.md, fontWeight: '700', color: colors.text },
  onlineText:    { fontSize: 11, color: colors.online, marginTop: 1 },
  listContent:   { paddingVertical: spacing.md, paddingBottom: spacing.sm },
  scrollDownBtn: { position: 'absolute', bottom: 72, alignSelf: 'center', width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  inputArea:     { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  input:         { flex: 1, backgroundColor: colors.bg, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: font.base, color: colors.text, maxHeight: 120, minHeight: 40 },
  sendBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
});
