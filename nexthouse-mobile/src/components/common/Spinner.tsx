import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '@/theme';

export default function Spinner({ full }: { full?: boolean }) {
  if (full) {
    return (
      <View style={styles.full}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return <ActivityIndicator size="small" color={colors.primary} />;
}

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
