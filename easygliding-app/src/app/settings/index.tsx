import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Alert, ScrollView, Switch, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Row, Section } from '@/components/ui';
import { ASSEMBLY_URL, FEEDBACK_URL, SUPPORT_EMAIL, colors } from '@/config/app';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from '@/i18n';
import { isBiometricAvailable } from '@/services/auth';
import { useApp } from '@/state/AppContext';

/** F09 — Paramètres et support. */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const app = useApp();
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const goStart = () => router.replace('/');

  const onSignOut = async () => {
    await app.signOut();
    goStart();
  };

  const onDelete = () =>
    Alert.alert(t('settings.deleteAccount'), t('settings.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.delete'),
        style: 'destructive',
        onPress: async () => {
          await app.deleteAccount();
          goStart();
        },
      },
    ]);

  const onRestore = async () => {
    await app.restorePurchases();
    Alert.alert(t('settings.restored'));
  };

  const enterCode = () => {
    const firstLocked = app.catalog?.steps.find((s) => !app.isStepUnlocked(s.id));
    if (firstLocked) router.push(`/purchase/${firstLocked.id}`);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      <Section title={t('settings.language')}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <Row
            key={lang}
            label={LANGUAGE_NAMES[lang]}
            onPress={() => app.setLanguage(lang)}
            right={lang === app.language ? <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text> : <Text />}
          />
        ))}
      </Section>

      <Section title={t('settings.account')}>
        {app.user && <Row label={`${app.user.firstName} ${app.user.lastName}\n${app.user.email}`.trim()} />}
        <Row label={t('settings.editAccount')} onPress={() => router.push('/settings/account')} />
        {biometricAvailable && (
          <Row
            label={t('settings.biometric')}
            right={<Switch value={app.biometricEnabled} onValueChange={app.setBiometricEnabled} />}
          />
        )}
        <Row label={t('settings.signOut')} onPress={onSignOut} />
        <Row label={t('settings.deleteAccount')} onPress={onDelete} right={<Text style={{ color: colors.danger }}>›</Text>} />
      </Section>

      <Section title={t('settings.purchases')}>
        <Row label={t('settings.restore')} onPress={onRestore} />
        <Row label={t('settings.enterCode')} onPress={enterCode} />
      </Section>

      <Section title={t('settings.documents')}>
        <Row label={t('legal.safety')} onPress={() => router.push('/settings/document/safety')} />
        <Row label={t('legal.terms')} onPress={() => router.push('/settings/document/terms')} />
        <Row label={t('legal.privacy')} onPress={() => router.push('/settings/document/privacy')} />
        <Row label={t('legal.notice')} onPress={() => router.push('/settings/document/notice')} />
        <Row
          label={t('settings.analytics')}
          right={<Switch value={app.analyticsConsent} onValueChange={app.setAnalyticsConsent} />}
        />
      </Section>

      <Section title={t('settings.support')}>
        <Row label={t('settings.contact')} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
        <Row label={t('settings.assembly')} onPress={() => Linking.openURL(ASSEMBLY_URL)} />
        <Row label={t('settings.feedback')} onPress={() => Linking.openURL(FEEDBACK_URL)} />
      </Section>

      <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 24 }}>
        {t('settings.version', { version: Constants.expoConfig?.version ?? '' })}
      </Text>
    </ScrollView>
  );
}
