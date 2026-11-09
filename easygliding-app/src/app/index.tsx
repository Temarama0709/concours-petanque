import { Redirect } from 'expo-router';

import { useApp } from '@/state/AppContext';

/**
 * Parcours du premier lancement (§2 du cahier des charges) :
 * 1. langue → 2. consignes + mentions légales → 3. compte → 4. accueil.
 * Chaque écran n'apparaît qu'une fois, sauf l'écran légal qui revient
 * si une nouvelle version des textes est publiée.
 */
export default function Index() {
  const { languageConfirmed, needsLegalAcceptance, user } = useApp();

  if (!languageConfirmed) return <Redirect href="/onboarding/language" />;
  if (needsLegalAcceptance) return <Redirect href="/onboarding/legal" />;
  if (!user) return <Redirect href="/auth" />;
  return <Redirect href="/home" />;
}
