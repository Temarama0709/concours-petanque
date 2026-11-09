import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui';
import { colors } from '@/config/app';
import { track } from '@/services/analytics';
import type { StepId } from '@/services/types';
import { useApp } from '@/state/AppContext';

/**
 * F06 — Déverrouillage d'une étape.
 *
 * ⚠ Le modèle de vente n'est pas encore tranché (Q1) :
 *  A. paiement intégré Apple/Google → ajouter ici le bouton d'achat in-app ;
 *  B. achat hors appli uniquement → cet écran tel quel (« J'ai un code »,
 *     sans bouton ni lien « acheter sur le site », conforme aux règles Apple) ;
 *  C. mixte → A + B.
 * Dans tous les cas, les droits sont confirmés par le serveur.
 */
export default function PurchaseScreen() {
  const { id } = useLocalSearchParams<{ id: StepId }>();
  const { t } = useTranslation();
  const { catalog, redeemCode } = useApp();
  const step = catalog?.steps.find((s) => s.id === id);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (!step) return null;

  const onRedeem = async () => {
    setBusy(true);
    track({ name: 'purchase_started', stepId: step.id });
    try {
      if (await redeemCode(code)) {
        Alert.alert(t('purchase.success'));
        router.replace(`/step/${step.id}`);
      } else {
        Alert.alert(t('purchase.invalidCode'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('purchase.title', { step: t(`steps.${step.id}`) })}</Text>
      {step.price && <Text style={styles.price}>{step.price}</Text>}
      <Text style={styles.text}>{t('purchase.description')}</Text>

      {/* TODO(Q1) : bouton d'achat intégré (options A ou C). */}
      <Text style={styles.pending}>{t('purchase.pendingDecision')}</Text>

      <Text style={styles.label}>{t('purchase.haveCode')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('purchase.codePlaceholder')}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <Button title={t('purchase.redeem')} onPress={onRedeem} disabled={busy || code.trim().length < 4} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  price: { fontSize: 20, fontWeight: '700', color: colors.accent, marginTop: 8 },
  text: { fontSize: 15, color: colors.muted, marginTop: 12 },
  pending: { fontSize: 13, color: colors.muted, fontStyle: 'italic', marginTop: 12 },
  label: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 32, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 2,
    marginBottom: 12,
    color: colors.text,
  },
});
