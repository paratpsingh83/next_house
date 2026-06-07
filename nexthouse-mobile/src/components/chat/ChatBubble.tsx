import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import type { ChatMessageResponse } from '@/types';
import { colors, font, radius, spacing } from '@/theme';

interface Props {
  message: ChatMessageResponse;
  isMine: boolean;
}

export default function ChatBubble({ message, isMine }: Props) {
  const time = format(new Date(message.createdAt), 'HH:mm');

  if (message.isDeleted) {
    return (
      <View style={[styles.row, isMine && styles.rowMine]}>
        <View style={[styles.bubble, styles.deleted]}>
          <Text style={styles.deletedText}>Message deleted</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, isMine && styles.rowMine]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        {message.replyToPreview && (
          <View style={[styles.replyBar, isMine && styles.replyBarMine]}>
            <Text style={[styles.replyText, isMine && styles.replyTextMine]} numberOfLines={1}>
              {message.replyToPreview}
            </Text>
          </View>
        )}
        <Text style={[styles.text, isMine && styles.textMine]}>{message.message}</Text>
        <Text style={[styles.time, isMine && styles.timeMine]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:           { flexDirection: 'row', marginBottom: 3, paddingHorizontal: spacing.md },
  rowMine:       { justifyContent: 'flex-end' },
  bubble:        { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine:    { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther:   { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  deleted:       { backgroundColor: colors.border },
  deletedText:   { fontSize: font.sm, color: colors.textMuted, fontStyle: 'italic' },
  text:          { fontSize: font.base, color: colors.text, lineHeight: 20 },
  textMine:      { color: '#fff' },
  time:          { fontSize: 10, color: colors.textMuted, alignSelf: 'flex-end', marginTop: 4 },
  timeMine:      { color: 'rgba(255,255,255,0.65)' },
  replyBar:      { borderLeftWidth: 3, borderLeftColor: colors.textMuted, paddingLeft: 8, marginBottom: 4 },
  replyBarMine:  { borderLeftColor: 'rgba(255,255,255,0.5)' },
  replyText:     { fontSize: font.sm, color: colors.textMuted },
  replyTextMine: { color: 'rgba(255,255,255,0.75)' },
});
