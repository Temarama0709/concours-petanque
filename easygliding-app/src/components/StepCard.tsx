import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/config/app';
import type { Step } from '@/services/types';
import type { StepProgress } from '@/state/AppContext';

/** F05 — Carte vidéo : miniature, titre, durée, état et progression. */
export function StepCard({
  step,
  unlocked,
  progress,
  onPress,
}: {
  step: Step;
  unlocked: boolean;
  progress?: StepProgress;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const percent = progress && progress.duration > 0 ? Math.min(100, Math.round((progress.position / progress.duration) * 100)) : 0;

  const status = step.free ? t('home.free') : unlocked ? t('home.unlocked') : t('home.locked', { price: step.price ?? '' });

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={[styles.thumb, { backgroundColor: step.thumbnailColor }]}>
        <Text style={styles.thumbIcon}>{unlocked ? '▶' : '🔒'}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{t(`steps.${step.id}`)}</Text>
        <Text style={styles.meta}>
          {t('common.minutes', { count: step.durationMinutes })} · <Text style={!unlocked && styles.locked}>{status}</Text>
        </Text>
        {unlocked && percent > 0 && (
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
            <Text style={styles.resume}>{percent < 95 ? t('home.resume') : t('home.progress', { percent })}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    minHeight: 84,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumb: { width: 110, alignItems: 'center', justifyContent: 'center' },
  thumbIcon: { fontSize: 26, color: '#fff' },
  body: { flex: 1, padding: 12, justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { marginTop: 4, color: colors.muted, fontSize: 14 },
  locked: { color: colors.accent, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  progressTrack: { flex: 1, height: 5, backgroundColor: colors.border, borderRadius: 3 },
  progressFill: { height: 5, backgroundColor: colors.primary, borderRadius: 3 },
  resume: { fontSize: 12, color: colors.primary, fontWeight: '600' },
});
