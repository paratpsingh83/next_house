import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '@/components/common/Avatar';
import { postsApi } from '@/api';
import type { PostResponse } from '@/types';
import { colors, font, spacing, radius } from '@/theme';

const TYPE_COLOR: Record<string, string> = {
  NEWS: '#3B82F6', HELP: '#F59E0B', SAFETY: '#EF4444',
  EVENT: '#8B5CF6', MARKETPLACE: '#10B981', GENERAL: '#6B7280',
};

interface Props {
  post: PostResponse;
  onUpdated?: (p: PostResponse) => void;
}

export default function PostCard({ post, onUpdated }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const imageHeight = Math.round(width * 0.56); // 16:9 ratio
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likes, setLikes] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.isSaved ?? false);

  const toggleLike = async () => {
    try {
      if (liked) {
        await postsApi.removeReact(post.id);
        setLiked(false); setLikes(l => l - 1);
      } else {
        await postsApi.react(post.id, { reactionType: 'LIKE' });
        setLiked(true); setLikes(l => l + 1);
      }
    } catch {}
  };

  const toggleSave = async () => {
    try {
      if (saved) { await postsApi.unsave(post.id); setSaved(false); }
      else { await postsApi.save(post.id); setSaved(true); }
    } catch {}
  };

  const thumb = post.media?.[0]?.url ?? post.thumbnailUrl;
  const typeColor = TYPE_COLOR[post.postType] ?? colors.textMuted;
  const author = post.anonymous ? null : post.createdBy;

  return (
    <TouchableOpacity activeOpacity={0.95} onPress={() => router.push(`/post/${post.id}`)} style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => author && router.push(`/user/${author.id}`)}
          style={styles.authorRow}
        >
          <Avatar uri={author?.profileImage} name={author?.name ?? 'Anonymous'} size={38} online={author?.online} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.authorName}>{author?.name ?? 'Anonymous'}</Text>
            <Text style={styles.time}>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</Text>
          </View>
        </TouchableOpacity>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + '22' }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>{post.postType}</Text>
        </View>
      </View>

      {/* Content */}
      {post.content && <Text style={styles.content} numberOfLines={4}>{post.content}</Text>}

      {/* Image */}
      {thumb && <Image source={{ uri: thumb }} style={[styles.image, { height: imageHeight }]} resizeMode="cover" />}

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={toggleLike} style={styles.action}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.danger : colors.textMuted} />
          <Text style={styles.count}>{likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push(`/post/${post.id}`)} style={styles.action}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
          <Text style={styles.count}>{post.commentCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleSave} style={styles.action}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? colors.primary : colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:       { backgroundColor: colors.surface, marginBottom: spacing.sm, padding: spacing.lg },
  header:     { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  authorRow:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  authorName: { fontSize: font.base, fontWeight: '600', color: colors.text },
  time:       { fontSize: font.sm, color: colors.textMuted, marginTop: 1 },
  typeBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  typeText:   { fontSize: 10, fontWeight: '700' },
  content:    { fontSize: font.base, color: colors.text, lineHeight: 22, marginBottom: spacing.sm },
  image:      { width: '100%', borderRadius: radius.md, marginBottom: spacing.sm },
  footer:     { flexDirection: 'row', alignItems: 'center', gap: 20, paddingTop: spacing.xs },
  action:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  count:      { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
});
