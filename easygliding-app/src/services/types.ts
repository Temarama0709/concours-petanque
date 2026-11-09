import type { Language } from '@/i18n';

export type StepId = 'setup' | 'step1' | 'step2' | 'step3';
export const STEP_ORDER: StepId[] = ['setup', 'step1', 'step2', 'step3'];

/** Texte saisi par langue dans le back-office. */
export type Localized = Partial<Record<Language, string>> & { en: string };

export interface Chapter {
  /** Position dans la vidéo, en secondes. */
  time: number;
  label: Localized;
}

export interface Step {
  id: StepId;
  free: boolean;
  /** Prix affiché (ex. « 9,90 € »), géré depuis le back-office. */
  price?: string;
  durationMinutes: number;
  thumbnailColor: string;
  chapters: Chapter[];
}

export interface Catalog {
  steps: Step[];
  /** Prix de la formule complète (étapes 1 à 3) — à décider (Q3). */
  bundlePrice?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  /** Peut être une adresse relais Apple (privaterelay.appleid.com). */
  email: string;
  emailVerified: boolean;
  marketingOptIn: boolean;
  provider: 'apple' | 'google' | 'email';
}

export interface Consent {
  version: string;
  acceptedAt: string;
}
