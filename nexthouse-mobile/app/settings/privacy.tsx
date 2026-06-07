import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usersApi } from '@/api';
import { useAppSelector } from '@/store/hooks';
import Spinner from '@/components/common/Spinner';
import { colors, font, spacing, radius } from '@/theme';

function SettingRow({
  icon, label, subtitle, value, onToggle,
}: {
  icon: string; label: string; subtitle?: string; value: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.primary + '15' }]}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useAppSelector(s => s.auth.user);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: usersApi.getMe,
    enabled: !!me,
  });

  const [isPrivate, setIsPrivate] = useState(profile?.isPrivate ?? false);

  React.useEffect(() => {
    if (profile) setIsPrivate(profile.isPrivate ?? false);
  }, [profile]);

  const updateMut = useMutation({
    mutationFn: (val: boolean) => usersApi.updateProfile({ isPrivate: val }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-profile'] }),
    onError: () => Alert.alert('Error', 'Failed to update privacy settings'),
  });

  const toggle = (val: boolean) => {
    setIsPrivate(val);
    updateMut.mutate(val);
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () =>
            usersApi.deleteAccount().then(() => router.replace('/(auth)/login')).catch(() => Alert.alert('Error', 'Failed to delete account')),
        },
      ],
    );
  };

  if (isLoading) return <Spinner full />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Safety</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView>
        <Text style={styles.sectionLabel}>Account Privacy</Text>
        <View style={styles.card}>
          <SettingRow
            icon="lock-closed-outline"
            label="Private Account"
            subtitle="Only approved followers can see your posts"
            value={isPrivate}
            onToggle={toggle}
          />
        </View>

        <Text style={styles.sectionLabel}>Blocked Users</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/settings/blocked')}>
            <View style={[styles.rowIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="ban-outline" size={20} color={colors.danger} />
            </View>
            <Text style={[styles.rowLabel, { flex: 1 }]}>Manage Blocked Users</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Data</Text>
        <View style={styles.card}>
          <TouchableOpacity style={[styles.linkRow, styles.danger]} onPress={deleteAccount}>
            <View style={[styles.rowIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </View>
            <Text style={[styles.rowLabel, { flex: 1, color: colors.danger }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:      { padding: 4 },
  headerTitle:  { fontSize: font.lg, fontWeight: '700', color: colors.text },
  sectionLabel: { fontSize: font.sm, fontWeight: '700', color: colors.textMuted, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  card:         { backgroundColor: colors.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowText:      { flex: 1 },
  rowLabel:     { fontSize: font.base, fontWeight: '500', color: colors.text },
  rowSub:       { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  linkRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14 },
  danger:       { borderTopWidth: 0 },
});