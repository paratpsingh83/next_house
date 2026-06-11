import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { usersApi } from '@/api';
import Avatar from '@/components/common/Avatar';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';
import type { UserSummaryDTO } from '@/types';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const { data: blocked, isLoading } = useQuery<UserSummaryDTO[]>({
    queryKey: ['blocked-users'],
    queryFn:  usersApi.getBlockedUsers,
  });

  const unblockMut = useMutation({
    mutationFn: (userId: number) => usersApi.unblock(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocked-users'] }),
    onError: () => Alert.alert('Error', 'Failed to unblock user'),
  });

  const confirmUnblock = (user: UserSummaryDTO) => {
    Alert.alert(
      'Unblock User',
      `Unblock @${user.username}? They will be able to see your profile and follow you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unblock', style: 'destructive', onPress: () => unblockMut.mutate(user.id) },
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
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={blocked ?? []}
        keyExtractor={item => String(item.id)}
        ListEmptyComponent={<EmptyState icon="ban-outline" title="No blocked users" subtitle="Users you block will appear here" />}
        contentContainerStyle={blocked?.length === 0 ? { flex: 1 } : { padding: spacing.md }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.profileImage} name={item.name} size={44} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.handle}>@{item.username}</Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmUnblock(item)}
              disabled={unblockMut.isPending}
              style={styles.unblockBtn}
            >
              {unblockMut.isPending && unblockMut.variables === item.id
                ? <ActivityIndicator size="small" color={colors.danger} />
                : <Text style={styles.unblockText}>Unblock</Text>
              }
            </TouchableOpacity>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  info:        { flex: 1 },
  name:        { fontSize: font.base, fontWeight: '600', color: colors.text },
  handle:      { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  unblockBtn:  { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger },
  unblockText: { fontSize: font.sm, fontWeight: '700', color: colors.danger },
  sep:         { height: spacing.sm },
});