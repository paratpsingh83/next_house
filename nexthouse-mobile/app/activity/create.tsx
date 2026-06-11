import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { activitiesApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import { colors, font, spacing, radius } from '@/theme';
import type { ActivityType } from '@/types';

const TYPES: { value: ActivityType; icon: string; label: string }[] = [
  { value: 'SOCIAL',             icon: 'people-outline',         label: 'Social'       },
  { value: 'SPORTS',             icon: 'football-outline',       label: 'Sports'       },
  { value: 'LEARNING',           icon: 'book-outline',           label: 'Learning'     },
  { value: 'VOLUNTEERING',       icon: 'heart-outline',          label: 'Volunteering' },
  { value: 'FOOD',               icon: 'restaurant-outline',     label: 'Food'         },
  { value: 'ARTS',               icon: 'color-palette-outline',  label: 'Arts'         },
  { value: 'OUTDOOR',            icon: 'leaf-outline',           label: 'Outdoor'      },
  { value: 'NEIGHBORHOOD_WATCH', icon: 'eye-outline',            label: 'Watch'        },
  { value: 'OTHER',              icon: 'star-outline',           label: 'Other'        },
];

export default function CreateActivityScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const [title,            setTitle]            = useState('');
  const [description,      setDescription]      = useState('');
  const [activityType,     setActivityType]      = useState<ActivityType>('SOCIAL');
  const [activityTime,     setActivityTime]      = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showPicker,       setShowPicker]        = useState(false);
  const [maxMembers,       setMaxMembers]        = useState('');
  const [approvalRequired, setApprovalRequired]  = useState(false);
  const [privateActivity,  setPrivateActivity]   = useState(false);

  const createMut = useMutation({
    mutationFn: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission required');
      const loc = await Location.getCurrentPositionAsync({});
      return activitiesApi.create({
        title:            title.trim(),
        description:      description.trim() || undefined,
        activityType,
        activityTime:     activityTime.toISOString(),
        maxMembers:       maxMembers ? parseInt(maxMembers, 10) : undefined,
        approvalRequired,
        privateActivity,
        latitude:         loc.coords.latitude,
        longitude:        loc.coords.longitude,
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['activities-nearby'] });
      Alert.alert('Activity Created!', 'Your activity is now live.', [
        { text: 'View', onPress: () => router.replace(`/activity/${data.id}`) },
        { text: 'OK',   onPress: () => router.back() },
      ]);
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to create activity'),
  });

  const canSubmit = title.trim().length >= 3;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Activity</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
          onPress={() => createMut.mutate()}
          disabled={!canSubmit || createMut.isPending}
        >
          {createMut.isPending ? <Spinner /> : <Text style={styles.postBtnText}>Create</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Give your activity a name"
            placeholderTextColor={colors.textLight}
            maxLength={100}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's this activity about?"
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeGrid}>
            {TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeChip, activityType === t.value && styles.typeChipActive]}
                onPress={() => setActivityType(t.value)}
              >
                <Ionicons name={t.icon as any} size={16} color={activityType === t.value ? '#fff' : colors.textMuted} />
                <Text style={[styles.typeLabel, activityType === t.value && styles.typeLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Date & Time</Text>
          <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
            <Text style={{ color: colors.text, fontSize: font.base }}>
              {activityTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={activityTime}
              mode="datetime"
              minimumDate={new Date()}
              onChange={(_, d) => { setShowPicker(false); if (d) setActivityTime(d); }}
            />
          )}

          <Text style={styles.label}>Max Members (optional)</Text>
          <TextInput
            style={styles.input}
            value={maxMembers}
            onChangeText={v => setMaxMembers(v.replace(/\D/g, ''))}
            placeholder="Leave empty for unlimited"
            placeholderTextColor={colors.textLight}
            keyboardType="number-pad"
          />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Approval required</Text>
              <Text style={styles.switchSub}>Review join requests before accepting</Text>
            </View>
            <Switch
              value={approvalRequired}
              onValueChange={setApprovalRequired}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Private activity</Text>
              <Text style={styles.switchSub}>Only visible to invited members</Text>
            </View>
            <Switch
              value={privateActivity}
              onValueChange={setPrivateActivity}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
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
  textarea:        { height: 90 },
  typeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  typeChipActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  typeLabel:       { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  typeLabelActive: { color: '#fff', fontWeight: '700' },
  switchRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: 12 },
  switchLabel:     { fontSize: font.base, fontWeight: '600', color: colors.text },
  switchSub:       { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
});