import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import { marketplaceApi, chatApi } from '@/api';
import { useAppSelector } from '@/store/hooks';
import Avatar from '@/components/common/Avatar';
import Spinner from '@/components/common/Spinner';
import { colors, font, spacing, radius } from '@/theme';

export default function MarketplaceItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useAppSelector(s => s.auth.user);

  const { data: item, isLoading } = useQuery({
    queryKey: ['marketplace-item', id],
    queryFn: () => marketplaceApi.get(Number(id)),
    enabled: !!id,
  });

  const markSoldMut = useMutation({
    mutationFn: () => marketplaceApi.markSold(Number(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketplace-item', id] }),
  });

  const chatMut = useMutation({
    mutationFn: () => chatApi.directRoom(item!.seller.id),
    onSuccess: (room) => router.push(`/chat/${room.id}`),
  });

  if (isLoading || !item) return <Spinner full />;

  const isOwn = me?.id === item.seller.id;
  const isSold = item.status === 'SOLD';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{item.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {item.thumbnailUrl
          ? <Image source={{ uri: item.thumbnailUrl }} style={styles.image} resizeMode="cover" />
          : (
            <View style={[styles.image, styles.noImage]}>
              <Ionicons name="image-outline" size={56} color={colors.border} />
            </View>
          )
        }

        <View style={styles.body}>
          <View style={styles.statusRow}>
            {isSold && <View style={styles.soldBadge}><Text style={styles.soldText}>SOLD</Text></View>}
            {item.category && <View style={styles.badge}><Text style={styles.badgeText}>{item.category}</Text></View>}
            {item.conditionType && <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}><Text style={[styles.badgeText, { color: colors.primary }]}>{item.conditionType}</Text></View>}
          </View>

          <Text style={styles.title}>{item.title}</Text>

          <Text style={styles.price}>
            {item.price != null
              ? `$${item.price.toFixed(2)}${item.negotiable ? '  ·  Negotiable' : ''}`
              : 'Free'
            }
          </Text>

          {item.description && (
            <Text style={styles.desc}>{item.description}</Text>
          )}

          {item.address && (
            <View style={styles.row}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={styles.metaText}>{item.address}</Text>
            </View>
          )}

          <Text style={styles.posted}>
            Posted {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>Seller</Text>
          <TouchableOpacity onPress={() => router.push(`/user/${item.seller.id}`)} style={styles.sellerRow}>
            <Avatar uri={item.seller.profileImage} name={item.seller.name} size={46} />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{item.seller.name}</Text>
              <Text style={styles.sellerHandle}>@{item.seller.username}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isOwn ? (
          !isSold && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.secondary }]}
              onPress={() =>
                Alert.alert('Mark as Sold', 'Mark this item as sold?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Mark Sold', onPress: () => markSoldMut.mutate() },
                ])
              }
              disabled={markSoldMut.isPending}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Mark as Sold</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity
            style={[styles.btn, isSold && styles.btnDisabled]}
            onPress={() => chatMut.mutate()}
            disabled={chatMut.isPending || isSold}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Message Seller</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:     { padding: 4 },
  headerTitle: { flex: 1, fontSize: font.md, fontWeight: '700', color: colors.text, textAlign: 'center', marginHorizontal: 8 },
  image:       { width: '100%', height: 280, backgroundColor: colors.bg },
  noImage:     { alignItems: 'center', justifyContent: 'center' },
  body:        { padding: spacing.lg },
  statusRow:   { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  soldBadge:   { backgroundColor: colors.danger, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  soldText:    { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  badge:       { backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  badgeText:   { fontSize: font.sm, fontWeight: '600', color: colors.textMuted },
  title:       { fontSize: font.xl, fontWeight: '800', color: colors.text, marginBottom: 8 },
  price:       { fontSize: font.xl, fontWeight: '800', color: colors.primary, marginBottom: 14 },
  desc:        { fontSize: font.base, color: colors.textMuted, lineHeight: 22, marginBottom: 12 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metaText:    { fontSize: font.sm, color: colors.textMuted, flex: 1 },
  posted:      { fontSize: font.sm, color: colors.textLight, marginTop: 4, marginBottom: 20 },
  divider:     { height: 1, backgroundColor: colors.border, marginBottom: 16 },
  sectionLabel:{ fontSize: font.sm, fontWeight: '700', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  sellerRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  sellerInfo:  { flex: 1, marginLeft: 12 },
  sellerName:  { fontSize: font.base, fontWeight: '600', color: colors.text },
  sellerHandle:{ fontSize: font.sm, color: colors.textMuted },
  footer:      { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  btn:         { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText:     { color: '#fff', fontSize: font.md, fontWeight: '700' },
});