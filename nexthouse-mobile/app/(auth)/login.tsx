import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '@/api';
import { tokens } from '@/lib/apiClient';
import { setCredentials } from '@/store/slices/authSlice';
import { useAppDispatch } from '@/store/hooks';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { colors, font, spacing } from '@/theme';

const schema = z.object({
  identifier: z.string().min(3, 'Required'),
  password:   z.string().min(6, 'Min 6 characters'),
});
type Form = z.infer<typeof schema>;

export default function LoginScreen() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    try {
      setLoading(true);
      const res = await authApi.login({ ...data, deviceType: 'MOBILE' });
      if (res.accessToken && res.refreshToken && res.user) {
        await tokens.set(res.accessToken, res.refreshToken);
        dispatch(setCredentials({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken }));
      }
    } catch (e: any) {
      Alert.alert('Login failed', e?.response?.data?.message ?? 'Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>NH</Text>
          </View>
          <Text style={styles.appName}>NextHouse</Text>
          <Text style={styles.tagline}>Your neighbourhood, connected</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>

          <Controller
            control={control} name="identifier"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Phone / Email / Username"
                leftIcon="person-outline"
                placeholder="Enter your identifier"
                value={value} onChangeText={onChange}
                error={errors.identifier?.message}
              />
            )}
          />
          <Controller
            control={control} name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Password"
                leftIcon="lock-closed-outline"
                placeholder="Enter your password"
                isPassword value={value} onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button label="Sign In" onPress={handleSubmit(onSubmit)} loading={loading} style={{ marginTop: 4 }} />
        </View>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={[styles.registerText, styles.link]}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'center' },
  logoArea:    { alignItems: 'center', marginBottom: spacing.xl },
  logoCircle:  { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoText:    { color: '#fff', fontSize: 26, fontWeight: '800' },
  appName:     { fontSize: font.xxl, fontWeight: '800', color: colors.text },
  tagline:     { fontSize: font.base, color: colors.textMuted, marginTop: 4 },
  card:        { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.xl, marginBottom: spacing.lg },
  title:       { fontSize: font.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  forgotRow:   { alignItems: 'flex-end', marginTop: -6, marginBottom: spacing.md },
  forgotText:  { fontSize: font.sm, color: colors.primary, fontWeight: '600' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm },
  registerText:{ fontSize: font.base, color: colors.textMuted },
  link:        { color: colors.primary, fontWeight: '700' },
});
