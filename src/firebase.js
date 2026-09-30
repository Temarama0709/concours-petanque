import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Ces clés sont publiques par nature (elles identifient le projet, elles ne
// donnent aucun droit). La sécurité repose sur les règles Firestore
// (voir firestore.rules) et sur Firebase Authentication.
const firebaseConfig = {
  apiKey: "AIzaSyA4-G44Gl2Et0twI_xq7TxGJIZWEPXHrUo",
  authDomain: "petanque-concours.firebaseapp.com",
  projectId: "petanque-concours",
  storageBucket: "petanque-concours.appspot.com",
  messagingSenderId: "648075631175",
  appId: "1:648075631175:web:812f2b919c8f6bf8a02f62",
  measurementId: "G-KG2Q0YRXM1"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
