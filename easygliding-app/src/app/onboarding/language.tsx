import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui';
import { colors } from '@/config/app';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from '@/i18n';
import { useApp } from '@/state/AppContext';

/** F01 — Confirmation de la langue détectée (premier lancement). */
export default function LanguageScreen() {
  const { t } = useTranslation();
  const { language, setLanguage, confirmLanguage } = useApp();

  const onContinue = async () => {
    await confirmLanguage();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.logo}>uSki</Text>
      <Text style={styles.title}>{t('language.title')}</Text>
      <Text style={styles.text}>{t('language.detected')}</Text>
      <View style={styles.list}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <Pressable
            key={lang}
            accessibilityRole="radio"
            accessibilityState={{ selected: lang === language }}
            onPress={() => setLanguage(lang)}
            style={[styles.option, lang === language && styles.optionSelected]}
          >
            <Text style={[styles.optionText, lang === language && { color: '#fff' }]}>{LANGUAGE_NAMES[lang]}</Text>
          </Pressable>
        ))}
      </View>
      <Button title={t('common.continue')} onPress={onContinue} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.background },
  logo: { fontSize: 44, fontWeight: '800', color: colors.primary, textAlign: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  text: { fontSize: 16, color: colors.muted, marginTop: 8 },
  list: { marginVertical: 24, gap: 12 },
  option: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: 17, fontWeight: '600', color: colors.text },
});
