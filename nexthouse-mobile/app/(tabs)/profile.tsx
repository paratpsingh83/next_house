import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { usersApi, postsApi, authApi } from '@/api';
import { clearAuth } from '@/store/slices/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { tokens } from '@/lib/apiClient';
import { disconnectStomp } from '@/lib/stompClient';
import Avatar from '@/components/common/Avatar';
import PostCard from '@/components/post/PostCard';
import Spinner from '@/components/common/Spinner';
import { colors, font, spacing, radius } from '@/theme';

export default function MyProfileScreen() {
  const router    = useRouter();
  const dispatch  = useAppDispatch();
  const qc        = useQueryClient();
  const me        = useAppSelector(s => s.auth.user);

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn:  usersApi.getMe,
    enabled:  !!me,
  });

  const { data: postsData } = useQuery({
    queryKey: ['my-posts', me?.id],
    queryFn:  () => postsApi.userPosts(me!.id, 0, 12),
    enabled:  !!me,
  });

  const logoutMut = useMutation({
    mutationFn: authApi.logout,
    onSuccess:  async () => { disconnectStomp(); await tokens.clear(); dispatch(clearAuth()); },
    onError:    async () => { disconnectStomp(); await tokens.clear(); dispatch(clearAuth()); },
  });

  const onLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logoutMut.mutate() },
    ]);
  };

  const user = profile ?? me;
  if (!user) return <Spinner full />;

  const posts = postsData?.content ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.username}>@{user.username}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/settings')} style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile info */}
        <View style={styles.profileSection}>
          <Avatar uri={user.profileImage} name={user.name} size={80} online={user.online} />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user.name}</Text>
            {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

            {/* Verification badges */}
            <View style={styles.badges}>
              {user.identityVerified && (
                <View style={styles.badge}><Ionicons name="shield-checkmark" size={12} color={colors.secondary} /><Text style={styles.badgeText}>Verified</Text></View>
              )}
              {user.addressVerified && (
                <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}><Ionicons name="home" size={12} color={colors.primary} /><Text style={[styles.badgeText, { color: colors.primary }]}>Local</Text></View>
              )}
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Posts',     value: posts.length },
            { label: 'Followers', value: user.followerCount ?? 0 },
            { label: 'Following', value: user.followingCount ?? 0 },
            { label: 'Trust',     value: user.trustScore },
          ].map(({ label, value }) => (
            <View key={label} style={styles.stat}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Quick menu */}
        <View style={styles.menu}>
          {[
            { label: 'Edit Profile',    icon: 'create-outline',        route: '/settings/edit-profile' },
            { label: 'My Posts',        icon: 'grid-outline',          route: `/user/${user.id}` },
            { label: 'Saved Posts',     icon: 'bookmark-outline',      route: '/saved' },
            { label: 'Follow Requests', icon: 'people-circle-outline', route: '/follow-requests' },
            { label: 'Privacy',         icon: 'lock-closed-outline',   route: '/settings/privacy' },
          ].map(({ label, icon, route }) => (
            <TouchableOpacity key={label} onPress={() => router.push(route as any)} style={styles.menuItem}>
              <View style={styles.menuIcon}><Ionicons name={icon as any} size={20} color={colors.primary} /></View>
              <Text style={styles.menuLabel}>{label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity onPress={onLogout} style={[styles.menuItem, styles.menuItemDanger]}>
            <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}><Ionicons name="log-out-outline" size={20} color={colors.danger} /></View>
            <Text style={[styles.menuLabel, { color: colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: colors.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  username:      { fontSize: font.lg, fontWeight: '700', color: colors.text },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn:       { padding: 4 },
  profileSection:{ flexDirection: 'row', padding: spacing.xl, backgroundColor: colors.surface, alignItems: 'flex-start', gap: 16 },
  profileInfo:   { flex: 1 },
  name:          { fontSize: font.lg, fontWeight: '700', color: colors.text, marginBottom: 4 },
  bio:           { fontSize: font.base, color: colors.textMuted, marginBottom: 8, lineHeight: 20 },
  badges:        { flexDirection: 'row', gap: 6 },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText:     { fontSize: 10, color: colors.secondary, fontWeight: '700' },
  statsRow:      { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, marginTop: 1 },
  stat:          { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statValue:     { fontSize: font.lg, fontWeight: '800', color: colors.text },
  statLabel:     { fontSize: font.sm - 1, color: colors.textMuted, marginTop: 2 },
  menu:          { backgroundColor: colors.surface, marginTop: spacing.md, borderTopWidth: 1, borderColor: colors.border },
  menuItem:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuItemDanger:{ borderBottomWidth: 0 },
  menuIcon:      { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel:     { flex: 1, fontSize: font.base, color: colors.text, fontWeight: '500' },
});
