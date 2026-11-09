/**
 * F11 — Mesure d'audience.
 * Rien n'est envoyé sans le consentement de l'utilisateur.
 * TODO : brancher un outil conforme RGPD, hébergé dans l'UE ou en Suisse.
 */
export type AnalyticsEvent =
  | { name: 'account_created'; provider: string }
  | { name: 'video_progress'; stepId: string; percent: number }
  | { name: 'video_completed'; stepId: string }
  | { name: 'purchase_started'; stepId: string }
  | { name: 'step_unlocked'; stepId: string; channel: 'code' | 'store' | 'web' };

let enabled = false;

export function setAnalyticsEnabled(value: boolean) {
  enabled = value;
}

export function track(event: AnalyticsEvent) {
  if (!enabled) return;
  if (__DEV__) console.log('[analytics]', event);
}
