import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { searchApi } from '@/api';
import Avatar from '@/components/common/Avatar';
import PostCard from '@/components/post/PostCard';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['search', debounced],
    queryFn:  () => searchApi.global(debounced, 0, 8),
    enabled:  debounced.length >= 2,
  });

  const { data: trending } = useQuery({
    queryKey: ['trending'],
    queryFn:  searchApi.trending,
    enabled:  debounced.length < 2,
  });

  const users  = data?.users?.content ?? [];
  const posts  = data?.posts?.content ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people, posts, communities..."
            placeholderTextColor={colors.textLight}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Trending hashtags */}
      {debounced.length < 2 && (
        <ScrollView>
          <Text style={styles.sectionTitle}>Trending</Text>
          <View style={styles.tagsWrap}>
            {(trending ?? []).map(tag => (
              <TouchableOpacity key={tag} onPress={() => router.push({ pathname: '/hashtag/[tag]' as any, params: { tag } })} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.quickLinks}>
            {[
              { label: 'Marketplace', icon: 'storefront-outline', route: '/marketplace' },
              { label: 'Activities',  icon: 'calendar-outline',   route: '/activities' },
              { label: 'Communities', icon: 'people-outline',     route: '/communities' },
              { label: 'Safety',      icon: 'warning-outline',    route: '/safety' },
              { label: 'Neighbours',  icon: 'location-outline',   route: '/neighbours' },
              { label: 'Borrow',      icon: 'hand-left-outline',  route: '/borrow' },
            ].map(({ label, icon, route }) => (
              <TouchableOpacity key={label} onPress={() => router.push(route as any)} style={styles.quickCard}>
                <Ionicons name={icon as any} size={26} color={colors.primary} />
                <Text style={styles.quickLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Search results */}
      {debounced.length >= 2 && (
        <ScrollView>
          {isLoading && <Spinner full />}

          {users.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>People</Text>
              {users.map(u => (
                <TouchableOpacity key={u.id} onPress={() => router.push({ pathname: '/user/[id]', params: { id: u.id } })} style={styles.userRow}>
                  <Avatar uri={u.profileImage} name={u.name} size={44} online={u.online} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.userName}>{u.name}</Text>
                    <Text style={styles.userHandle}>@{u.username}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {posts.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Posts</Text>
              {posts.map(p => <PostCard key={p.id} post={p} />)}
            </>
          )}

          {!isLoading && users.length === 0 && posts.length === 0 && (
            <EmptyState icon="search-outline" title="No results" subtitle={`Nothing found for "${debounced}"`} />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  searchRow:    { backgroundColor: colors.surface, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchBox:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  searchInput:  { flex: 1, fontSize: font.base, color: colors.text },
  sectionTitle: { fontSize: font.md, fontWeight: '700', color: colors.text, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  tagsWrap:     { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, gap: 8, marginBottom: spacing.md },
  tag:          { backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  tagText:      { color: colors.primary, fontWeight: '600', fontSize: font.sm },
  quickLinks:   { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: 12 },
  quickCard:    { width: '30%', backgroundColor: colors.surface, borderRadius: radius.lg, alignItems: 'center', paddingVertical: 16, borderWidth: 1, borderColor: colors.border },
  quickLabel:   { fontSize: font.sm, color: colors.text, marginTop: 6, fontWeight: '600' },
  userRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  userName:     { fontSize: font.base, fontWeight: '600', color: colors.text },
  userHandle:   { fontSize: font.sm, color: colors.textMuted },
});
