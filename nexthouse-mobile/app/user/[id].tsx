import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, FlatList, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { usersApi, postsApi, chatApi } from '@/api';
import { useAppSelector } from '@/store/hooks';
import Avatar from '@/components/common/Avatar';
import PostCard from '@/components/post/PostCard';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';

export default function UserProfileScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const me      = useAppSelector(s => s.auth.user);
  const isMe    = me?.id === Number(id);

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn:  () => usersApi.getProfile(Number(id)),
  });

  const { data: postsData } = useQuery({
    queryKey: ['user-posts', id],
    queryFn:  () => postsApi.userPosts(Number(id), 0, 12),
    enabled:  !!id && !!user && (!user.isPrivate || user.isFollowing),
  });

  const followMut = useMutation({
    mutationFn: () => user?.isFollowing ? usersApi.unfollow(Number(id)) : usersApi.follow(Number(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', id] }),
  });

  const blockMut = useMutation({
    mutationFn: () => user?.isBlocked ? usersApi.unblock(Number(id)) : usersApi.block(Number(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', id] }),
  });

  const onMessage = async () => {
    try {
      const room = await chatApi.directRoom(Number(id));
      router.push(`/chat/${room.id}`);
    } catch { Alert.alert('Error', 'Could not open chat'); }
  };

  if (isLoading || !user) return <Spinner full />;

  const posts   = postsData?.content ?? [];
  const locked  = user.isPrivate && !user.isFollowing && !isMe;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.navTitle}>@{user.username}</Text>
        {!isMe && (
          <TouchableOpacity onPress={() => Alert.alert('Options', '', [
            { text: user.isBlocked ? 'Unblock' : 'Block', onPress: () => blockMut.mutate() },
            { text: 'Cancel', style: 'cancel' },
          ])}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Avatar uri={user.profileImage} name={user.name} size={80} online={user.online} />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{user.name}</Text>
            {user.bio && <Text style={styles.bio} numberOfLines={3}>{user.bio}</Text>}
            <View style={styles.badges}>
              {user.identityVerified && <View style={styles.badge}><Ionicons name="shield-checkmark" size={12} color={colors.secondary} /><Text style={styles.badgeText}>Verified</Text></View>}
              {user.addressVerified  && <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}><Ionicons name="home" size={12} color={colors.primary} /><Text style={[styles.badgeText, { color: colors.primary }]}>Local</Text></View>}
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          {[['Followers', user.followerCount ?? 0], ['Following', user.followingCount ?? 0], ['Trust', user.trustScore]].map(([l, v]) => (
            <View key={l} style={styles.stat}><Text style={styles.statVal}>{v}</Text><Text style={styles.statLbl}>{l}</Text></View>
          ))}
        </View>

        {/* Actions */}
        {!isMe && !user.isBlocked && (
          <View style={styles.actions}>
            <Button
              label={user.isFollowing ? 'Unfollow' : user.isRequested ? 'Requested' : 'Follow'}
              variant={user.isFollowing ? 'outline' : 'primary'}
              onPress={() => followMut.mutate()}
              loading={followMut.isPending}
              style={{ flex: 1 }}
            />
            <Button label="Message" variant="outline" onPress={onMessage} style={{ flex: 1 }} />
          </View>
        )}

        {/* Posts */}
        {locked ? (
          <EmptyState icon="lock-closed-outline" title="Private Account" subtitle="Follow this user to see their posts" />
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Posts</Text>
            {posts.map(p => <PostCard key={p.id} post={p} />)}
            {posts.length === 0 && <EmptyState icon="image-outline" title="No posts yet" />}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  navBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  navTitle:   { fontSize: font.md, fontWeight: '700', color: colors.text },
  header:     { flexDirection: 'row', gap: 16, padding: spacing.xl, backgroundColor: colors.surface },
  headerInfo: { flex: 1 },
  name:       { fontSize: font.lg, fontWeight: '700', color: colors.text, marginBottom: 4 },
  bio:        { fontSize: font.sm, color: colors.textMuted, lineHeight: 20, marginBottom: 8 },
  badges:     { flexDirection: 'row', gap: 6 },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:  { fontSize: 10, color: colors.secondary, fontWeight: '700' },
  stats:      { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  stat:       { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statVal:    { fontSize: font.lg, fontWeight: '800', color: colors.text },
  statLbl:    { fontSize: font.sm - 1, color: colors.textMuted, marginTop: 2 },
  actions:    { flexDirection: 'row', gap: 12, padding: spacing.lg, backgroundColor: colors.surface },
  sectionTitle: { fontSize: font.md, fontWeight: '700', color: colors.text, padding: spacing.lg },
});
