import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Location from 'expo-location';
import { authApi } from '@/api';
import { tokens } from '@/lib/apiClient';
import { setCredentials } from '@/store/slices/authSlice';
import { useAppDispatch } from '@/store/hooks';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { colors, font, spacing } from '@/theme';

const schema = z.object({
  name:        z.string().min(2, 'Min 2 chars'),
  username:    z.string().min(3, 'Min 3 chars').regex(/^[a-z0-9_]+$/, 'Lowercase, numbers, _ only'),
  phoneNumber: z.string().min(7, 'Valid phone required'),
  email:       z.string().email('Valid email').optional().or(z.literal('')),
  password:    z.string().min(8, 'Min 8 characters'),
  confirm:     z.string(),
}).refine(d => d.password === d.confirm, { message: "Passwords don't match", path: ['confirm'] });

type Form = z.infer<typeof schema>;

export default function RegisterScreen() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', username: '', phoneNumber: '', email: '', password: '', confirm: '' },
  });

  const onSubmit = async (data: Form) => {
    try {
      setLoading(true);
      let latitude: number | undefined;
      let longitude: number | undefined;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        latitude  = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
      const { confirm, ...rest } = data;
      const res = await authApi.register({ ...rest, latitude, longitude, deviceType: 'MOBILE' });
      if (res.accessToken && res.refreshToken && res.user) {
        await tokens.set(res.accessToken, res.refreshToken);
        dispatch(setCredentials({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken }));
      }
    } catch (e: any) {
      Alert.alert('Registration failed', e?.response?.data?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const field = (name: keyof Form, label: string, icon: any, placeholder: string, extra?: object) => (
    <Controller
      control={control} name={name}
      render={({ field: { onChange, value } }) => (
        <Input label={label} leftIcon={icon} placeholder={placeholder} value={value as string} onChangeText={onChange} error={errors[name]?.message} {...extra} />
      )}
    />
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.sub}>Join your neighbourhood community</Text>

        {field('name',        'Full name',    'person-outline',        'Your full name')}
        {field('username',    'Username',     'at-outline',            'e.g. john_doe')}
        {field('phoneNumber', 'Phone number', 'call-outline',          '+1 234 567 8900', { keyboardType: 'phone-pad' })}
        {field('email',       'Email (optional)', 'mail-outline',      'your@email.com', { keyboardType: 'email-address' })}
        {field('password',    'Password',     'lock-closed-outline',   'Min 8 characters', { isPassword: true })}
        {field('confirm',     'Confirm password', 'lock-closed-outline','Repeat password',  { isPassword: true })}

        <Button label="Create Account" onPress={handleSubmit(onSubmit)} loading={loading} style={{ marginTop: 8 }} />

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Text style={[styles.loginText, styles.link]} onPress={() => router.back()}>Sign In</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.xl, paddingTop: spacing.xl * 1.5 },
  title:     { fontSize: font.xxl, fontWeight: '800', color: colors.text, marginBottom: 6 },
  sub:       { fontSize: font.base, color: colors.textMuted, marginBottom: spacing.xl },
  loginRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  loginText: { fontSize: font.base, color: colors.textMuted },
  link:      { color: colors.primary, fontWeight: '700' },
});
