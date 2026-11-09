import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Checkbox } from '@/components/ui';
import { colors } from '@/config/app';
import * as auth from '@/services/auth';
import { track } from '@/services/analytics';
import type { User } from '@/services/types';
import { useApp } from '@/state/AppContext';

/** F03 — Création de compte / connexion : Apple, Google ou e-mail. */
export default function AuthScreen() {
  const { t } = useTranslation();
  const { signIn } = useApp();
  const [mode, setMode] = useState<'signUp' | 'signIn'>('signUp');
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Case séparée et non pré-cochée (RGPD).
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    auth.isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const finish = async (user: User, isNew: boolean) => {
    await signIn(user);
    if (isNew) track({ name: 'account_created', provider: user.provider });
    router.replace('/');
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      // L'utilisateur qui annule la fenêtre Apple n'est pas une erreur.
      if ((e as { code?: string }).code !== 'ERR_REQUEST_CANCELED') Alert.alert(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const onApple = () => run(async () => finish(await auth.signInWithApple(), true));
  const onGoogle = () => run(async () => finish(await auth.signInWithGoogle(), true));

  const onEmail = () =>
    run(async () => {
      const validEmail = auth.isValidEmail(email);
      if (mode === 'signUp') {
        if (!validEmail || !firstName.trim() || !lastName.trim() || password.length < 8) {
          Alert.alert(t('auth.invalid'));
          return;
        }
        const user = await auth.signUpWithEmail({ firstName, lastName, email, password, marketingOptIn: marketing });
        Alert.alert(t('auth.verifyEmail', { email: user.email }));
        await finish(user, true);
      } else {
        if (!validEmail || !password) {
          Alert.alert(t('auth.invalid'));
          return;
        }
        await finish(await auth.signInWithEmail(email, password), false);
      }
    });

  const onMagicLink = () =>
    run(async () => {
      if (!auth.isValidEmail(email)) return Alert.alert(t('auth.invalid'));
      await auth.sendMagicLink(email);
      Alert.alert(t('auth.magicLinkSent', { email }));
    });

  const onForgot = () =>
    run(async () => {
      if (!auth.isValidEmail(email)) return Alert.alert(t('auth.invalid'));
      await auth.sendPasswordReset(email);
      Alert.alert(t('auth.resetSent', { email }));
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>uSki</Text>
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.apple}
              onPress={onApple}
            />
          )}
          <Button title={t('auth.google')} variant="secondary" onPress={onGoogle} disabled={busy} style={{ marginTop: 12 }} />

          <Text style={styles.or}>{t('auth.or')}</Text>

          {mode === 'signUp' && (
            <View style={styles.nameRow}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder={t('auth.firstName')} value={firstName} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder={t('auth.lastName')} value={lastName} onChangeText={setLastName} autoComplete="family-name" textContentType="familyName" />
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <TextInput
            style={styles.input}
            placeholder={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
            textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
          />

          {mode === 'signUp' && <Checkbox checked={marketing} onChange={setMarketing} label={t('auth.marketing')} />}

          <Button title={mode === 'signUp' ? t('auth.signUp') : t('auth.signIn')} onPress={onEmail} disabled={busy} style={{ marginTop: 12 }} />

          {mode === 'signIn' && (
            <View style={styles.links}>
              <Pressable onPress={onMagicLink} accessibilityRole="button">
                <Text style={styles.link}>{t('auth.magicLink')}</Text>
              </Pressable>
              <Pressable onPress={onForgot} accessibilityRole="button">
                <Text style={styles.link}>{t('auth.forgotPassword')}</Text>
              </Pressable>
            </View>
          )}

          <Pressable onPress={() => setMode(mode === 'signUp' ? 'signIn' : 'signUp')} accessibilityRole="button" style={{ marginTop: 20 }}>
            <Text style={[styles.link, { textAlign: 'center' }]}>{mode === 'signUp' ? t('auth.haveAccount') : t('auth.noAccount')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48 },
  logo: { fontSize: 40, fontWeight: '800', color: colors.primary, textAlign: 'center', marginVertical: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 6, marginBottom: 20 },
  apple: { height: 50, width: '100%' },
  or: { textAlign: 'center', color: colors.muted, marginVertical: 16 },
  nameRow: { flexDirection: 'row', gap: 10 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 10,
    color: colors.text,
  },
  links: { marginTop: 16, gap: 12, alignItems: 'center' },
  link: { color: colors.primary, fontWeight: '600', fontSize: 15 },
});
