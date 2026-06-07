import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { usersApi } from '@/api';
import { setUser } from '@/store/slices/authSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import Avatar from '@/components/common/Avatar';
import { colors, font, spacing, radius } from '@/theme';

export default function SettingsScreen() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const qc       = useQueryClient();
  const me       = useAppSelector(s => s.auth.user);
  const [isPrivate, setIsPrivate] = useState(me?.isPrivate ?? false);

  const privacyMut = useMutation({
    mutationFn: (val: boolean) => usersApi.updateProfile({ isPrivate: val }),
    onSuccess: (user) => { dispatch(setUser(user)); qc.invalidateQueries({ queryKey: ['my-profile'] }); },
    onError: () => Alert.alert('Error', 'Failed to update privacy setting'),
  });

  const togglePrivacy = (val: boolean) => {
    setIsPrivate(val);
    privacyMut.mutate(val);
  };

  const sections = [
    {
      title: 'Account',
      items: [
        { label: 'Edit Profile',    icon: 'create-outline',       onPress: () => router.push('/settings/edit-profile') },
        { label: 'Change Password', icon: 'lock-closed-outline',  onPress: () => router.push('/settings/change-password') },
      ],
    },
    {
      title: 'Privacy',
      items: [
        { label: 'Follow Requests', icon: 'people-circle-outline', onPress: () => router.push('/follow-requests') },
        { label: 'Blocked Users',   icon: 'ban-outline',           onPress: () => router.push('/blocked') },
      ],
    },
    {
      title: 'Content',
      items: [
        { label: 'Saved Posts',   icon: 'bookmark-outline', onPress: () => router.push('/saved') },
        { label: 'My Listings',   icon: 'storefront-outline', onPress: () => router.push('/marketplace/mine') },
        { label: 'Borrow Requests', icon: 'hand-left-outline', onPress: () => router.push('/borrow') },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView>
        {/* Profile card */}
        <TouchableOpacity onPress={() => router.push('/settings/edit-profile')} style={styles.profileCard}>
          <Avatar uri={me?.profileImage} name={me?.name ?? 'Me'} size={56} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{me?.name}</Text>
            <Text style={styles.profileHandle}>@{me?.username}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Private account toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleInfo}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.toggleLabel}>Private Account</Text>
              <Text style={styles.toggleSub}>Only followers can see your posts</Text>
            </View>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={togglePrivacy}
            trackColor={{ true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Sections */}
        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map(item => (
              <TouchableOpacity key={item.label} onPress={item.onPress} style={styles.menuItem}>
                <Ionicons name={item.icon as any} size={20} color={colors.primary} style={styles.menuIcon} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <Text style={styles.version}>NextHouse Mobile v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:  { fontSize: font.lg, fontWeight: '700', color: colors.text },
  profileCard:  { flexDirection: 'row', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.surface, marginBottom: spacing.sm },
  profileInfo:  { flex: 1, marginLeft: 14 },
  profileName:  { fontSize: font.lg, fontWeight: '700', color: colors.text },
  profileHandle:{ fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  toggleCard:   { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface, marginBottom: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  toggleInfo:   { flex: 1, flexDirection: 'row', alignItems: 'center' },
  toggleLabel:  { fontSize: font.base, fontWeight: '600', color: colors.text },
  toggleSub:    { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  section:      { backgroundColor: colors.surface, marginBottom: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: font.sm, fontWeight: '700', color: colors.textMuted, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuItem:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.border },
  menuIcon:     { marginRight: 14 },
  menuLabel:    { flex: 1, fontSize: font.base, color: colors.text, fontWeight: '500' },
  version:      { textAlign: 'center', fontSize: font.sm, color: colors.textLight, padding: spacing.xl },
});
