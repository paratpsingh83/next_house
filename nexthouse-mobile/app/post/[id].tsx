import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, FlatList, SafeAreaView, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { postsApi } from '@/api';
import { useAppSelector } from '@/store/hooks';
import PostCard from '@/components/post/PostCard';
import Avatar from '@/components/common/Avatar';
import Spinner from '@/components/common/Spinner';
import { colors, font, spacing, radius } from '@/theme';
import type { PostCommentResponse } from '@/types';

export default function PostDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const qc       = useQueryClient();
  const me       = useAppSelector(s => s.auth.user);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState<PostCommentResponse | null>(null);

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn:  () => postsApi.get(Number(id)),
  });

  const { data: commentsData } = useQuery({
    queryKey: ['comments', id],
    queryFn:  () => postsApi.getComments(Number(id), 0, 50),
    enabled:  !!id,
  });

  const addCommentMut = useMutation({
    mutationFn: (text: string) => postsApi.addComment(Number(id), {
      comment: text,
      parentCommentId: replyTo?.id,
    }),
    onSuccess: () => {
      setComment(''); setReplyTo(null);
      qc.invalidateQueries({ queryKey: ['comments', id] });
      qc.invalidateQueries({ queryKey: ['post', id] });
    },
    onError: () => Alert.alert('Error', 'Failed to post comment'),
  });

  const onSend = () => {
    const text = comment.trim();
    if (!text) return;
    addCommentMut.mutate(text);
  };

  const comments: PostCommentResponse[] = commentsData?.content ?? [];

  if (isLoading || !post) return <Spinner full />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView>
          <PostCard post={post} />

          {/* Comments */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>{post.commentCount} Comments</Text>
            {comments.map(c => (
              <View key={c.id} style={styles.commentItem}>
                <TouchableOpacity onPress={() => router.push(`/user/${c.commentedBy.id}`)}>
                  <Avatar uri={c.commentedBy.profileImage} name={c.commentedBy.name} size={36} />
                </TouchableOpacity>
                <View style={styles.commentBubble}>
                  <Text style={styles.commentAuthor}>{c.commentedBy.name}</Text>
                  <Text style={styles.commentText}>{c.comment}</Text>
                  <View style={styles.commentFooter}>
                    <Text style={styles.commentTime}>{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</Text>
                    <TouchableOpacity onPress={() => setReplyTo(c)}>
                      <Text style={styles.replyBtn}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Comment input */}
        <View style={styles.inputArea}>
          {replyTo && (
            <View style={styles.replyBar}>
              <Text style={styles.replyBarText}>Replying to {replyTo.commentedBy.name}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}><Ionicons name="close" size={16} color={colors.textMuted} /></TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <Avatar uri={me?.profileImage} name={me?.name ?? 'Me'} size={36} />
            <TextInput
              style={styles.input}
              placeholder="Write a comment..."
              placeholderTextColor={colors.textLight}
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <TouchableOpacity onPress={onSend} disabled={!comment.trim()} style={styles.sendBtn}>
              <Ionicons name="send" size={20} color={comment.trim() ? colors.primary : colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.bg },
  navBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  navTitle:        { fontSize: font.md, fontWeight: '700', color: colors.text },
  commentsSection: { backgroundColor: colors.surface, padding: spacing.lg },
  commentsTitle:   { fontSize: font.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  commentItem:     { flexDirection: 'row', marginBottom: spacing.md, gap: 10 },
  commentBubble:   { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, padding: 10 },
  commentAuthor:   { fontSize: font.sm, fontWeight: '700', color: colors.text, marginBottom: 2 },
  commentText:     { fontSize: font.base, color: colors.text, lineHeight: 20 },
  commentFooter:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  commentTime:     { fontSize: font.sm - 1, color: colors.textMuted },
  replyBtn:        { fontSize: font.sm, fontWeight: '600', color: colors.primary },
  inputArea:       { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md },
  replyBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg, borderRadius: radius.sm, padding: 8, marginBottom: 8 },
  replyBarText:    { fontSize: font.sm, color: colors.textMuted },
  inputRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input:           { flex: 1, backgroundColor: colors.bg, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8, fontSize: font.base, color: colors.text, maxHeight: 100 },
  sendBtn:         { padding: 8 },
});
