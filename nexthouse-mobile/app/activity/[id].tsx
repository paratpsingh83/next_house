import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { activitiesApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import Avatar from '@/components/common/Avatar';
import { colors, font, spacing, radius } from '@/theme';
import type { ActivityMemberResponse } from '@/types';

const TYPE_ICON: Record<string, string> = {
  SOCIAL: 'people-outline', SPORTS: 'football-outline', LEARNING: 'book-outline',
  VOLUNTEERING: 'heart-outline', FOOD: 'restaurant-outline', ARTS: 'color-palette-outline',
  OUTDOOR: 'leaf-outline', NEIGHBORHOOD_WATCH: 'eye-outline', OTHER: 'star-outline',
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: colors.secondary, CLOSED: colors.textMuted, CANCELLED: colors.danger, COMPLETED: colors.textMuted,
};

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const actId   = Number(id);

  const { data: activity, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['activity', actId],
    queryFn:  () => activitiesApi.get(actId),
    enabled:  !!actId,
  });

  const { data: membersData } = useQuery({
    queryKey: ['activity-members', actId],
    queryFn:  () => activitiesApi.getMembers(actId, 'APPROVED', 0, 50),
    enabled:  !!actId,
  });

  const joinMut = useMutation({
    mutationFn: () => activitiesApi.join(actId),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['activity', actId] }); qc.invalidateQueries({ queryKey: ['activities-nearby'] }); },
    onError:    (e: any) => Alert.alert('Error', e?.message ?? 'Could not join activity'),
  });

  const leaveMut = useMutation({
    mutationFn: () => activitiesApi.leave(actId),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['activity', actId] }); qc.invalidateQueries({ queryKey: ['activities-nearby'] }); },
    onError:    (e: any) => Alert.alert('Error', e?.message ?? 'Could not leave activity'),
  });

  if (isLoading) return <Spinner full />;
  if (!activity) return null;

  const icon       = TYPE_ICON[activity.activityType] ?? 'star-outline';
  const statusColor = STATUS_COLOR[activity.status] ?? colors.textMuted;
  const members    = membersData?.content ?? [];
  const canJoin    = activity.myJoinStatus === 'NONE' && activity.status === 'OPEN' && !activity.isHost;
  const canLeave   = (activity.myJoinStatus === 'APPROVED' || activity.myJoinStatus === 'PENDING') && !activity.isHost;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{activity.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name={icon as any} size={40} color={colors.primary} />
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{activity.status}</Text>
          </View>
        </View>

        {/* Title + type */}
        <Text style={styles.title}>{activity.title}</Text>
        <Text style={styles.type}>{activity.activityType.replace('_', ' ')}</Text>

        {/* Info cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.infoLabel}>Date & Time</Text>
            <Text style={styles.infoValue}>{format(new Date(activity.activityTime), 'MMM d, yyyy')}</Text>
            <Text style={styles.infoValue}>{format(new Date(activity.activityTime), 'h:mm a')}</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="people-outline" size={18} color={colors.primary} />
            <Text style={styles.infoLabel}>Members</Text>
            <Text style={styles.infoValue}>
              {activity.currentMemberCount}{activity.maxMembers ? ` / ${activity.maxMembers}` : ''}
            </Text>
          </View>
        </View>

        {activity.address && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={styles.locationText}>{activity.address}</Text>
          </View>
        )}

        {/* Description */}
        {activity.description && (
          <>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{activity.description}</Text>
          </>
        )}

        {/* Host */}
        <Text style={styles.sectionTitle}>Hosted by</Text>
        <View style={styles.hostRow}>
          <Avatar uri={activity.hostUser.profileImage} name={activity.hostUser.name} size={40} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.hostName}>{activity.hostUser.name}</Text>
            <Text style={styles.hostUsername}>@{activity.hostUser.username}</Text>
          </View>
          {activity.isHost && (
            <View style={styles.hostBadge}><Text style={styles.hostBadgeText}>Host</Text></View>
          )}
        </View>

        {/* Members */}
        {members.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Members ({members.length})</Text>
            {members.map((m: ActivityMemberResponse) => (
              <View key={m.id} style={styles.memberRow}>
                <Avatar uri={m.user.profileImage} name={m.user.name} size={36} />
                <Text style={styles.memberName}>{m.user.name}</Text>
                <Text style={styles.memberRole}>{m.role}</Text>
              </View>
            ))}
          </>
        )}

        {/* Actions */}
        <View style={styles.actionArea}>
          {canJoin && (
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={() => joinMut.mutate()}
              disabled={joinMut.isPending}
            >
              {joinMut.isPending ? <Spinner /> : <Text style={styles.joinBtnText}>
                {activity.approvalRequired ? 'Request to Join' : 'Join Activity'}
              </Text>}
            </TouchableOpacity>
          )}
          {activity.myJoinStatus === 'PENDING' && !canLeave && (
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={16} color="#D97706" />
              <Text style={styles.pendingText}>Approval pending</Text>
            </View>
          )}
          {canLeave && (
            <TouchableOpacity
              style={styles.leaveBtn}
              onPress={() => Alert.alert('Leave Activity', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: () => leaveMut.mutate() },
              ])}
              disabled={leaveMut.isPending}
            >
              {leaveMut.isPending ? <Spinner /> : <Text style={styles.leaveBtnText}>Leave Activity</Text>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:       { width: 40 },
  headerTitle:   { flex: 1, fontSize: font.md, fontWeight: '700', color: colors.text, textAlign: 'center' },
  content:       { padding: spacing.lg, gap: spacing.md },
  hero:          { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  heroIcon:      { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  statusBadge:   { paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.full },
  statusText:    { fontSize: font.sm, fontWeight: '700' },
  title:         { fontSize: font.xl, fontWeight: '800', color: colors.text, textAlign: 'center' },
  type:          { fontSize: font.base, color: colors.textMuted, textAlign: 'center', textTransform: 'capitalize' },
  infoGrid:      { flexDirection: 'row', gap: spacing.md },
  infoCard:      { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border },
  infoLabel:     { fontSize: font.sm - 1, color: colors.textMuted, marginTop: 4 },
  infoValue:     { fontSize: font.base, fontWeight: '700', color: colors.text },
  locationRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  locationText:  { flex: 1, fontSize: font.sm, color: colors.textMuted },
  sectionTitle:  { fontSize: font.base, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  description:   { fontSize: font.base, color: colors.textMuted, lineHeight: 22 },
  hostRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  hostName:      { fontSize: font.base, fontWeight: '700', color: colors.text },
  hostUsername:  { fontSize: font.sm, color: colors.textMuted },
  hostBadge:     { backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  hostBadgeText: { fontSize: font.sm, color: colors.primary, fontWeight: '700' },
  memberRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
  memberName:    { flex: 1, fontSize: font.base, color: colors.text },
  memberRole:    { fontSize: font.sm, color: colors.textMuted },
  actionArea:    { paddingTop: spacing.md, gap: spacing.sm },
  joinBtn:       { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 14, alignItems: 'center' },
  joinBtnText:   { color: '#fff', fontSize: font.base, fontWeight: '700' },
  leaveBtn:      { borderRadius: radius.full, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.danger },
  leaveBtnText:  { color: colors.danger, fontSize: font.base, fontWeight: '700' },
  pendingBadge:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF3C7', borderRadius: radius.full, paddingVertical: 12 },
  pendingText:   { color: '#D97706', fontSize: font.base, fontWeight: '600' },
});