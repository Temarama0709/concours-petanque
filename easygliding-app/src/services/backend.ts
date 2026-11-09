import type { Catalog, Consent, StepId, User } from './types';
import { getItem, setItem } from './storage';

/**
 * Contrat entre l'appli et le serveur EasyGliding.
 *
 * Le choix du prestataire (authentification, hébergeur vidéo, back-office)
 * est encore ouvert (Q6). L'appli ne dépend que de cette interface :
 * brancher le vrai serveur revient à fournir une autre implémentation
 * de `Backend` et à la renvoyer depuis `backend` en bas de fichier.
 *
 * Règles imposées par le cahier des charges :
 * - les droits d'accès sont stockés et confirmés côté serveur (webhook du
 *   prestataire de paiement), jamais décidés par l'appli seule (F06) ;
 * - l'acceptation des textes est enregistrée côté serveur avec date, heure
 *   et version (F02) ;
 * - les vidéos payantes sont servies par liens temporaires signés (F07).
 */
export interface Backend {
  getCatalog(): Promise<Catalog>;
  recordConsent(userId: string | null, consent: Consent): Promise<void>;
  getEntitlements(userId: string): Promise<StepId[]>;
  redeemCode(userId: string, code: string): Promise<StepId[] | null>;
  /** Lien de lecture signé et temporaire. */
  getPlaybackUrl(userId: string | null, stepId: StepId): Promise<string>;
  updateUser(user: User): Promise<User>;
  deleteAccount(userId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Implémentation de démonstration (données locales) — à remplacer.
// ---------------------------------------------------------------------------

const DEMO_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const DEMO_CATALOG: Catalog = {
  bundlePrice: '24,90 €',
  steps: [
    {
      id: 'setup',
      free: true,
      durationMinutes: 6,
      thumbnailColor: '#4FA3E3',
      chapters: [
        { time: 0, label: { fr: 'Contenu de la boîte', en: 'What is in the box' } },
        { time: 60, label: { fr: 'Fixer le dispositif', en: 'Attaching the device' } },
        { time: 150, label: { fr: 'Régler la hauteur', en: 'Adjusting the height' } },
        { time: 240, label: { fr: 'Tester le décrochage magnétique', en: 'Testing the magnetic release' } },
      ],
    },
    {
      id: 'step1',
      free: false,
      price: '9,90 €',
      durationMinutes: 8,
      thumbnailColor: '#2E7D5B',
      chapters: [
        { time: 0, label: { fr: 'Position de départ', en: 'Starting position' } },
        { time: 90, label: { fr: 'Première glisse', en: 'First glide' } },
        { time: 210, label: { fr: "S'arrêter", en: 'Stopping' } },
      ],
    },
    {
      id: 'step2',
      free: false,
      price: '9,90 €',
      durationMinutes: 9,
      thumbnailColor: '#B5651D',
      chapters: [
        { time: 0, label: { fr: 'Transfert du poids', en: 'Weight transfer' } },
        { time: 120, label: { fr: 'Premiers virages', en: 'First turns' } },
        { time: 300, label: { fr: 'Enchaîner', en: 'Linking turns' } },
      ],
    },
    {
      id: 'step3',
      free: false,
      price: '9,90 €',
      durationMinutes: 10,
      thumbnailColor: '#6A3FA0',
      chapters: [
        { time: 0, label: { fr: "Réduire l'aide", en: 'Reducing assistance' } },
        { time: 180, label: { fr: 'Glisser seul', en: 'Gliding alone' } },
        { time: 360, label: { fr: 'Et après ?', en: 'What next?' } },
      ],
    },
  ],
};

/** Codes d'activation de démonstration (boîte uSki / magasin de location). */
const DEMO_CODES: Record<string, StepId[]> = {
  'USKI-DEMO': ['step1', 'step2', 'step3'],
  'USKI-STEP1': ['step1'],
};

const entitlementsKey = (userId: string) => `demo:entitlements:${userId}`;

const demoBackend: Backend = {
  async getCatalog() {
    return DEMO_CATALOG;
  },
  async recordConsent(userId, consent) {
    await setItem('demo:consentLog', { userId, ...consent });
  },
  async getEntitlements(userId) {
    return (await getItem<StepId[]>(entitlementsKey(userId))) ?? [];
  },
  async redeemCode(userId, code) {
    const steps = DEMO_CODES[code.trim().toUpperCase()];
    if (!steps) return null;
    const current = (await getItem<StepId[]>(entitlementsKey(userId))) ?? [];
    const next = Array.from(new Set([...current, ...steps]));
    await setItem(entitlementsKey(userId), next);
    return next;
  },
  async getPlaybackUrl() {
    return DEMO_VIDEO;
  },
  async updateUser(user) {
    return user;
  },
  async deleteAccount(userId) {
    await setItem(entitlementsKey(userId), []);
  },
};

export const backend: Backend = demoBackend;
