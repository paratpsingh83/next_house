import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { postsApi, mediaApi } from '@/api';
import { useAppSelector } from '@/store/hooks';
import Avatar from '@/components/common/Avatar';
import Button from '@/components/common/Button';
import { colors, font, spacing, radius } from '@/theme';

const POST_TYPES = ['GENERAL', 'NEWS', 'HELP', 'EVENT', 'SAFETY', 'RECOMMENDATION'] as const;
type PostType = typeof POST_TYPES[number];

const TYPE_COLOR: Record<string, string> = {
  GENERAL: '#6B7280', NEWS: '#3B82F6', HELP: '#F59E0B',
  EVENT: '#8B5CF6', SAFETY: '#EF4444', RECOMMENDATION: '#10B981',
};

export default function CreatePostScreen() {
  const router   = useRouter();
  const me       = useAppSelector(s => s.auth.user);
  const [type, setType]       = useState<PostType>('GENERAL');
  const [content, setContent] = useState('');
  const [images, setImages]   = useState<string[]>([]);
  const [anon, setAnon]       = useState(false);
  const [loading, setLoading] = useState(false);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, selectionLimit: 4, quality: 0.85,
    });
    if (!res.canceled) setImages(prev => [...prev, ...res.assets.map(a => a.uri)].slice(0, 4));
  };

  const onPost = async () => {
    if (!content.trim()) { Alert.alert('Write something!'); return; }
    try {
      setLoading(true);
      // Upload media
      const mediaIds: number[] = [];
      for (const uri of images) {
        const media = await mediaApi.upload(uri, 'POST');
        mediaIds.push(media.id);
      }
      await postsApi.create({ postType: type, content: content.trim(), anonymous: anon, mediaIds });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <Button label="Post" onPress={onPost} loading={loading} style={{ paddingHorizontal: 20, paddingVertical: 8 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {/* Author row */}
          <View style={styles.authorRow}>
            <Avatar uri={me?.profileImage} name={me?.name ?? 'Me'} size={42} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.authorName}>{anon ? 'Anonymous' : me?.name}</Text>
            </View>
          </View>

          {/* Content */}
          <TextInput
            style={styles.contentInput}
            placeholder="What's happening in your neighbourhood?"
            placeholderTextColor={colors.textLight}
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
            maxLength={2000}
          />

          {/* Images preview */}
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
              {images.map((uri, i) => (
                <View key={i} style={styles.imageWrap}>
                  <Image source={{ uri }} style={styles.thumbImage} />
                  <TouchableOpacity style={styles.removeImg} onPress={() => setImages(p => p.filter((_, j) => j !== i))}>
                    <Ionicons name="close-circle" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </ScrollView>

        {/* Bottom toolbar */}
        <View style={styles.toolbar}>
          {/* Post type */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {POST_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={[styles.typeChip, type === t && { backgroundColor: TYPE_COLOR[t] }]}
              >
                <Text style={[styles.typeChipText, type === t && { color: '#fff' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.toolbarActions}>
            <TouchableOpacity onPress={pickImages} style={styles.toolBtn}>
              <Ionicons name="image-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAnon(p => !p)} style={[styles.toolBtn, anon && styles.toolBtnActive]}>
              <Ionicons name={anon ? 'eye-off' : 'eye-off-outline'} size={22} color={anon ? '#fff' : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.surface },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:  { fontSize: font.md, fontWeight: '700', color: colors.text },
  body:         { flex: 1, padding: spacing.lg },
  authorRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  authorName:   { fontSize: font.base, fontWeight: '700', color: colors.text },
  contentInput: { fontSize: font.lg, color: colors.text, lineHeight: 26, minHeight: 120 },
  imagesRow:    { marginTop: spacing.md },
  imageWrap:    { marginRight: spacing.sm },
  thumbImage:   { width: 100, height: 100, borderRadius: radius.md },
  removeImg:    { position: 'absolute', top: 4, right: 4 },
  toolbar:      { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.sm },
  typeChip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.bg, marginRight: spacing.xs, borderWidth: 1, borderColor: colors.border },
  typeChipText: { fontSize: font.sm, fontWeight: '600', color: colors.textMuted },
  toolbarActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm, gap: 8 },
  toolBtn:      { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  toolBtnActive:{ backgroundColor: colors.primary },
});
