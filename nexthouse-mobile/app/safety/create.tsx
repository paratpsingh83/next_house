import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { safetyApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import { colors, font, spacing, radius } from '@/theme';

const SEVERITIES: { value: string; label: string; color: string }[] = [
  { value: 'LOW',      label: 'Low',      color: '#22C55E' },
  { value: 'MEDIUM',   label: 'Medium',   color: '#F59E0B' },
  { value: 'HIGH',     label: 'High',     color: '#EF4444' },
  { value: 'CRITICAL', label: 'Critical', color: '#7C3AED' },
];

const ALERT_TYPES = ['THEFT', 'FIRE', 'FLOOD', 'ACCIDENT', 'SUSPICIOUS_ACTIVITY', 'MEDICAL', 'OTHER'];

export default function CreateSafetyAlertScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const [title,     setTitle]     = useState('');
  const [description, setDescription] = useState('');
  const [severity,  setSeverity]  = useState('MEDIUM');
  const [alertType, setAlertType] = useState('');
  const [emergency, setEmergency] = useState(false);

  const createMut = useMutation({
    mutationFn: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat: number | undefined;
      let lon: number | undefined;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }
      return safetyApi.create({
        title:       title.trim(),
        description: description.trim() || undefined,
        severity,
        alertType:   alertType || undefined,
        emergency,
        latitude:    lat,
        longitude:   lon,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['safety-nearby'] });
      Alert.alert('Alert Posted', 'Your safety alert has been reported to the neighbourhood.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to post alert'),
  });

  const canSubmit = title.trim().length >= 3;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Safety Alert</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canSubmit && styles.postBtnDisabled, { backgroundColor: canSubmit ? colors.danger : colors.border }]}
          onPress={() => createMut.mutate()}
          disabled={!canSubmit || createMut.isPending}
        >
          {createMut.isPending ? <Spinner /> : <Text style={styles.postBtnText}>Report</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

          {/* Emergency toggle — prominent at top */}
          <View style={[styles.emergencyRow, emergency && styles.emergencyRowActive]}>
            <Ionicons name="alert-circle" size={22} color={emergency ? '#fff' : colors.danger} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={[styles.emergencyLabel, emergency && { color: '#fff' }]}>Emergency</Text>
              <Text style={[styles.emergencySub, emergency && { color: 'rgba(255,255,255,0.8)' }]}>
                Marks this as an immediate emergency
              </Text>
            </View>
            <Switch
              value={emergency}
              onValueChange={setEmergency}
              trackColor={{ false: colors.border, true: 'rgba(255,255,255,0.4)' }}
              thumbColor={emergency ? '#fff' : colors.danger}
            />
          </View>

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Brief description of the incident"
            placeholderTextColor={colors.textLight}
            maxLength={120}
          />

          <Text style={styles.label}>Details</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What happened? Include any important details…"
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Severity</Text>
          <View style={styles.severityRow}>
            {SEVERITIES.map(s => (
              <TouchableOpacity
                key={s.value}
                style={[styles.severityChip, { borderColor: s.color }, severity === s.value && { backgroundColor: s.color }]}
                onPress={() => setSeverity(s.value)}
              >
                <Text style={[styles.severityText, { color: s.color }, severity === s.value && { color: '#fff' }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Alert Type</Text>
          <View style={styles.chips}>
            {ALERT_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, alertType === t && styles.chipActive]}
                onPress={() => setAlertType(alertType === t ? '' : t)}
              >
                <Text style={[styles.chipText, alertType === t && styles.chipTextActive]}>
                  {t.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.locationNote}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.locationNoteText}>Your current location will be attached to help neighbours locate the incident.</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: colors.bg },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:           { padding: 4 },
  headerTitle:       { fontSize: font.md, fontWeight: '700', color: colors.text },
  postBtn:           { paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.full },
  postBtnDisabled:   {},
  postBtnText:       { color: '#fff', fontWeight: '700', fontSize: font.base },
  form:              { padding: spacing.lg, gap: 6 },
  emergencyRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.danger + '12', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1.5, borderColor: colors.danger, marginBottom: spacing.sm },
  emergencyRowActive:{ backgroundColor: colors.danger, borderColor: colors.danger },
  emergencyLabel:    { fontSize: font.base, fontWeight: '700', color: colors.danger },
  emergencySub:      { fontSize: font.sm, color: colors.danger + 'aa', marginTop: 2 },
  label:             { fontSize: font.sm, fontWeight: '700', color: colors.textMuted, marginTop: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:             { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: font.base, color: colors.text },
  textarea:          { height: 100 },
  severityRow:       { flexDirection: 'row', gap: 8 },
  severityChip:      { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.full, borderWidth: 2, backgroundColor: colors.surface },
  severityText:      { fontSize: font.sm, fontWeight: '700' },
  chips:             { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:              { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive:        { backgroundColor: colors.danger, borderColor: colors.danger },
  chipText:          { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  chipTextActive:    { color: '#fff', fontWeight: '700' },
  locationNote:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  locationNoteText:  { flex: 1, fontSize: font.sm - 1, color: colors.textMuted, lineHeight: 16 },
});