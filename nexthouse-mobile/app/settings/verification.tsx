import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { usersApi, verificationApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import { useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import { colors, font, spacing, radius } from '@/theme';
import type { UserResponse } from '@/types';

export default function VerificationScreen() {
  const router   = useRouter();
  const qc       = useQueryClient();
  const dispatch = useAppDispatch();

  const { data: me, isLoading } = useQuery<UserResponse>({
    queryKey: ['my-profile'],
    queryFn:  usersApi.getMe,
  });

  const refresh = async () => {
    const updated = await usersApi.getMe();
    dispatch(setUser(updated));
    qc.setQueryData(['my-profile'], updated);
  };

  if (isLoading) return <Spinner full />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Trust score */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Trust Score</Text>
            <Text style={styles.scoreValue}>{me?.trustScore ?? 0} / 100</Text>
          </View>
          <View style={styles.scoreBarBg}>
            <View style={[styles.scoreBarFill, { width: `${Math.min(me?.trustScore ?? 0, 100)}%` as any }]} />
          </View>
          <Text style={styles.scoreHint}>Identity +20 · Address +10</Text>
        </View>

        {/* Identity */}
        {me?.identityVerified ? (
          <VerifiedCard
            icon="shield-checkmark"
            color="#16A34A"
            bg="#DCFCE7"
            title="Identity Verified"
            subtitle={me.kycName ? `Verified as ${me.kycName}` : 'Your identity has been verified'}
          />
        ) : (
          <AadhaarXmlCard onSuccess={refresh} />
        )}

        {/* Address */}
        {me?.addressVerified ? (
          <VerifiedCard
            icon="location"
            color="#2563EB"
            bg="#DBEAFE"
            title="Address Verified"
            subtitle="Your address has been verified"
          />
        ) : (
          <DigiLockerCard />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Verified badge card ──────────────────────────────────────────────────────

function VerifiedCard({ icon, color, bg, title, subtitle }: {
  icon: string; color: string; bg: string; title: string; subtitle: string;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.cardIconBox, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.verifiedRow}>
          <Ionicons name="checkmark-circle" size={14} color={color} />
          <Text style={[styles.verifiedTitle, { color }]}>{title}</Text>
        </View>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ─── Aadhaar Offline XML ──────────────────────────────────────────────────────

function AadhaarXmlCard({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [file,      setFile]  = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [shareCode, setCode]  = useState('');
  const [loading,   setLoad]  = useState(false);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/zip', 'application/xml', 'text/xml', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const picked = result.assets[0];
    if (!picked.name.endsWith('.zip') && !picked.name.endsWith('.xml')) {
      Alert.alert('Wrong File', 'Please select the ZIP or XML file downloaded from myaadhaar.uidai.gov.in');
      return;
    }
    setFile({ uri: picked.uri, name: picked.name, mimeType: picked.mimeType });
  };

  const handleSubmit = async () => {
    if (!file)                      { Alert.alert('Missing', 'Please select your Aadhaar XML file'); return; }
    if (!/^\d{4}$/.test(shareCode)) { Alert.alert('Invalid', 'Share code must be exactly 4 digits'); return; }

    setLoad(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/zip' } as any);
      formData.append('shareCode', shareCode);
      await verificationApi.verifyAadhaarXmlForm(formData);
      Alert.alert('Verified!', 'Identity verified successfully. +20 trust score added.');
      await onSuccess();
    } catch (err: any) {
      Alert.alert('Failed', err?.response?.data?.message ?? 'Could not verify. Check your file and share code.');
    } finally {
      setLoad(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBox, { backgroundColor: '#DCFCE7' }]}>
          <Ionicons name="shield-outline" size={22} color="#16A34A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Identity Verification</Text>
          <Text style={styles.cardSubtitle}>Aadhaar Offline XML — free, instant, no review</Text>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How to get your Aadhaar XML</Text>
        {[
          'Open myaadhaar.uidai.gov.in',
          'Tap "Offline e-KYC"',
          'Enter Aadhaar number + OTP',
          'Set a 4-digit share code',
          'Download the ZIP file',
          'Upload it here with the share code',
        ].map((step, i) => (
          <Text key={i} style={styles.infoStep}>{i + 1}. {step}</Text>
        ))}
        <TouchableOpacity
          onPress={() => Linking.openURL('https://myaadhaar.uidai.gov.in')}
          style={styles.linkBtn}
        >
          <Ionicons name="open-outline" size={13} color="#2563EB" />
          <Text style={styles.linkText}>Open UIDAI Website</Text>
        </TouchableOpacity>
      </View>

      {/* File picker */}
      <Text style={styles.stepLabel}>Step 1 — Select ZIP or XML file</Text>
      <TouchableOpacity onPress={pickFile} style={[styles.uploadBtn, file && styles.uploadBtnDone]}>
        {file ? (
          <>
            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            <Text style={styles.uploadBtnDoneText} numberOfLines={1}>{file.name}</Text>
            <TouchableOpacity onPress={() => setFile(null)}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.textMuted} />
            <Text style={styles.uploadBtnText}>Tap to select file</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Share code */}
      <Text style={styles.stepLabel}>Step 2 — Enter 4-digit share code</Text>
      <TextInput
        style={styles.codeInput}
        value={shareCode}
        onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 4))}
        placeholder="1234"
        keyboardType="number-pad"
        maxLength={4}
        textAlign="center"
      />

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading || !file || shareCode.length !== 4}
        style={[styles.submitBtn, styles.submitBtnGreen, (loading || !file || shareCode.length !== 4) && styles.submitBtnDisabled]}
      >
        {loading
          ? <ActivityIndicator size="small" color="#fff" />
          : <><Ionicons name="shield-checkmark-outline" size={16} color="#fff" /><Text style={styles.submitBtnText}>Verify Identity</Text></>
        }
      </TouchableOpacity>
    </View>
  );
}

// ─── DigiLocker ───────────────────────────────────────────────────────────────

function DigiLockerCard() {
  const [loading, setLoad] = useState(false);

  const handleDigiLocker = async () => {
    setLoad(true);
    try {
      const { url } = await verificationApi.getDigiLockerUrl();
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not connect to DigiLocker. Please try again.');
    } finally {
      setLoad(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBox, { backgroundColor: '#DBEAFE' }]}>
          <Ionicons name="location-outline" size={22} color="#2563EB" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Address Verification</Text>
          <Text style={styles.cardSubtitle}>Connect DigiLocker — government documents, zero forgery</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How DigiLocker works</Text>
        {[
          'Tap the button below',
          'Log in with DigiLocker / Aadhaar',
          'Authorize NextHouse access',
          'Return here — address auto-verified ✓',
        ].map((step, i) => (
          <Text key={i} style={styles.infoStep}>{i + 1}. {step}</Text>
        ))}
      </View>

      <View style={styles.warningBox}>
        <Ionicons name="warning-outline" size={14} color="#92400E" />
        <Text style={styles.warningText}>
          Make sure your DigiLocker has at least one address document (Aadhaar, DL, Voter ID).
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleDigiLocker}
        disabled={loading}
        style={[styles.submitBtn, styles.submitBtnBlue, loading && styles.submitBtnDisabled]}
      >
        {loading
          ? <ActivityIndicator size="small" color="#fff" />
          : <><Ionicons name="open-outline" size={16} color="#fff" /><Text style={styles.submitBtnText}>Verify with DigiLocker</Text></>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:         { padding: 4 },
  headerTitle:     { fontSize: font.lg, fontWeight: '700', color: colors.text },
  content:         { padding: spacing.md, gap: spacing.md },
  scoreCard:       { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  scoreRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  scoreLabel:      { fontSize: font.sm, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreValue:      { fontSize: font.lg, fontWeight: '800', color: colors.primary },
  scoreBarBg:      { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  scoreBarFill:    { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  scoreHint:       { fontSize: font.sm - 1, color: colors.textMuted, marginTop: 6 },
  card:            { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  cardHeader:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardIconBox:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle:       { fontSize: font.base, fontWeight: '700', color: colors.text },
  cardSubtitle:    { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },
  verifiedRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  verifiedTitle:   { fontSize: font.base, fontWeight: '700' },
  infoBox:         { backgroundColor: '#EFF6FF', borderRadius: radius.md, padding: spacing.sm, gap: 3 },
  infoTitle:       { fontSize: font.sm, fontWeight: '700', color: '#1E40AF', marginBottom: 4 },
  infoStep:        { fontSize: font.sm - 1, color: '#1D4ED8', lineHeight: 18 },
  linkBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  linkText:        { fontSize: font.sm, color: '#2563EB', fontWeight: '600' },
  stepLabel:       { fontSize: font.sm, fontWeight: '700', color: colors.textMuted },
  uploadBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md, padding: 14 },
  uploadBtnDone:   { borderStyle: 'solid', borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  uploadBtnText:   { fontSize: font.sm, color: colors.textMuted },
  uploadBtnDoneText: { fontSize: font.sm, color: '#15803D', fontWeight: '600', flex: 1 },
  codeInput:       { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 12, width: 140, alignSelf: 'center' },
  warningBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: radius.md, padding: spacing.sm },
  warningText:     { flex: 1, fontSize: font.sm - 1, color: '#92400E', lineHeight: 17 },
  submitBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: radius.lg },
  submitBtnGreen:  { backgroundColor: '#16A34A' },
  submitBtnBlue:   { backgroundColor: '#2563EB' },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText:   { color: '#fff', fontSize: font.base, fontWeight: '700' },
});