import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { storiesApi } from '@/api';
import Spinner from '@/components/common/Spinner';
import { colors } from '@/theme';
import type { StoryResponse } from '@/types';

const { width: W, height: H } = Dimensions.get('window');
const STORY_DURATION_MS = 5000;

export default function StoriesViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const qc     = useQueryClient();
  const uid    = Number(userId);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['stories-user', uid],
    queryFn:  () => storiesApi.getUser(uid),
    enabled:  !!uid,
  });

  const [idx,      setIdx]      = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const markViewed = useMutation({
    mutationFn: (storyId: number) => storiesApi.markViewed(storyId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['stories-feed'] }),
  });

  const story: StoryResponse | undefined = stories[idx];

  const goNext = () => {
    if (idx < stories.length - 1) { setIdx(i => i + 1); setProgress(0); }
    else router.back();
  };

  const goPrev = () => {
    if (idx > 0) { setIdx(i => i - 1); setProgress(0); }
  };

  useEffect(() => {
    if (!story) return;
    if (!story.viewedByMe) markViewed.mutate(story.id);

    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(intervalRef.current!); goNext(); return 100; }
        return p + (100 / (STORY_DURATION_MS / 100));
      });
    }, 100);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [idx, story?.id]);

  if (isLoading) return <Spinner full />;
  if (!story)    { router.back(); return null; }

  const bgColor = story.backgroundColor ?? '#111827';

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Background */}
      <View style={[styles.bg, { backgroundColor: story.mediaType === 'TEXT' ? bgColor : '#000' }]}>
        {story.mediaType === 'IMAGE' && story.mediaUrl && (
          <Image source={{ uri: story.mediaUrl }} style={styles.media} resizeMode="cover" />
        )}
        {story.mediaType === 'TEXT' && (
          <View style={styles.textContainer}>
            <Text style={styles.storyText}>{story.textContent}</Text>
          </View>
        )}
      </View>

      {/* Overlay */}
      <SafeAreaView style={styles.overlay} edges={['top']}>
        {/* Progress bars */}
        <View style={styles.progressRow}>
          {stories.map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Author header */}
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}>
            {story.author.profileImage
              ? <Image source={{ uri: story.author.profileImage }} style={styles.avatarImg} />
              : <Text style={styles.avatarText}>{story.author.name[0]}</Text>
            }
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.authorName}>{story.author.name}</Text>
            <Text style={styles.storyTime}>
              {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Text overlay on media */}
        {story.textContent && story.mediaType !== 'TEXT' && (
          <View style={styles.captionBox}>
            <Text style={styles.captionText}>{story.textContent}</Text>
          </View>
        )}
      </SafeAreaView>

      {/* Tap zones */}
      <View style={styles.tapZones}>
        <TouchableOpacity style={styles.tapLeft}  onPress={goPrev} activeOpacity={1} />
        <TouchableOpacity style={styles.tapRight} onPress={goNext} activeOpacity={1} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#000' },
  bg:            { ...StyleSheet.absoluteFillObject },
  media:         { width: W, height: H },
  textContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  storyText:     { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 36, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  overlay:       { ...StyleSheet.absoluteFillObject },
  progressRow:   { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 8 },
  progressTrack: { flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  authorRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10 },
  authorAvatar:  { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarImg:     { width: '100%', height: '100%' },
  avatarText:    { color: '#fff', fontWeight: '700', fontSize: 16 },
  authorName:    { color: '#fff', fontWeight: '700', fontSize: 14, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  storyTime:     { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  closeBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  captionBox:    { position: 'absolute', bottom: 80, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: 12 },
  captionText:   { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  tapZones:      { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  tapLeft:       { flex: 1 },
  tapRight:      { flex: 1 },
});