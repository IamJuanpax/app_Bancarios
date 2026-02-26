/**
 * ============================================================
 * FIREBASE SERVICE – Configuración y exportación de servicios
 * ============================================================
 * 
 * Inicializa Firebase con las credenciales del proyecto.
 * Exporta las instancias de:
 *   - auth: Firebase Authentication (login con email/password)
 *   - db:   Firestore (base de datos NoSQL)
 * 
 * IMPORTANTE: Antes de usar la app en producción, reemplazá
 * los valores de firebaseConfig con las credenciales reales
 * de tu proyecto en la consola de Firebase:
 * https://console.firebase.google.com/
 * 
 * Stack usado:
 *   - Firebase Auth (autenticación, CONTEXT.md §2)
 *   - Firestore (base de datos, CONTEXT.md §2)
 *   - Firebase Cloud Messaging se configura en otro archivo (notificaciones)
 * 
 * Estrategia de costos (CONTEXT.md §2):
 *   - Se usa el plan gratuito (Spark Plan) inicialmente
 *   - Se evitan listeners en tiempo real (onSnapshot)
 *   - Se usan consultas puntuales (getDocs/getDoc)
 */

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Configuración de Firebase ──
// TODO: Reemplazar con las credenciales reales de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Inicializar la app de Firebase
const app = initializeApp(firebaseConfig);

/**
 * Inicializar Firebase Auth con persistencia en AsyncStorage.
 * Esto permite que la sesión del usuario se mantenga entre 
 * reinicios de la app (no necesita re-loguearse cada vez).
 */
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

/**
 * Inicializar Firestore.
 * Usamos Firestore como base de datos principal para:
 *   - Pacientes
 *   - Historia Clínica
 *   - Turnos
 *   - Usuarios (roles)
 */
export const db = getFirestore(app);

export default app;
