import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Avatar from '@/components/common/Avatar';
import { colors, font } from '@/theme';
import type { StoryResponse } from '@/types';

interface StoryGroup {
  user: { id: number; name: string; username: string; profileImage?: string };
  stories: StoryResponse[];
  allViewed: boolean;
}

interface Props {
  groups: StoryGroup[];
  onPress: (group: StoryGroup) => void;
  onAddStory?: () => void;
}

export default function StoryRing({ groups, onPress, onAddStory }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.container}>
      {onAddStory && (
        <TouchableOpacity onPress={onAddStory} style={styles.item}>
          <View style={styles.addRing}>
            <Avatar size={56} name="+" />
            <View style={styles.plusBadge}><Text style={styles.plus}>+</Text></View>
          </View>
          <Text style={styles.label} numberOfLines={1}>Your Story</Text>
        </TouchableOpacity>
      )}
      {groups.map(g => (
        <TouchableOpacity key={g.user.id} onPress={() => onPress(g)} style={styles.item}>
          <View style={[styles.ring, g.allViewed ? styles.ringViewed : styles.ringUnviewed]}>
            <Avatar uri={g.user.profileImage} name={g.user.name} size={56} />
          </View>
          <Text style={styles.label} numberOfLines={1}>{g.user.name.split(' ')[0]}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:       { backgroundColor: colors.surface },
  container:    { paddingHorizontal: 12, paddingVertical: 10, gap: 12 },
  item:         { alignItems: 'center', width: 72 },
  ring:         { width: 64, height: 64, borderRadius: 32, padding: 3, alignItems: 'center', justifyContent: 'center' },
  ringUnviewed: { borderWidth: 2.5, borderColor: colors.primary },
  ringViewed:   { borderWidth: 2.5, borderColor: colors.border },
  addRing:      { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  plusBadge:    { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  plus:         { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 18 },
  label:        { fontSize: font.sm - 1, color: colors.text, marginTop: 4, maxWidth: 64, textAlign: 'center' },
});
