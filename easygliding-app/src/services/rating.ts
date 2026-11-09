import * as StoreReview from 'expo-store-review';

import { RATING_MIN_DAYS_AFTER_INSTALL } from '@/config/app';
import { getItem, setItem } from './storage';

/**
 * F08 — Demande de notation.
 * Uniquement la fenêtre native (iOS limite déjà à 3 affichages par an).
 * Déclenchée après avoir fini une étape payante, au moins 3 jours après
 * l'installation ; jamais pendant une vidéo ni juste après un achat.
 */
export async function maybeRequestReview(installedAt: string | null) {
  if (!installedAt) return;
  const days = (Date.now() - new Date(installedAt).getTime()) / 86_400_000;
  if (days < RATING_MIN_DAYS_AFTER_INSTALL) return;

  const lastPurchaseAt = await getItem<string>('lastPurchaseAt');
  if (lastPurchaseAt && Date.now() - new Date(lastPurchaseAt).getTime() < 86_400_000) return;

  const lastAskedAt = await getItem<string>('lastReviewAskedAt');
  if (lastAskedAt && Date.now() - new Date(lastAskedAt).getTime() < 120 * 86_400_000) return;

  if (await StoreReview.isAvailableAsync()) {
    await StoreReview.requestReview();
    await setItem('lastReviewAskedAt', new Date().toISOString());
  }
}
