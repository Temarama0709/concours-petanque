import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Checkbox } from '@/components/ui';
import { colors } from '@/config/app';
import { useApp } from '@/state/AppContext';

/** F03 — Modification des informations du compte. */
export default function AccountScreen() {
  const { t } = useTranslation();
  const { user, updateUser } = useApp();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [marketing, setMarketing] = useState(user?.marketingOptIn ?? false);

  if (!user) return null;

  const onSave = async () => {
    await updateUser({ ...user, firstName: firstName.trim(), lastName: lastName.trim(), marketingOptIn: marketing });
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('auth.firstName')}</Text>
      <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
      <Text style={styles.label}>{t('auth.lastName')}</Text>
      <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
      <Text style={styles.label}>{t('auth.email')}</Text>
      <Text style={styles.email}>{user.email}</Text>
      <Checkbox checked={marketing} onChange={setMarketing} label={t('auth.marketing')} />
      <Button title={t('common.continue')} onPress={onSave} style={{ marginTop: 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  email: { fontSize: 16, color: colors.text, paddingVertical: 8 },
});
