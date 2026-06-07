import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '@/theme';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon = 'file-tray-outline', title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={colors.border} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.sub}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title:     { fontSize: font.lg, fontWeight: '600', color: colors.textMuted, marginTop: 16, textAlign: 'center' },
  sub:       { fontSize: font.base, color: colors.textLight, marginTop: 6, textAlign: 'center' },
});
