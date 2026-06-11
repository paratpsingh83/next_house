import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { communitiesApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import { colors, font, spacing, radius } from '@/theme';
import { useAppSelector } from '@/store/hooks';

const COMMUNITY_TYPES = [
  'NEIGHBORHOOD', 'SOCIAL', 'SPORTS', 'EDUCATION',
  'ARTS', 'FOOD', 'HEALTH', 'TECHNOLOGY', 'OTHER',
];

export default function CreateCommunityScreen() {
  const router = useRouter();
  const qc     = useQueryClient();
  const me     = useAppSelector(s => s.auth.user);

  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [communityType, setType]      = useState('');
  const [isPrivate, setPrivate]       = useState(false);

  // Eligibility
  const isUnverified = me?.verificationStatus === 'UNVERIFIED';
  const isInactive   = me?.accountStatus !== 'ACTIVE';
  const isBlocked    = isUnverified || isInactive;

  const createMut = useMutation({
    mutationFn: () => communitiesApi.create({
      name:             name.trim(),
      description:      description.trim() || undefined,
      communityType,
      privateCommunity: isPrivate,
    }),
    onSuccess: (community) => {
      qc.invalidateQueries({ queryKey: ['communities'] });
      Alert.alert('Created!', `"${community.name}" is ready.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e: any) =>
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to create community'),
  });

  const canSubmit = !isBlocked && name.trim().length >= 3 && communityType.length > 0;

  const handleSubmit = () => {
    if (isUnverified) {
      Alert.alert('Account Not Verified', 'Verify your phone or email before creating a community.');
      return;
    }
    if (isInactive) {
      Alert.alert('Account Not Active', `Account status "${me?.accountStatus}" — creation unavailable.`);
      return;
    }
    if (name.trim().length < 3) {
      Alert.alert('Name Too Short', 'Community name must be at least 3 characters.');
      return;
    }
    if (!communityType) {
      Alert.alert('Select Type', 'Please select a community type.');
      return;
    }
    createMut.mutate();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Community</Text>
        <TouchableOpacity
          style={[styles.createBtn, !canSubmit && styles.createBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || createMut.isPending}
        >
          {createMut.isPending
            ? <Spinner />
            : <Text style={styles.createBtnText}>Create</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Eligibility banner */}
      {isBlocked && (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color="#b45309" />
          <Text style={styles.noticeText}>
            {isUnverified
              ? 'Verify your account (phone or email) to create communities.'
              : `Account status "${me?.accountStatus}" — creation unavailable.`}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

          {/* Name */}
          <Text style={styles.label}>Community Name *</Text>
          <TextInput
            style={[styles.input, isBlocked && styles.inputDisabled]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Taman Desa Residents"
            placeholderTextColor={colors.textLight}
            maxLength={150}
            editable={!isBlocked}
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea, isBlocked && styles.inputDisabled]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this community about?"
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={3000}
            editable={!isBlocked}
          />

          {/* Type chips */}
          <Text style={styles.label}>Community Type *</Text>
          <View style={styles.chips}>
            {COMMUNITY_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.chip, communityType === type && styles.chipActive]}
                onPress={() => !isBlocked && setType(type)}
                disabled={isBlocked}
              >
                <Text style={[styles.chipText, communityType === type && styles.chipTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Privacy toggle */}
          <Text style={styles.label}>Privacy</Text>
          <View style={styles.privacyRow}>
            <TouchableOpacity
              style={[styles.privacyOption, !isPrivate && styles.privacyOptionActive]}
              onPress={() => !isBlocked && setPrivate(false)}
              disabled={isBlocked}
            >
              <Ionicons
                name="globe-outline"
                size={20}
                color={!isPrivate ? colors.primary : colors.textMuted}
              />
              <View style={styles.privacyText}>
                <Text style={[styles.privacyTitle, !isPrivate && styles.privacyTitleActive]}>Public</Text>
                <Text style={styles.privacyDesc}>Anyone can join</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.privacyOption, isPrivate && styles.privacyOptionActive]}
              onPress={() => !isBlocked && setPrivate(true)}
              disabled={isBlocked}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={isPrivate ? colors.primary : colors.textMuted}
              />
              <View style={styles.privacyText}>
                <Text style={[styles.privacyTitle, isPrivate && styles.privacyTitleActive]}>Private</Text>
                <Text style={styles.privacyDesc}>Approval required</Text>
              </View>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:                { flex: 1, backgroundColor: colors.bg },
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:             { padding: 4 },
  headerTitle:         { fontSize: font.lg, fontWeight: '700', color: colors.text },
  createBtn:           { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.full },
  createBtnDisabled:   { backgroundColor: colors.border },
  createBtnText:       { color: '#fff', fontWeight: '700', fontSize: font.base },
  notice:              { flexDirection: 'row', alignItems: 'center', gap: 8, margin: spacing.md, backgroundColor: '#fef3c7', borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  noticeText:          { flex: 1, fontSize: font.sm, color: '#92400e' },
  form:                { padding: spacing.lg, gap: 4 },
  label:               { fontSize: font.sm, fontWeight: '700', color: colors.textMuted, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:               { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: font.base, color: colors.text },
  inputDisabled:       { opacity: 0.5 },
  textarea:            { height: 100 },
  chips:               { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:                { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive:          { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:            { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  chipTextActive:      { color: '#fff', fontWeight: '700' },
  privacyRow:          { flexDirection: 'row', gap: spacing.sm },
  privacyOption:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  privacyOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  privacyText:         { flex: 1 },
  privacyTitle:        { fontSize: font.base, fontWeight: '700', color: colors.text },
  privacyTitleActive:  { color: colors.primary },
  privacyDesc:         { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
});