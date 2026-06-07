import React from 'react';
import { SafeAreaView, FlatList, View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { usersApi } from '@/api';
import Avatar from '@/components/common/Avatar';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';
import type { FollowRequestItem } from '@/types';

export default function FollowRequestsScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['follow-requests'],
    queryFn:  usersApi.getFollowRequests,
  });

  const acceptMut = useMutation({
    mutationFn: (requestId: number) => usersApi.acceptFollowRequest(requestId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['follow-requests'] }),
  });

  const rejectMut = useMutation({
    mutationFn: (requestId: number) => usersApi.rejectFollowRequest(requestId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['follow-requests'] }),
  });

  const requests = data ?? [];

  const renderItem = ({ item }: { item: FollowRequestItem }) => (
    <View style={styles.row}>
      <TouchableOpacity onPress={() => router.push(`/user/${item.requester.id}`)} style={styles.userInfo}>
        <Avatar uri={item.requester.profileImage} name={item.requester.name} size={46} />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.name}>{item.requester.name}</Text>
          <Text style={styles.handle}>@{item.requester.username}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => acceptMut.mutate(item.requestId)} style={styles.acceptBtn} disabled={acceptMut.isPending}>
          <Ionicons name="checkmark" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => rejectMut.mutate(item.requestId)} style={styles.rejectBtn} disabled={rejectMut.isPending}>
          <Ionicons name="close" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Follow Requests</Text>
        <View style={{ width: 24 }} />
      </View>
      {isLoading ? <Spinner full /> : (
        <FlatList
          data={requests}
          keyExtractor={r => String(r.requestId)}
          renderItem={renderItem}
          ListEmptyComponent={<EmptyState icon="people-circle-outline" title="No pending requests" />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, backgroundColor: colors.surface },
  userInfo:    { flexDirection: 'row', alignItems: 'center', flex: 1 },
  name:        { fontSize: font.base, fontWeight: '600', color: colors.text },
  handle:      { fontSize: font.sm, color: colors.textMuted, marginTop: 1 },
  actions:     { flexDirection: 'row', gap: 8 },
  acceptBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  rejectBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.danger + '15', alignItems: 'center', justifyContent: 'center' },
  sep:         { height: 1, backgroundColor: colors.border, marginLeft: 74 },
});
