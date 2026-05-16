import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyA-Kp-ba58TYuyIyBybwP6DOc-SM7l4Bd4",
  authDomain: "coursat-web99.firebaseapp.com",
  projectId: "coursat-web99",
  storageBucket: "coursat-web99.firebasestorage.app",
  messagingSenderId: "4390308514",
  appId: "1:4390308514:web:03e283d7dfcf4ae6fa65fb",
  measurementId: "G-ESGN9NZ1FM"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
