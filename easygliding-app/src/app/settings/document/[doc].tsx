import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LEGAL_VERSION, colors } from '@/config/app';

const DOCS = ['safety', 'terms', 'privacy', 'notice'] as const;
type Doc = (typeof DOCS)[number];

/** F02 / F09 — Les textes restent consultables à tout moment. */
export default function DocumentScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { t } = useTranslation();
  if (!DOCS.includes(doc as Doc)) return null;

  return (
    <>
      <Stack.Screen options={{ title: t(`legal.${doc}`) }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.version}>{t('legal.version', { version: LEGAL_VERSION })}</Text>
        <Text style={styles.text}>{t(`docs.${doc}`)}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  version: { color: colors.muted, marginBottom: 12 },
  text: { fontSize: 16, lineHeight: 24, color: colors.text },
});
