import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '@/api';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { colors, font, spacing } from '@/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSend = async () => {
    if (!identifier.trim()) return;
    try {
      setLoading(true);
      const isEmail = identifier.includes('@');
      await authApi.forgotPassword(isEmail ? { email: identifier } : { phone: identifier });
      setSent(true);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.center}>
        <Text style={styles.checkmark}>✓</Text>
        <Text style={styles.sentTitle}>Check your inbox</Text>
        <Text style={styles.sentSub}>We sent a password reset link to {identifier}</Text>
        <Button label="Back to Login" onPress={() => router.back()} style={{ marginTop: spacing.xl }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.sub}>Enter your email or phone and we'll send a reset link.</Text>
        <Input
          label="Email or Phone"
          leftIcon="mail-outline"
          placeholder="your@email.com or +1234567890"
          value={identifier}
          onChangeText={setIdentifier}
          keyboardType="email-address"
        />
        <Button label="Send Reset Link" onPress={onSend} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, paddingTop: spacing.xxl },
  title:      { fontSize: font.xl, fontWeight: '700', color: colors.text, marginBottom: 8 },
  sub:        { fontSize: font.base, color: colors.textMuted, marginBottom: spacing.xl },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.bg },
  checkmark:  { fontSize: 64, marginBottom: spacing.lg },
  sentTitle:  { fontSize: font.xl, fontWeight: '700', color: colors.text, marginBottom: 8 },
  sentSub:    { fontSize: font.base, color: colors.textMuted, textAlign: 'center' },
});
