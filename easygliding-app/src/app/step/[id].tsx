import { useEffect, useRef, useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui';
import { colors } from '@/config/app';
import type { Language } from '@/i18n';
import { track } from '@/services/analytics';
import { backend } from '@/services/backend';
import { maybeRequestReview } from '@/services/rating';
import { STEP_ORDER, type Step, type StepId } from '@/services/types';
import { useApp } from '@/state/AppContext';

const SPEEDS = [0.5, 0.75, 1];

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** F07 — Page vidéo d'une étape. */
export default function StepScreen() {
  const { id } = useLocalSearchParams<{ id: StepId }>();
  const { t } = useTranslation();
  const { catalog, user, isStepUnlocked } = useApp();
  const step = catalog?.steps.find((s) => s.id === id);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (step && isStepUnlocked(step.id)) {
      // Lien signé et temporaire, demandé à chaque ouverture.
      backend.getPlaybackUrl(user?.id ?? null, step.id).then(setUrl);
    }
  }, [step, user, isStepUnlocked]);

  if (!step) return null;

  return (
    <>
      <Stack.Screen options={{ title: t(`steps.${step.id}`) }} />
      {!isStepUnlocked(step.id) ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{t('video.locked')}</Text>
        </View>
      ) : url ? (
        <StepPlayer step={step} url={url} />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </>
  );
}

function StepPlayer({ step, url }: { step: Step; url: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const { progress, saveProgress, installedAt, isStepUnlocked } = useApp();
  const [speed, setSpeed] = useState(1);
  const [ended, setEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const resumed = useRef(false);
  const durationRef = useRef(0);

  const player = useVideoPlayer(url, (p) => {
    p.timeUpdateEventInterval = 1;
  });

  // Reprise automatique là où l'utilisateur s'était arrêté.
  useEventListener(player, 'sourceLoad', ({ duration }) => {
    durationRef.current = duration;
    const saved = progress[step.id];
    if (!resumed.current && saved && saved.position > 5 && saved.position < duration - 5) {
      player.currentTime = saved.position;
    }
    resumed.current = true;
  });

  useEventListener(player, 'timeUpdate', ({ currentTime: time }) => {
    setCurrentTime(time);
    if (durationRef.current > 0 && Math.floor(time) % 5 === 0) {
      saveProgress(step.id, { position: time, duration: durationRef.current });
    }
  });

  useEventListener(player, 'playToEnd', () => {
    setEnded(true);
    saveProgress(step.id, { position: durationRef.current, duration: durationRef.current });
    track({ name: 'video_completed', stepId: step.id });
    if (!step.free) void maybeRequestReview(installedAt);
  });

  useEffect(() => {
    player.playbackRate = speed;
  }, [player, speed]);

  const seekTo = (time: number) => {
    player.currentTime = time;
    player.play();
    setEnded(false);
  };

  const nextId = STEP_ORDER[STEP_ORDER.indexOf(step.id) + 1];
  const goNext = () => {
    if (!nextId) return;
    player.pause();
    router.replace(isStepUnlocked(nextId) ? `/step/${nextId}` : `/purchase/${nextId}`);
  };

  // Chapitre en cours = dernier chapitre dont le début est passé.
  const activeChapter = [...step.chapters].reverse().find((c) => currentTime >= c.time);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true, orientation: 'landscape' }}
      />

      <View style={styles.meta}>
        <Text style={styles.title}>{t(`steps.${step.id}`)}</Text>
        <Text style={styles.muted}>{t('common.minutes', { count: step.durationMinutes })}</Text>
      </View>

      <View style={styles.speedRow}>
        <Text style={styles.label}>{t('video.speed')}</Text>
        {SPEEDS.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityState={{ selected: s === speed }}
            onPress={() => setSpeed(s)}
            style={[styles.speed, s === speed && styles.speedActive]}
          >
            <Text style={[styles.speedText, s === speed && { color: '#fff' }]}>{s}×</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, styles.sectionTitle]}>{t('video.keyPoints')}</Text>
      {step.chapters.map((chapter) => {
        const active = chapter === activeChapter;
        return (
          <Pressable
            key={chapter.time}
            accessibilityRole="button"
            onPress={() => seekTo(chapter.time)}
            style={[styles.chapter, active && styles.chapterActive]}
          >
            <Text style={styles.chapterTime}>{formatTime(chapter.time)}</Text>
            <Text style={[styles.chapterLabel, active && { fontWeight: '700' }]}>{chapter.label[lang] ?? chapter.label.en}</Text>
          </Pressable>
        );
      })}

      {nextId && (ended || step.free) && (
        <Button title={`${t('video.nextStep')} → ${t(`steps.${nextId}`)}`} onPress={goNext} style={{ margin: 16 }} />
      )}
      {/* F10 — Téléchargement hors ligne : à implémenter (fichiers lisibles uniquement dans l'appli). */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  meta: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  muted: { color: colors.muted, marginTop: 4, fontSize: 15 },
  label: { fontSize: 14, fontWeight: '600', color: colors.muted },
  sectionTitle: { marginHorizontal: 16, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  speedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  speed: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.primary },
  speedActive: { backgroundColor: colors.primary },
  speedText: { color: colors.primary, fontWeight: '600' },
  chapter: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  chapterActive: { backgroundColor: '#E8F1FB' },
  chapterTime: { width: 44, color: colors.primary, fontVariant: ['tabular-nums'], fontWeight: '600' },
  chapterLabel: { flex: 1, color: colors.text, fontSize: 15 },
});
