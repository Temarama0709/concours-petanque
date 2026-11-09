import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Checkbox } from '@/components/ui';
import { LEGAL_VERSION, colors } from '@/config/app';
import { useApp } from '@/state/AppContext';

/**
 * F02 — Écran bloquant : consignes de sécurité, CGU, confidentialité.
 * « Accepter et continuer » reste grisé tant que les trois cases ne sont pas
 * cochées ET que les consignes n'ont pas été parcourues jusqu'en bas.
 */
export default function LegalScreen() {
  const { t } = useTranslation();
  const { consent, acceptLegal } = useApp();
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [safety, setSafety] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [saving, setSaving] = useState(false);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 16) setScrolledToEnd(true);
  };

  const canAccept = scrolledToEnd && safety && terms && privacy && !saving;

  const onAccept = async () => {
    setSaving(true);
    try {
      await acceptLegal();
      router.replace('/');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{t('legal.title')}</Text>
      {consent && <Text style={styles.updated}>{t('legal.updated')}</Text>}
      <Text style={styles.intro}>{t('legal.intro')}</Text>

      <Text style={styles.docTitle}>
        {t('legal.safety')} <Text style={styles.version}>· {t('legal.version', { version: LEGAL_VERSION })}</Text>
      </Text>
      <ScrollView
        style={styles.safetyBox}
        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => viewportHeight > 0 && h <= viewportHeight && setScrolledToEnd(true)}
        onScroll={onScroll}
        scrollEventThrottle={100}
      >
        <Text style={styles.safetyText}>{t('docs.safety')}</Text>
      </ScrollView>
      {!scrolledToEnd && <Text style={styles.hint}>{t('legal.scrollHint')}</Text>}

      <View style={styles.checks}>
        <Checkbox checked={safety} onChange={setSafety} label={t('legal.acceptSafety')} />
        <DocCheckbox checked={terms} onChange={setTerms} label={t('legal.acceptTerms')} doc="terms" />
        <DocCheckbox checked={privacy} onChange={setPrivacy} label={t('legal.acceptPrivacy')} doc="privacy" />
      </View>

      <Button title={t('legal.acceptAndContinue')} onPress={onAccept} disabled={!canAccept} />
    </SafeAreaView>
  );
}

function DocCheckbox({ doc, ...props }: { doc: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.docRow}>
      <View style={{ flex: 1 }}>
        <Checkbox {...props} />
      </View>
      <Pressable accessibilityRole="link" onPress={() => router.push(`/settings/document/${doc}`)} hitSlop={8}>
        <Text style={styles.link}>{t('legal.read')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.background },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  updated: { marginTop: 8, color: colors.accent, fontWeight: '600' },
  intro: { marginTop: 8, fontSize: 15, color: colors.muted },
  docTitle: { marginTop: 20, fontSize: 16, fontWeight: '700', color: colors.text },
  version: { fontWeight: '400', color: colors.muted, fontSize: 13 },
  safetyBox: { flex: 1, marginTop: 8, backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  safetyText: { fontSize: 15, lineHeight: 22, color: colors.text, paddingBottom: 24 },
  hint: { marginTop: 6, fontSize: 13, color: colors.muted, fontStyle: 'italic' },
  checks: { marginVertical: 16 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  link: { color: colors.primary, fontWeight: '600' },
});
