import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usersApi, chatApi } from '@/api';
import Avatar from '@/components/common/Avatar';
import EmptyState from '@/components/common/EmptyState';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { colors, font, spacing, radius } from '@/theme';
import type { UserSummaryDTO } from '@/types';

export default function NewChatScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 350);

  const { data, isLoading } = useQuery({
    queryKey: ['user-search', debounced],
    queryFn: () => usersApi.search(debounced, 0, 20),
    enabled: debounced.length >= 2,
  });

  const chatMut = useMutation({
    mutationFn: (userId: number) => chatApi.directRoom(userId),
    onSuccess: (room) => router.replace(`/chat/${room.id}`),
  });

  const users: UserSummaryDTO[] = data?.content ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or username..."
          placeholderTextColor={colors.textLight}
          autoFocus
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {debounced.length < 2 ? (
        <EmptyState icon="chatbubbles-outline" title="Find someone" subtitle="Type at least 2 characters to search" />
      ) : isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => String(u.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => chatMut.mutate(item.id)}
              disabled={chatMut.isPending}
              activeOpacity={0.7}
            >
              <Avatar uri={item.profileImage} name={item.name} size={46} online={item.online} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userHandle}>@{item.username}</Text>
              </View>
              {chatMut.isPending
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              }
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <EmptyState icon="person-outline" title="No users found" subtitle={`No results for "${debounced}"`} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, margin: spacing.md, backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: font.base, color: colors.text },
  userRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 12, backgroundColor: colors.surface },
  userInfo:    { flex: 1, marginLeft: 12 },
  userName:    { fontSize: font.base, fontWeight: '600', color: colors.text },
  userHandle:  { fontSize: font.sm, color: colors.textMuted },
  sep:         { height: 1, backgroundColor: colors.border, marginLeft: 74 },
});