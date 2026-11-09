import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Carousel } from '@/components/Carousel';
import { StepCard } from '@/components/StepCard';
import { colors } from '@/config/app';
import type { StepId } from '@/services/types';
import { useApp } from '@/state/AppContext';

/**
 * F05 — Accueil : carrousel (tiers supérieur) + 4 cartes vidéo
 * (deux tiers inférieurs). Images, titres et prix viennent du back-office.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const { catalog, isStepUnlocked, progress } = useApp();
  const steps = catalog?.steps ?? [];

  const firstLocked = steps.find((s) => !isStepUnlocked(s.id));

  const open = (id: StepId) => {
    router.push(isStepUnlocked(id) ? `/step/${id}` : `/purchase/${id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>uSki</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('home.settings')} hitSlop={12} onPress={() => router.push('/settings')}>
          <Text style={styles.settingsIcon}>⚙︎</Text>
        </Pressable>
      </View>

      <Carousel
        height={Math.round(height / 3) - 48}
        slides={steps.map((s, i) => ({
          key: s.id,
          title: t(`home.slides.s${i + 1}`),
          color: s.thumbnailColor,
        }))}
        buyTitle={t('home.slides.buy')}
        buyLabel={catalog?.bundlePrice ? `${t('home.buyMethod')} · ${catalog.bundlePrice}` : t('home.buyMethod')}
        onBuy={firstLocked ? () => open(firstLocked.id) : undefined}
      />

      <ScrollView contentContainerStyle={styles.list}>
        {steps.map((step) => (
          <StepCard
            key={step.id}
            step={step}
            unlocked={isStepUnlocked(step.id)}
            progress={progress[step.id]}
            onPress={() => open(step.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  logo: { fontSize: 24, fontWeight: '800', color: colors.primary },
  settingsIcon: { fontSize: 26, color: colors.text },
  list: { padding: 16 },
});
