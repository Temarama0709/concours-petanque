import { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/config/app';
import { authenticateWithBiometrics } from '@/services/auth';
import { useApp } from '@/state/AppContext';
import { Button } from './ui';

/** F03 — Déverrouillage par Face ID / empreinte, si activé dans les paramètres. */
export function LockScreen() {
  const { t } = useTranslation();
  const { unlock, signOut } = useApp();

  const tryUnlock = useCallback(async () => {
    if (await authenticateWithBiometrics(t('auth.biometricPrompt'))) unlock();
  }, [t, unlock]);

  useEffect(() => {
    void tryUnlock();
  }, [tryUnlock]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>uSki</Text>
      <Button title={t('auth.unlock')} onPress={tryUnlock} style={{ alignSelf: 'stretch' }} />
      <Button title={t('settings.signOut')} variant="secondary" onPress={signOut} style={{ alignSelf: 'stretch', marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: colors.background },
  logo: { fontSize: 44, fontWeight: '800', color: colors.primary, marginBottom: 48 },
});
