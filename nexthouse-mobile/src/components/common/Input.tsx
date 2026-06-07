import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, font } from '@/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export default function Input({ label, error, leftIcon, isPassword, style, ...rest }: Props) {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.row, !!error && styles.rowError]}>
        {leftIcon && <Ionicons name={leftIcon} size={18} color={colors.textMuted} style={styles.icon} />}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textLight}
          secureTextEntry={isPassword && !show}
          autoCapitalize="none"
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setShow(p => !p)} style={styles.eye}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:  { marginBottom: 14 },
  label:    { fontSize: font.sm, fontWeight: '600', color: colors.text, marginBottom: 5 },
  row:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 12, height: 48 },
  rowError: { borderColor: colors.danger },
  icon:     { marginRight: 8 },
  input:    { flex: 1, fontSize: font.base, color: colors.text },
  eye:      { padding: 4 },
  error:    { fontSize: font.sm, color: colors.danger, marginTop: 4 },
});
