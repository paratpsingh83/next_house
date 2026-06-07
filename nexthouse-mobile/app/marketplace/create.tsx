import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { marketplaceApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import { colors, font, spacing, radius } from '@/theme';

const CATEGORIES = ['Electronics', 'Furniture', 'Clothing', 'Books', 'Tools', 'Sports', 'Kids', 'Other'];
const CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'];

export default function CreateMarketplaceScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [negotiable, setNegotiable] = useState(false);

  const createMut = useMutation({
    mutationFn: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission required');
      const loc = await Location.getCurrentPositionAsync({});
      return marketplaceApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        price: price ? parseFloat(price) : undefined,
        conditionType: condition || undefined,
        negotiable,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketplace'] });
      Alert.alert('Listed!', 'Your item has been listed.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to create listing'),
  });

  const canSubmit = title.trim().length > 0 && category.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>List an Item</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
          onPress={() => createMut.mutate()}
          disabled={!canSubmit || createMut.isPending}
        >
          {createMut.isPending ? <Spinner /> : <Text style={styles.postBtnText}>Post</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What are you selling?"
            placeholderTextColor={colors.textLight}
            maxLength={100}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your item..."
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Category *</Text>
          <View style={styles.chips}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Condition</Text>
          <View style={styles.chips}>
            {CONDITIONS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, condition === c && styles.chipActive]}
                onPress={() => setCondition(c === condition ? '' : c)}
              >
                <Text style={[styles.chipText, condition === c && styles.chipTextActive]}>
                  {c.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Price</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceInput}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                style={styles.priceField}
                value={price}
                onChangeText={v => setPrice(v.replace(/[^0-9.]/g, ''))}
                placeholder="0.00  (leave empty for free)"
                placeholderTextColor={colors.textLight}
                keyboardType="decimal-pad"
              />
            </View>
            <TouchableOpacity
              style={[styles.toggle, negotiable && styles.toggleActive]}
              onPress={() => setNegotiable(n => !n)}
            >
              <Text style={[styles.toggleText, negotiable && styles.toggleTextActive]}>Negotiable</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:         { padding: 4 },
  headerTitle:     { fontSize: font.lg, fontWeight: '700', color: colors.text },
  postBtn:         { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.full },
  postBtnDisabled: { backgroundColor: colors.border },
  postBtnText:     { color: '#fff', fontWeight: '700', fontSize: font.base },
  form:            { padding: spacing.lg, gap: 6 },
  label:           { fontSize: font.sm, fontWeight: '700', color: colors.textMuted, marginTop: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:           { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: font.base, color: colors.text },
  textarea:        { height: 100 },
  chips:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:            { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive:      { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:        { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  chipTextActive:  { color: '#fff', fontWeight: '700' },
  priceRow:        { flexDirection: 'row', gap: 10, alignItems: 'center' },
  priceInput:      { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14 },
  currency:        { fontSize: font.lg, color: colors.textMuted, marginRight: 4 },
  priceField:      { flex: 1, fontSize: font.base, color: colors.text, paddingVertical: 12 },
  toggle:          { paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  toggleActive:    { backgroundColor: colors.primary + '15', borderColor: colors.primary },
  toggleText:      { fontSize: font.sm, color: colors.textMuted, fontWeight: '600' },
  toggleTextActive:{ color: colors.primary },
});