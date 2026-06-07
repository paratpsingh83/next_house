import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { usersApi, mediaApi } from '@/api';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import Avatar from '@/components/common/Avatar';
import Spinner from '@/components/common/Spinner';
import { colors, font, spacing, radius } from '@/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const me = useAppSelector(s => s.auth.user);

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: usersApi.getMe,
    enabled: !!me,
  });

  const user = profile ?? me;

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const updateMut = useMutation({
    mutationFn: async () => {
      let profileImage = user?.profileImage;
      if (avatarUri) {
        setUploading(true);
        const media = await mediaApi.upload(avatarUri, 'PROFILE');
        profileImage = media.url;
        setUploading(false);
      }
      return usersApi.updateProfile({ name: name.trim(), bio: bio.trim() || undefined, profileImage });
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      if (me) {
        dispatch(setCredentials({
          user: updated,
          accessToken: '',
          refreshToken: '',
        }));
      }
      router.back();
    },
    onError: () => {
      setUploading(false);
      Alert.alert('Error', 'Failed to update profile');
    },
  });

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  if (!user) return <Spinner full />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={[styles.saveBtn, (!name.trim() || updateMut.isPending) && styles.saveBtnDisabled]}
          onPress={() => updateMut.mutate()}
          disabled={!name.trim() || updateMut.isPending}
        >
          {updateMut.isPending || uploading ? <Spinner /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarSection}>
            <Avatar uri={avatarUri ?? user.profileImage} name={user.name} size={90} />
            <TouchableOpacity onPress={pickAvatar} style={styles.changePhotoBtn}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textLight}
              maxLength={60}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <View style={[styles.input, styles.readOnly]}>
              <Text style={styles.readOnlyText}>@{user.username}</Text>
            </View>
            <Text style={styles.hint}>Username cannot be changed</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell your neighbours about yourself..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
            />
            <Text style={styles.charCount}>{bio.length}/300</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:         { padding: 4 },
  headerTitle:     { fontSize: font.lg, fontWeight: '700', color: colors.text },
  saveBtn:         { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.full },
  saveBtnDisabled: { backgroundColor: colors.border },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: font.base },
  form:            { padding: spacing.lg },
  avatarSection:   { alignItems: 'center', paddingVertical: spacing.xl },
  changePhotoBtn:  { marginTop: 12 },
  changePhotoText: { color: colors.primary, fontWeight: '600', fontSize: font.base },
  field:           { marginBottom: spacing.lg },
  label:           { fontSize: font.sm, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:           { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: font.base, color: colors.text },
  textarea:        { height: 100 },
  readOnly:        { backgroundColor: colors.bg, justifyContent: 'center' },
  readOnlyText:    { fontSize: font.base, color: colors.textMuted },
  hint:            { fontSize: font.sm - 1, color: colors.textLight, marginTop: 4 },
  charCount:       { fontSize: font.sm - 1, color: colors.textLight, textAlign: 'right', marginTop: 4 },
});