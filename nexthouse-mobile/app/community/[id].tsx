import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  Image, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import { communitiesApi, postsApi } from '@/api';
import { useAppSelector } from '@/store/hooks';
import Spinner from '@/components/common/Spinner';
import PostCard from '@/components/post/PostCard';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';
import type { UserSummaryDTO } from '@/types';

type Tab = 'posts' | 'members' | 'about';

export default function CommunityDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const me      = useAppSelector(s => s.auth.user);

  const communityId = Number(id);

  const [tab, setTab]                   = useState<Tab>('posts');
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<UserSummaryDTO | null>(null);

  // ── Community ─────────────────────────────────────────────────────────────
  const { data: community, isLoading } = useQuery({
    queryKey: ['community', communityId],
    queryFn:  () => communitiesApi.get(communityId),
    enabled:  !!communityId,
  });

  // ── Posts ─────────────────────────────────────────────────────────────────
  const {
    data: postsData,
    isLoading: loadingPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['community-posts', communityId],
    queryFn:  ({ pageParam = 0 }) => postsApi.communityFeed(communityId, pageParam),
    getNextPageParam: l => (l.hasNext ? l.page + 1 : undefined),
    initialPageParam: 0,
    enabled: tab === 'posts' && !!communityId,
  });
  const posts = postsData?.pages.flatMap(p => p.content) ?? [];

  // ── Members ───────────────────────────────────────────────────────────────
  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['community-members', communityId],
    queryFn:  () => communitiesApi.getMembers(communityId, undefined, 0, 50),
    enabled:  tab === 'members' || showTransfer,
  });
  const members = membersData?.content ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────
  const joinMut = useMutation({
    mutationFn: () => communitiesApi.join(communityId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['community', communityId] });
      qc.invalidateQueries({ queryKey: ['communities'] });
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Failed to join'),
  });

  const leaveMut = useMutation({
    mutationFn: () => communitiesApi.leave(communityId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['community', communityId] });
      qc.invalidateQueries({ queryKey: ['communities'] });
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Failed to leave'),
  });

  const deleteMut = useMutation({
    mutationFn: () => communitiesApi.delete(communityId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['communities'] });
      router.back();
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Failed to delete'),
  });

  const transferMut = useMutation({
    mutationFn: (newOwnerUserId: number) =>
      communitiesApi.transferOwnership(communityId, newOwnerUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', communityId] });
      qc.invalidateQueries({ queryKey: ['community-members', communityId] });
      setShowTransfer(false);
      setSelectedNewOwner(null);
      Alert.alert('Done', 'Ownership transferred successfully.');
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'Transfer failed'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleJoin = () => {
    joinMut.mutate();
  };

  const handleLeave = () => {
    Alert.alert('Leave Community', `Leave "${community?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leaveMut.mutate() },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Community',
      'This will permanently delete the community. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate() },
      ]
    );
  };

  const handleTransferConfirm = () => {
    if (!selectedNewOwner) return;
    Alert.alert(
      'Transfer Ownership',
      `Transfer ownership to ${selectedNewOwner.name}? You will become a regular member.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Transfer', style: 'destructive', onPress: () => transferMut.mutate(selectedNewOwner.id) },
      ]
    );
  };

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (isLoading || !community) return <Spinner full />;

  const isOwner   = community.myRole === 'OWNER';
  const isAdmin   = community.myRole === 'ADMIN' || isOwner;
  const isMember  = community.isMember;
  const isPending = community.isPending;

  const transferCandidates = members.filter(m => m.id !== me?.id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{community.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Cover ──────────────────────────────────────────────────────── */}
        <View style={styles.coverWrap}>
          {community.coverImage
            ? <Image source={{ uri: community.coverImage }} style={styles.cover} resizeMode="cover" />
            : <View style={[styles.cover, styles.coverPlaceholder]}>
                <Ionicons name="people" size={40} color={colors.primary} />
              </View>
          }
          {/* Icon overlay */}
          <View style={styles.iconWrap}>
            {community.iconImage
              ? <Image source={{ uri: community.iconImage }} style={styles.icon} />
              : <View style={[styles.icon, styles.iconPlaceholder]}>
                  <Text style={styles.iconLetter}>{community.name[0]}</Text>
                </View>
            }
          </View>
        </View>

        {/* ── Info ───────────────────────────────────────────────────────── */}
        <View style={styles.infoWrap}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{community.name}</Text>
            {community.verified && (
              <Ionicons name="shield-checkmark" size={18} color={colors.secondary} />
            )}
            {isOwner && (
              <View style={styles.ownerBadge}>
                <Ionicons name="ribbon" size={11} color="#b45309" />
                <Text style={styles.ownerBadgeText}>Owner</Text>
              </View>
            )}
          </View>

          <Text style={styles.meta}>
            {community.communityType}  ·  {community.memberCount} members
            {community.privateCommunity ? '  ·  🔒 Private' : '  ·  🌍 Public'}
          </Text>

          {community.description ? (
            <Text style={styles.description}>{community.description}</Text>
          ) : null}

          {/* ── Action buttons ──────────────────────────────────────────── */}
          <View style={styles.actions}>
            {!isMember && !isPending && (
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={handleJoin}
                disabled={joinMut.isPending}
              >
                {joinMut.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.joinBtnText}>
                      {community.privateCommunity ? 'Request to Join' : 'Join Community'}
                    </Text>
                }
              </TouchableOpacity>
            )}

            {isPending && (
              <View style={styles.pendingBtn}>
                <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                <Text style={styles.pendingBtnText}>Request Pending</Text>
              </View>
            )}

            {isMember && !isOwner && (
              <TouchableOpacity
                style={styles.leaveBtn}
                onPress={handleLeave}
                disabled={leaveMut.isPending}
              >
                <Ionicons name="exit-outline" size={16} color={colors.danger} />
                <Text style={styles.leaveBtnText}>Leave</Text>
              </TouchableOpacity>
            )}

            {isOwner && (
              <TouchableOpacity
                style={styles.transferBtn}
                onPress={() => setShowTransfer(true)}
              >
                <Ionicons name="swap-horizontal-outline" size={16} color="#b45309" />
                <Text style={styles.transferBtnText}>Transfer Ownership</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <View style={styles.tabs}>
          {(['posts', 'members', 'about'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── POSTS TAB ─────────────────────────────────────────────────── */}
        {tab === 'posts' && (
          <View style={styles.tabContent}>
            {loadingPosts && <Spinner full />}
            {!loadingPosts && posts.length === 0 && (
              <EmptyState icon="newspaper-outline" title="No posts yet" subtitle={isMember ? 'Be the first to post!' : 'Join to see posts'} />
            )}
            {posts.map(post => <PostCard key={post.id} post={post} />)}
            {hasNextPage && (
              <TouchableOpacity style={styles.loadMore} onPress={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? <Spinner /> : <Text style={styles.loadMoreText}>Load more</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── MEMBERS TAB ───────────────────────────────────────────────── */}
        {tab === 'members' && (
          <View style={styles.tabContent}>
            {loadingMembers && <Spinner full />}
            {!loadingMembers && members.length === 0 && (
              <EmptyState icon="people-outline" title="No members" />
            )}
            {members.map(member => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberRow}
                onPress={() => router.push(`/user/${member.id}`)}
              >
                <View style={styles.avatar}>
                  {member.profileImage
                    ? <Image source={{ uri: member.profileImage }} style={styles.avatarImg} />
                    : <Text style={styles.avatarLetter}>{member.name[0]}</Text>
                  }
                  {member.online && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberUsername}>@{member.username}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {isAdmin && (
              <TouchableOpacity style={styles.adminAction} onPress={() => Alert.alert('Pending Requests', 'Review pending requests in the admin panel.')}>
                <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                <Text style={styles.adminActionText}>Review Pending Requests</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── ABOUT TAB ─────────────────────────────────────────────────── */}
        {tab === 'about' && (
          <View style={styles.tabContent}>
            <View style={styles.aboutCard}>
              <View style={styles.aboutRow}>
                <Ionicons name="people-outline" size={18} color={colors.textMuted} />
                <Text style={styles.aboutText}><Text style={styles.aboutBold}>{community.memberCount}</Text> members</Text>
              </View>
              <View style={styles.aboutRow}>
                <Ionicons name={community.privateCommunity ? 'lock-closed-outline' : 'globe-outline'} size={18} color={colors.textMuted} />
                <Text style={styles.aboutText}>{community.privateCommunity ? 'Private — approval required' : 'Public — anyone can join'}</Text>
              </View>
              {community.communityType ? (
                <View style={styles.aboutRow}>
                  <Ionicons name="grid-outline" size={18} color={colors.textMuted} />
                  <Text style={styles.aboutText}>Type: <Text style={styles.aboutBold}>{community.communityType}</Text></Text>
                </View>
              ) : null}
              {community.neighborhood ? (
                <View style={styles.aboutRow}>
                  <Ionicons name="location-outline" size={18} color={colors.textMuted} />
                  <Text style={styles.aboutText}>{community.neighborhood.name}</Text>
                </View>
              ) : null}
              {community.createdBy ? (
                <View style={styles.aboutRow}>
                  <Ionicons name="ribbon-outline" size={18} color={colors.textMuted} />
                  <Text style={styles.aboutText}>Created by <Text style={styles.aboutBold}>{community.createdBy.name}</Text></Text>
                </View>
              ) : null}
              <View style={styles.aboutRow}>
                <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                <Text style={styles.aboutText}>
                  {formatDistanceToNow(new Date(community.createdAt), { addSuffix: true })}
                </Text>
              </View>
            </View>

            {/* Owner danger zone */}
            {isOwner && (
              <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>Owner Actions</Text>
                <TouchableOpacity style={styles.transferBtn} onPress={() => setShowTransfer(true)}>
                  <Ionicons name="swap-horizontal-outline" size={16} color="#b45309" />
                  <Text style={styles.transferBtnText}>Transfer Ownership</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                  disabled={deleteMut.isPending}
                >
                  {deleteMut.isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.deleteBtnText}>Delete Community</Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Transfer Ownership Modal ─────────────────────────────────────── */}
      <Modal
        visible={showTransfer}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowTransfer(false); setSelectedNewOwner(null); }}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Transfer Ownership</Text>
            <TouchableOpacity onPress={() => { setShowTransfer(false); setSelectedNewOwner(null); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Select a member to become the new owner. You will be demoted to Member.
          </Text>

          {loadingMembers
            ? <Spinner full />
            : (
              <FlatList
                data={transferCandidates}
                keyExtractor={m => String(m.id)}
                contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
                ListEmptyComponent={
                  <EmptyState icon="people-outline" title="No other members" subtitle="Add members before transferring ownership" />
                }
                renderItem={({ item: member }) => (
                  <TouchableOpacity
                    style={[styles.memberRow, styles.memberRowSelectable, selectedNewOwner?.id === member.id && styles.memberRowSelected]}
                    onPress={() => setSelectedNewOwner(member)}
                  >
                    <View style={styles.avatar}>
                      {member.profileImage
                        ? <Image source={{ uri: member.profileImage }} style={styles.avatarImg} />
                        : <Text style={styles.avatarLetter}>{member.name[0]}</Text>
                      }
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberUsername}>@{member.username}</Text>
                    </View>
                    {selectedNewOwner?.id === member.id && (
                      <Ionicons name="ribbon" size={18} color="#b45309" />
                    )}
                  </TouchableOpacity>
                )}
              />
            )
          }

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.transferConfirmBtn, (!selectedNewOwner || transferMut.isPending) && styles.transferConfirmBtnDisabled]}
              onPress={handleTransferConfirm}
              disabled={!selectedNewOwner || transferMut.isPending}
            >
              {transferMut.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.transferConfirmBtnText}>
                    Transfer to {selectedNewOwner?.name ?? '…'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:                    { flex: 1, backgroundColor: colors.bg },
  header:                  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:             { flex: 1, fontSize: font.md, fontWeight: '700', color: colors.text, textAlign: 'center', marginHorizontal: spacing.sm },
  coverWrap:               { position: 'relative' },
  cover:                   { width: '100%', height: 150 },
  coverPlaceholder:        { backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  iconWrap:                { position: 'absolute', bottom: -28, left: spacing.lg },
  icon:                    { width: 56, height: 56, borderRadius: 14, borderWidth: 2, borderColor: colors.surface },
  iconPlaceholder:         { backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  iconLetter:              { fontSize: font.xl, fontWeight: '800', color: colors.primary },
  infoWrap:                { paddingTop: 40, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  nameRow:                 { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name:                    { fontSize: font.xl, fontWeight: '800', color: colors.text },
  ownerBadge:              { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  ownerBadgeText:          { fontSize: 11, fontWeight: '700', color: '#b45309' },
  meta:                    { fontSize: font.sm, color: colors.textMuted, marginTop: 4 },
  description:             { fontSize: font.base, color: colors.text, marginTop: 8, lineHeight: 20 },
  actions:                 { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  joinBtn:                 { flex: 1, backgroundColor: colors.primary, paddingVertical: 11, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  joinBtnText:             { color: '#fff', fontWeight: '700', fontSize: font.base },
  pendingBtn:              { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border },
  pendingBtnText:          { color: colors.textMuted, fontWeight: '600', fontSize: font.base },
  leaveBtn:                { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: radius.full, borderWidth: 1.5, borderColor: '#fca5a5' },
  leaveBtnText:            { color: colors.danger, fontWeight: '700', fontSize: font.base },
  transferBtn:             { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: radius.full, borderWidth: 1.5, borderColor: '#fcd34d', backgroundColor: '#fffbeb' },
  transferBtnText:         { color: '#b45309', fontWeight: '700', fontSize: font.sm },
  tabs:                    { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab:                     { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:               { borderBottomColor: colors.primary },
  tabText:                 { fontSize: font.sm, fontWeight: '600', color: colors.textMuted },
  tabTextActive:           { color: colors.primary },
  tabContent:              { padding: spacing.md, gap: spacing.sm },
  loadMore:                { padding: spacing.md, alignItems: 'center' },
  loadMoreText:            { color: colors.primary, fontWeight: '600', fontSize: font.sm },
  memberRow:               { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  memberRowSelectable:     { borderColor: 'transparent' },
  memberRowSelected:       { borderColor: '#fcd34d', backgroundColor: '#fffbeb' },
  avatar:                  { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarImg:               { width: 44, height: 44, borderRadius: 22 },
  avatarLetter:            { fontSize: font.md, fontWeight: '700', color: colors.primary },
  onlineDot:               { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.online, borderWidth: 1.5, borderColor: colors.surface },
  memberInfo:              { flex: 1 },
  memberName:              { fontSize: font.base, fontWeight: '600', color: colors.text },
  memberUsername:          { fontSize: font.sm, color: colors.textMuted },
  adminAction:             { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm },
  adminActionText:         { flex: 1, fontSize: font.base, fontWeight: '600', color: colors.primary },
  aboutCard:               { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: 14, borderWidth: 1, borderColor: colors.border },
  aboutRow:                { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  aboutText:               { fontSize: font.base, color: colors.text, flex: 1 },
  aboutBold:               { fontWeight: '700' },
  dangerZone:              { marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: '#fca5a5' },
  dangerTitle:             { fontSize: font.sm, fontWeight: '700', color: colors.danger, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  deleteBtn:               { backgroundColor: colors.danger, paddingVertical: 12, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText:           { color: '#fff', fontWeight: '700', fontSize: font.base },
  modalSafe:               { flex: 1, backgroundColor: colors.bg },
  modalHeader:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  modalTitle:              { fontSize: font.lg, fontWeight: '700', color: colors.text },
  modalSubtitle:           { fontSize: font.sm, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  modalFooter:             { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  transferConfirmBtn:      { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.full, alignItems: 'center' },
  transferConfirmBtnDisabled: { backgroundColor: colors.border },
  transferConfirmBtnText:  { color: '#fff', fontWeight: '700', fontSize: font.base },
});