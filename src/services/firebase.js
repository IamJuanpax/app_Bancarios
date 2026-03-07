/**
 * ============================================================
 * FIREBASE SERVICE – Configuración y exportación de servicios
 * ============================================================
 * 
 * Inicializa Firebase con las credenciales del proyecto.
 * Exporta las instancias de:
 *   - auth: Firebase Authentication (login con email/password)
 *   - db:   Firestore (base de datos NoSQL con modo offline)
 * 
 * Stack usado:
 *   - Firebase Auth (autenticación con persistencia local)
 *   - Firestore (con persistentLocalCache para modo offline)
 */

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
} from '@env';

// ── Configuración de Firebase ──
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID,
};

// Inicializar la app de Firebase
const app = initializeApp(firebaseConfig);

/**
 * Inicializar Firebase Auth con persistencia en AsyncStorage.
 * Mantiene la sesión iniciada entre reinicios de la app.
 */
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

/**
 * Inicializar Firestore con MODO OFFLINE habilitado.
 * Permite que el médico vea y cargue datos aunque no tenga señal.
 * Los cambios se sincronizan automáticamente al recuperar internet.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export default app;
