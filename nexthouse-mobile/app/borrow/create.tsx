import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { borrowApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import { colors, font, spacing, radius } from '@/theme';

const DURATION_OPTS = ['A few hours', 'A day', 'A few days', 'A week', 'Longer'];

export default function CreateBorrowScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const [title,    setTitle]    = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');

  const createMut = useMutation({
    mutationFn: () => borrowApi.create({
      title:            title.trim(),
      description:      description.trim() || undefined,
      requiredDuration: duration || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['borrow-mine'] });
      Alert.alert('Request Posted!', 'Your neighbours will see your borrow request.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to post request'),
  });

  const canSubmit = title.trim().length >= 3;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Borrow Request</Text>
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

          <View style={styles.tipCard}>
            <Ionicons name="hand-left-outline" size={20} color={colors.primary} />
            <Text style={styles.tipText}>Be specific about what you need — it helps neighbours respond quickly.</Text>
          </View>

          <Text style={styles.label}>What do you need? *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Ladder, drill, cake tin…"
            placeholderTextColor={colors.textLight}
            maxLength={100}
          />

          <Text style={styles.label}>Details</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Any additional details about what you need…"
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>How long do you need it?</Text>
          <View style={styles.chips}>
            {DURATION_OPTS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, duration === opt && styles.chipActive]}
                onPress={() => setDuration(duration === opt ? '' : opt)}
              >
                <Text style={[styles.chipText, duration === opt && styles.chipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
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
  tipCard:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.primary + '10', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '30', marginBottom: spacing.sm },
  tipText:         { flex: 1, fontSize: font.sm, color: colors.primary, lineHeight: 18 },
  label:           { fontSize: font.sm, fontWeight: '700', color: colors.textMuted, marginTop: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:           { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: font.base, color: colors.text },
  textarea:        { height: 110 },
  chips:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive:      { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:        { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  chipTextActive:  { color: '#fff', fontWeight: '700' },
});