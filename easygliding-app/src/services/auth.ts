import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import type { User } from './types';

/**
 * F03 — Compte utilisateur.
 *
 * Les appels marqués « TODO(Q6) » sont à brancher sur le service
 * d'authentification retenu (le même compte que sur uski.fr).
 * La version actuelle simule le serveur pour pouvoir dérouler le parcours.
 */

const SESSION_KEY = 'uski_session';

function makeId() {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function saveSession(user: User) {
  // TODO(Q6) : stocker le jeton de session renvoyé par le serveur, pas l'utilisateur.
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(user));
}

export async function loadSession(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function signUpWithEmail(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  marketingOptIn: boolean;
}): Promise<User> {
  // TODO(Q6) : création du compte + envoi du lien de confirmation d'e-mail.
  return {
    id: makeId(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    emailVerified: false,
    marketingOptIn: input.marketingOptIn,
    provider: 'email',
  };
}

export async function signInWithEmail(email: string, _password: string): Promise<User> {
  // TODO(Q6) : vérification du mot de passe côté serveur.
  return {
    id: makeId(),
    firstName: '',
    lastName: '',
    email: email.trim().toLowerCase(),
    emailVerified: true,
    marketingOptIn: false,
    provider: 'email',
  };
}

export async function sendMagicLink(_email: string): Promise<void> {
  // TODO(Q6) : envoi d'un lien de connexion (deep link uski://auth?token=…).
}

export async function sendPasswordReset(_email: string): Promise<void> {
  // TODO(Q6)
}

export async function isAppleSignInAvailable() {
  return Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync());
}

/**
 * Apple peut fournir une adresse relais (masquée) : elle est traitée
 * comme une adresse normale. Le nom et l'e-mail ne sont transmis par
 * Apple qu'à la toute première connexion : le serveur doit les conserver.
 */
export async function signInWithApple(): Promise<User> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  // TODO(Q6) : envoyer credential.identityToken au serveur pour vérification.
  return {
    id: credential.user,
    firstName: credential.fullName?.givenName ?? '',
    lastName: credential.fullName?.familyName ?? '',
    email: credential.email ?? '',
    emailVerified: true,
    marketingOptIn: false,
    provider: 'apple',
  };
}

export async function signInWithGoogle(): Promise<User> {
  // TODO(Q6) : brancher Google Sign-In (bibliothèque native ou fournisseur d'auth).
  throw new Error('Google Sign-In not configured yet');
}

// --- Déverrouillage biométrique (Face ID, empreinte…) ----------------------

export async function isBiometricAvailable() {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

export async function authenticateWithBiometrics(promptMessage: string) {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage });
  return result.success;
}
