import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';

interface Props {
  uri?: string | null;
  name?: string;
  size?: number;
  online?: boolean;
}

export default function Avatar({ uri, name, size = 40, online }: Props) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]} />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
        </View>
      )}
      {online && (
        <View style={[styles.dot, { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14, bottom: 0, right: 0 }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  img:      { backgroundColor: colors.border },
  fallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '600' },
  dot:      { position: 'absolute', backgroundColor: colors.online, borderWidth: 2, borderColor: '#fff' },
});
