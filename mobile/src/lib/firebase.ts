import { getApp, getApps, initializeApp } from "firebase/app";
import * as firebaseAuth from "firebase/auth";
import { getAuth, initializeAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Existe em runtime na build React Native, mas não nos tipos publicados
const getReactNativePersistence = (firebaseAuth as any)
  .getReactNativePersistence as (storage: typeof AsyncStorage) => any;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/**
 * O app é offline-first: sem as variáveis EXPO_PUBLIC_FIREBASE_*, ele abre e
 * opera somente com o SQLite local. Isso evita que uma chave vazia derrube a
 * inicialização do Expo Go durante o desenvolvimento ou o primeiro uso.
 */
export const firebaseConfigurado = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
].every((valor) => typeof valor === "string" && valor.trim().length > 0);

const app = firebaseConfigurado
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

function createAuth(): Auth {
  if (!app) {
    return {
      currentUser: null,
      authStateReady: async () => undefined,
    } as unknown as Auth;
  }
  if (Platform.OS === "web") {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = (app ? getFirestore(app) : {}) as Firestore;