import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, initializeAuth, type Auth } from 'firebase/auth';
// Existe só na build React Native do Firebase (o Metro resolve em tempo de execução); os tipos da web não a declaram.
// @ts-expect-error TS2305: exportação ausente nos tipos da web
import { getReactNativePersistence } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** RNF30: desenvolvimento e testes usam o Emulator Suite. No Expo Go em aparelho físico, use o IP da máquina. */
const usarEmulador = process.env.EXPO_PUBLIC_USE_EMULATOR === 'true';
const hostEmulador = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? 'localhost';

const app = getApps().length ? getApp() : initializeApp(config);

function criarAuth(): Auth {
  try {
    // Persiste a sessão no aparelho: uma sessão já iniciada continua válida após fechar o app.
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app); // já inicializado (fast refresh)
  }
}

export const auth = criarAuth();
export const db = getFirestore(app);

const g = globalThis as { __unicashEmuConectado?: boolean };
if (usarEmulador && !g.__unicashEmuConectado) {
  connectAuthEmulator(auth, `http://${hostEmulador}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, hostEmulador, 8080);
  g.__unicashEmuConectado = true;
}
