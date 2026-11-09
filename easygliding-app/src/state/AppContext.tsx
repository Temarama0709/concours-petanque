import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import i18n, { detectDeviceLanguage, isSupported, type Language } from '@/i18n';
import { LEGAL_VERSION } from '@/config/app';
import { backend } from '@/services/backend';
import { clearSession, loadSession, saveSession } from '@/services/auth';
import { setAnalyticsEnabled, track } from '@/services/analytics';
import { clearUserData, getItem, setItem } from '@/services/storage';
import type { Catalog, Consent, StepId, User } from '@/services/types';

export interface StepProgress {
  position: number;
  duration: number;
}

interface AppState {
  ready: boolean;
  language: Language;
  languageConfirmed: boolean;
  consent: Consent | null;
  user: User | null;
  /** Vrai tant que le déverrouillage biométrique n'a pas été fait. */
  locked: boolean;
  biometricEnabled: boolean;
  analyticsConsent: boolean;
  installedAt: string | null;
  catalog: Catalog | null;
  entitlements: StepId[];
  progress: Partial<Record<StepId, StepProgress>>;
}

interface AppActions {
  needsLegalAcceptance: boolean;
  isStepUnlocked: (id: StepId) => boolean;
  setLanguage: (lang: Language) => Promise<void>;
  confirmLanguage: () => Promise<void>;
  acceptLegal: () => Promise<void>;
  signIn: (user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  redeemCode: (code: string) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  saveProgress: (id: StepId, progress: StepProgress) => void;
  setBiometricEnabled: (value: boolean) => Promise<void>;
  setAnalyticsConsent: (value: boolean) => Promise<void>;
  unlock: () => void;
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

const USER_DATA_KEYS = ['progress', 'biometricEnabled'];

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    ready: false,
    language: detectDeviceLanguage(),
    languageConfirmed: false,
    consent: null,
    user: null,
    locked: false,
    biometricEnabled: false,
    analyticsConsent: false,
    installedAt: null,
    catalog: null,
    entitlements: [],
    progress: {},
  });

  const patch = useCallback((p: Partial<AppState>) => setState((s) => ({ ...s, ...p })), []);

  useEffect(() => {
    (async () => {
      const [lang, languageConfirmed, consent, user, biometricEnabled, analyticsConsent, installedAt, progress, catalog] =
        await Promise.all([
          getItem<string>('language'),
          getItem<boolean>('languageConfirmed'),
          getItem<Consent>('consent'),
          loadSession(),
          getItem<boolean>('biometricEnabled'),
          getItem<boolean>('analyticsConsent'),
          getItem<string>('installedAt'),
          getItem<AppState['progress']>('progress'),
          backend.getCatalog(),
        ]);

      const language = isSupported(lang) ? lang : detectDeviceLanguage();
      await i18n.changeLanguage(language);

      const firstInstall = installedAt ?? new Date().toISOString();
      if (!installedAt) await setItem('installedAt', firstInstall);

      setAnalyticsEnabled(!!analyticsConsent);
      const entitlements = user ? await backend.getEntitlements(user.id) : [];

      patch({
        ready: true,
        language,
        languageConfirmed: !!languageConfirmed,
        consent,
        user,
        biometricEnabled: !!biometricEnabled,
        locked: !!user && !!biometricEnabled,
        analyticsConsent: !!analyticsConsent,
        installedAt: firstInstall,
        progress: progress ?? {},
        catalog,
        entitlements,
      });
    })();
  }, [patch]);

  const actions = useMemo<AppActions>(
    () => ({
      needsLegalAcceptance: state.consent?.version !== LEGAL_VERSION,

      isStepUnlocked: (id) => {
        const step = state.catalog?.steps.find((s) => s.id === id);
        return !!step && (step.free || state.entitlements.includes(id));
      },

      // F01 : changement immédiat, sans redémarrage.
      setLanguage: async (language) => {
        await i18n.changeLanguage(language);
        await setItem('language', language);
        patch({ language });
      },

      confirmLanguage: async () => {
        await setItem('language', state.language);
        await setItem('languageConfirmed', true);
        patch({ languageConfirmed: true });
      },

      // F02 : preuve d'acceptation (date, heure, version) envoyée au serveur.
      acceptLegal: async () => {
        const consent: Consent = { version: LEGAL_VERSION, acceptedAt: new Date().toISOString() };
        await backend.recordConsent(state.user?.id ?? null, consent);
        await setItem('consent', consent);
        patch({ consent });
      },

      signIn: async (user) => {
        await saveSession(user);
        if (state.consent) await backend.recordConsent(user.id, state.consent);
        const entitlements = await backend.getEntitlements(user.id);
        patch({ user, entitlements, locked: false });
      },

      updateUser: async (user) => {
        const saved = await backend.updateUser(user);
        await saveSession(saved);
        patch({ user: saved });
      },

      signOut: async () => {
        await clearSession();
        await clearUserData(USER_DATA_KEYS);
        patch({ user: null, entitlements: [], progress: {}, biometricEnabled: false, locked: false });
      },

      // F03 : suppression effective du compte et des données.
      deleteAccount: async () => {
        if (state.user) await backend.deleteAccount(state.user.id);
        await clearSession();
        await clearUserData(USER_DATA_KEYS);
        patch({ user: null, entitlements: [], progress: {}, biometricEnabled: false, locked: false });
      },

      redeemCode: async (code) => {
        if (!state.user) return false;
        const entitlements = await backend.redeemCode(state.user.id, code);
        if (!entitlements) return false;
        await setItem('lastPurchaseAt', new Date().toISOString());
        entitlements.forEach((stepId) => track({ name: 'step_unlocked', stepId, channel: 'code' }));
        patch({ entitlements });
        return true;
      },

      // F06 : les droits viennent toujours du serveur.
      restorePurchases: async () => {
        if (!state.user) return;
        patch({ entitlements: await backend.getEntitlements(state.user.id) });
      },

      saveProgress: (id, progress) => {
        setState((s) => {
          const next = { ...s.progress, [id]: progress };
          void setItem('progress', next);
          return { ...s, progress: next };
        });
      },

      setBiometricEnabled: async (value) => {
        await setItem('biometricEnabled', value);
        patch({ biometricEnabled: value });
      },

      setAnalyticsConsent: async (value) => {
        setAnalyticsEnabled(value);
        await setItem('analyticsConsent', value);
        patch({ analyticsConsent: value });
      },

      unlock: () => patch({ locked: false }),
    }),
    [state, patch],
  );

  return <AppContext.Provider value={{ ...state, ...actions }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
