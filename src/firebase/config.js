import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const env = import.meta.env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "test-api-key",

  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "test.firebaseapp.com",

  projectId: env.VITE_FIREBASE_PROJECT_ID || "test-project",

  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "test.appspot.com",

  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",

  appId: env.VITE_FIREBASE_APP_ID || "1:000000000000:web:test"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
