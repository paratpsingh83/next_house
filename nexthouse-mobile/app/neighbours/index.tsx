import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { usersApi } from '@/api';
import Avatar from '@/components/common/Avatar';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';
import { colors, font, spacing, radius } from '@/theme';
import type { NearbyUserResponse } from '@/types';

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

export default function NeighboursScreen() {
  const router = useRouter();
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locError, setLocError] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocError(true); return; }
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    })();
  }, []);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['nearby-users', coords],
      queryFn:  ({ pageParam = 0 }) => usersApi.getNearby(coords!.lat, coords!.lon, 5000, pageParam, 20),
      getNextPageParam: (last) => last.hasNext ? last.page + 1 : undefined,
      initialPageParam: 0,
      enabled: !!coords,
    });

  const users: NearbyUserResponse[] = data?.pages.flatMap(p => p.content) ?? [];

  const renderItem = ({ item }: { item: NearbyUserResponse }) => (
    <TouchableOpacity onPress={() => router.push(`/user/${item.user.id}`)} style={styles.row} activeOpacity={0.75}>
      <Avatar uri={item.user.profileImage} name={item.user.name} size={50} online={item.user.online} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.user.name}</Text>
        <Text style={styles.handle}>@{item.user.username}</Text>
        <View style={styles.badges}>
          {item.user.identityVerified && <View style={styles.verBadge}><Ionicons name="shield-checkmark" size={11} color={colors.secondary} /></View>}
        </View>
      </View>
      <View style={styles.distWrap}>
        <Ionicons name="location-outline" size={14} color={colors.primary} />
        <Text style={styles.dist}>{formatDistance(item.distanceMeters)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (locError) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState icon="location-outline" title="Location required" subtitle="Enable location access to see nearby neighbours" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Neighbours</Text>
        <View style={{ width: 24 }} />
      </View>

      {!coords || isLoading ? <Spinner full /> : (
        <FlatList
          data={users}
          keyExtractor={u => String(u.user.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No neighbours found" subtitle="Try increasing the search radius" />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingNextPage ? <Spinner /> : null}
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
  row:         { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.surface },
  info:        { flex: 1, marginLeft: 12 },
  name:        { fontSize: font.base, fontWeight: '600', color: colors.text },
  handle:      { fontSize: font.sm, color: colors.textMuted, marginTop: 1 },
  badges:      { flexDirection: 'row', gap: 4, marginTop: 4 },
  verBadge:    { width: 18, height: 18, borderRadius: 9, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  distWrap:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  dist:        { fontSize: font.sm, color: colors.primary, fontWeight: '700' },
  sep:         { height: 1, backgroundColor: colors.border, marginLeft: 74 },
});
