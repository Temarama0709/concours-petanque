// src/utils/firebase.js

import { initializeApp, getApps, getApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Ton config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA4-G44Gl2Et0twI_xq7TxGJIZWEPXHrUo",
  authDomain: "petanque-concours.firebaseapp.com",
  projectId: "petanque-concours",
  storageBucket: "petanque-concours.appspot.com",
  messagingSenderId: "648075631175",
  appId: "1:648075631175:web:812f2b919c8f6bf8a02f62",
  measurementId: "G-KG2Q0YRXM1"
};

// Initialisation sécurisée
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Services Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);

// Tests en local sans toucher la vraie base : REACT_APP_FIRESTORE_EMULATOR=127.0.0.1:8080 npm start
// (avec « npx firebase-tools emulators:start --only firestore » lancé à côté)
if (process.env.REACT_APP_FIRESTORE_EMULATOR) {
  const [host, port] = process.env.REACT_APP_FIRESTORE_EMULATOR.split(":");
  connectFirestoreEmulator(db, host, Number(port));
}
