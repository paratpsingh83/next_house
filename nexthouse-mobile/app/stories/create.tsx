import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, Image, Alert, ColorValue,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { storiesApi, mediaApi } from '@/api';
import Button from '@/components/common/Button';
import { colors, font, spacing, radius } from '@/theme';

const BG_OPTIONS = ['#2563EB', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#111827'];

export default function CreateStoryScreen() {
  const router = useRouter();
  const [type, setType] = useState<'IMAGE' | 'TEXT'>('TEXT');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [bg, setBg] = useState(BG_OPTIONS[0]);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Photo library access needed'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!res.canceled && res.assets[0]) { setImageUri(res.assets[0].uri); setType('IMAGE'); }
  };

  const onPost = async () => {
    try {
      setLoading(true);
      if (type === 'IMAGE' && imageUri) {
        const media = await mediaApi.upload(imageUri, 'STORY');
        await storiesApi.create({ mediaType: 'IMAGE', mediaUrl: media.url });
      } else {
        if (!text.trim()) { Alert.alert('Write something!'); return; }
        await storiesApi.create({ mediaType: 'TEXT', textContent: text, backgroundColor: bg });
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to post story');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Create Story</Text>
        <Button label="Share" onPress={onPost} loading={loading} style={{ paddingHorizontal: 16, paddingVertical: 8 }} />
      </View>

      {/* Type toggle */}
      <View style={styles.typeRow}>
        {(['TEXT', 'IMAGE'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.typeBtn, type === t && styles.typeBtnActive]}>
            <Ionicons name={t === 'TEXT' ? 'text-outline' : 'image-outline'} size={18} color={type === t ? '#fff' : colors.textMuted} />
            <Text style={[styles.typeLabel, type === t && styles.typeLabelActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Preview */}
      <View style={[styles.preview, { backgroundColor: type === 'IMAGE' ? '#000' : bg }]}>
        {type === 'IMAGE' && imageUri
          ? <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          : type === 'IMAGE'
          ? (
            <TouchableOpacity onPress={pickImage} style={styles.pickBtn}>
              <Ionicons name="image-outline" size={48} color="#fff" />
              <Text style={styles.pickLabel}>Tap to pick image</Text>
            </TouchableOpacity>
          )
          : (
            <TextInput
              style={styles.textInput}
              placeholder="Type your story..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={text}
              onChangeText={setText}
              multiline
              textAlign="center"
              maxLength={300}
            />
          )
        }
      </View>

      {/* Controls */}
      {type === 'IMAGE' && (
        <TouchableOpacity onPress={pickImage} style={styles.changePhotoBtn}>
          <Ionicons name="images-outline" size={20} color={colors.primary} />
          <Text style={styles.changePhotoText}>{imageUri ? 'Change photo' : 'Choose photo'}</Text>
        </TouchableOpacity>
      )}
      {type === 'TEXT' && (
        <View style={styles.bgRow}>
          <Text style={styles.bgLabel}>Background</Text>
          <View style={styles.bgColors}>
            {BG_OPTIONS.map(c => (
              <TouchableOpacity key={c} onPress={() => setBg(c)} style={[styles.bgColor, { backgroundColor: c }, bg === c && styles.bgColorActive]} />
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:    { fontSize: font.md, fontWeight: '700', color: colors.text },
  typeRow:        { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surface },
  typeBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  typeBtnActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  typeLabel:      { fontSize: font.sm, fontWeight: '600', color: colors.textMuted },
  typeLabelActive:{ color: '#fff' },
  preview:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewImage:   { width: '100%', height: '100%' },
  pickBtn:        { alignItems: 'center', gap: 12 },
  pickLabel:      { color: '#fff', fontSize: font.base, fontWeight: '600' },
  textInput:      { color: '#fff', fontSize: 24, fontWeight: '700', width: '80%', textAlign: 'center', lineHeight: 34 },
  changePhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  changePhotoText:{ fontSize: font.base, color: colors.primary, fontWeight: '600' },
  bgRow:          { backgroundColor: colors.surface, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  bgLabel:        { fontSize: font.sm, fontWeight: '600', color: colors.textMuted, marginBottom: 10 },
  bgColors:       { flexDirection: 'row', gap: 10 },
  bgColor:        { width: 32, height: 32, borderRadius: 16 },
  bgColorActive:  { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
});
