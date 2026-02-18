import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCkcHAvXsPO-LCyjDhwfHwEMnxRGp7v4rY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "map-leads-e9238.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "map-leads-e9238",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "map-leads-e9238.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "683905672871",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:683905672871:web:3ae26dd943b377ffe51d82",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
