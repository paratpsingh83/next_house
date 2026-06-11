import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '@/api';
import { colors, font, spacing, radius } from '@/theme';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showC,    setShowC]    = useState(false);
  const [showN,    setShowN]    = useState(false);
  const [showCf,   setShowCf]   = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => {
      Alert.alert('Done', 'Password changed successfully.', [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err: any) => {
      Alert.alert('Failed', err?.response?.data?.message ?? 'Could not change password. Check your current password.');
    },
  });

  const handleSubmit = () => {
    if (!current)          { Alert.alert('Missing', 'Enter your current password'); return; }
    if (next.length < 8)   { Alert.alert('Too short', 'New password must be at least 8 characters'); return; }
    if (next !== confirm)  { Alert.alert('Mismatch', 'New passwords do not match'); return; }
    mutate();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PasswordField
          label="Current Password"
          value={current}
          onChange={setCurrent}
          show={showC}
          onToggle={() => setShowC(v => !v)}
        />
        <PasswordField
          label="New Password"
          value={next}
          onChange={setNext}
          show={showN}
          onToggle={() => setShowN(v => !v)}
          hint="Minimum 8 characters"
        />
        <PasswordField
          label="Confirm New Password"
          value={confirm}
          onChange={setConfirm}
          show={showCf}
          onToggle={() => setShowCf(v => !v)}
        />

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isPending}
          style={[styles.submitBtn, isPending && styles.submitDisabled]}
        >
          {isPending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.submitText}>Change Password</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  show: boolean; onToggle: () => void; hint?: string;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={onToggle} style={styles.eyeBtn}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:        { padding: 4 },
  headerTitle:    { fontSize: font.lg, fontWeight: '700', color: colors.text },
  content:        { padding: spacing.lg, gap: spacing.md },
  fieldGroup:     { gap: 6 },
  fieldLabel:     { fontSize: font.sm, fontWeight: '600', color: colors.textMuted },
  inputRow:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  input:          { flex: 1, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: font.base, color: colors.text },
  eyeBtn:         { paddingHorizontal: spacing.md },
  hint:           { fontSize: font.sm - 1, color: colors.textMuted },
  submitBtn:      { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.lg, alignItems: 'center', marginTop: spacing.sm },
  submitDisabled: { opacity: 0.5 },
  submitText:     { color: '#fff', fontSize: font.base, fontWeight: '700' },
});