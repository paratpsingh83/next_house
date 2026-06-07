import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors, radius, font } from '@/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function Button({ label, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const isPrimary  = variant === 'primary';
  const isOutline  = variant === 'outline';
  const isDanger   = variant === 'danger';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        isPrimary  && styles.primary,
        isOutline  && styles.outline,
        isDanger   && styles.danger,
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary || isDanger ? '#fff' : colors.primary} size="small" />
      ) : (
        <Text style={[styles.label, (isPrimary || isDanger) && styles.labelLight, isOutline && styles.labelOutline]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base:         { paddingVertical: 12, paddingHorizontal: 20, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primary:      { backgroundColor: colors.primary },
  outline:      { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  danger:       { backgroundColor: colors.danger },
  ghost:        { backgroundColor: 'transparent' },
  disabled:     { opacity: 0.5 },
  label:        { fontSize: font.md, fontWeight: '600', color: colors.text },
  labelLight:   { color: '#fff' },
  labelOutline: { color: colors.primary },
});
