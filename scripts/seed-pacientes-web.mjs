/**
 * ============================================================
 * SEED (alternativa simple) – Usa Firebase web SDK
 * ============================================================
 * 
 * Esta versión NO necesita firebase-admin ni serviceAccountKey.json.
 * Usa directamente el Firebase web SDK que ya tenés instalado.
 * 
 * REQUISITO: Las reglas de Firestore deben permitir escritura
 * (temporalmente poné: allow read, write: if true; en las reglas)
 * 
 * USO:
 *   node scripts/seed-pacientes-web.mjs
 * 
 * NOTA: Usamos .mjs (ES modules) porque Firebase web SDK usa imports.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// ── Credenciales (las mismas que en tu .env) ──
const firebaseConfig = {
    apiKey: 'AIzaSyDhzDv8G8TQFpGOXnq5iCHNe5G5HihA5qI',
    authDomain: 'rehabmobile-69cd4.firebaseapp.com',
    projectId: 'rehabmobile-69cd4',
    storageBucket: 'rehabmobile-69cd4.firebasestorage.app',
    messagingSenderId: '567956905340',
    appId: '1:567956905340:web:9d6be04a1db5ae7ce9d8f9',
    measurementId: 'G-RMTTDJFVJG',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── PACIENTES DE PRUEBA ───
// Direcciones REALES de Buenos Aires con coordenadas GPS reales.
//
// 🟢 GRUPO 1: Microcentro (todos a menos de 400m entre sí, cercanos al Obelisco)
// 🟡 GRUPO 2: Palermo (~4-5km del Microcentro)  
// 🔴 GRUPO 3: La Boca / Barracas (~3km del Microcentro)
// 🔵 GRUPO 4: Caballito (~5km del Microcentro)

const PACIENTES_SEED = [
    // ══════╗ GRUPO 1: MICROCENTRO ══════
    {
        nombre: 'María García López',
        direccion: 'Av. Corrientes 1234, CABA',
        coordenadas: { lat: -34.6040, lng: -58.3850 },
        telefono: '11 2345-6789',
    },
    {
        nombre: 'Carlos Rodríguez',
        direccion: 'Av. 9 de Julio 1100, CABA',
        coordenadas: { lat: -34.6042, lng: -58.3816 },
        telefono: '11 3456-7890',
    },
    {
        nombre: 'Ana Martínez',
        direccion: 'Diagonal Norte 640, CABA',
        coordenadas: { lat: -34.6050, lng: -58.3790 },
        telefono: '11 4567-8901',
    },
    {
        nombre: 'Roberto Fernández',
        direccion: 'Lavalle 730, CABA',
        coordenadas: { lat: -34.6025, lng: -58.3790 },
        telefono: '11 5678-9012',
    },

    // ══════ GRUPO 2: PALERMO ══════
    {
        nombre: 'Lucía Pérez',
        direccion: 'Av. Santa Fe 3250, Palermo, CABA',
        coordenadas: { lat: -34.5875, lng: -58.4050 },
        telefono: '11 6789-0123',
    },
    {
        nombre: 'Diego Álvarez',
        direccion: 'Honduras 5500, Palermo Soho, CABA',
        coordenadas: { lat: -34.5830, lng: -58.4290 },
        telefono: '11 7890-1234',
    },
    {
        nombre: 'Valentina Torres',
        direccion: 'Av. Del Libertador 4500, Palermo, CABA',
        coordenadas: { lat: -34.5720, lng: -58.4200 },
        telefono: '11 8901-2345',
    },

    // ══════ GRUPO 3: LA BOCA / BARRACAS ══════
    {
        nombre: 'Martín Romero',
        direccion: 'Caminito 35, La Boca, CABA',
        coordenadas: { lat: -34.6393, lng: -58.3634 },
        telefono: '11 9012-3456',
    },
    {
        nombre: 'Florencia Díaz',
        direccion: 'Av. Montes de Oca 800, Barracas, CABA',
        coordenadas: { lat: -34.6350, lng: -58.3800 },
        telefono: '11 0123-4567',
    },

    // ══════ GRUPO 4: CABALLITO ══════
    {
        nombre: 'Santiago Morales',
        direccion: 'Av. Rivadavia 5200, Caballito, CABA',
        coordenadas: { lat: -34.6180, lng: -58.4360 },
        telefono: '11 1234-5670',
    },
];

// ─── EJECUTAR ───
async function seed() {
    console.log('');
    console.log('🏥 RehabMobile – Seed de Pacientes');
    console.log('═══════════════════════════════════');
    console.log('');

    let count = 0;
    for (const paciente of PACIENTES_SEED) {
        try {
            const docRef = await addDoc(collection(db, 'pacientes'), {
                ...paciente,
                creadoPor: 'seed-script',
                creadoEn: Timestamp.now(),
                actualizadoEn: Timestamp.now(),
            });
            count++;
            console.log(`  ✅ ${paciente.nombre} (${docRef.id})`);
            console.log(`     📍 ${paciente.direccion}`);
            console.log(`     🗺️  ${paciente.coordenadas.lat}, ${paciente.coordenadas.lng}`);
            console.log('');
        } catch (error) {
            console.error(`  ❌ Error con ${paciente.nombre}:`, error.message);
        }
    }

    console.log('═══════════════════════════════════');
    console.log(`✅ ${count}/${PACIENTES_SEED.length} pacientes cargados!`);
    console.log('');
    console.log('🧪 Para testear la proximidad:');
    console.log('   1. Abrí la app en tu celular');
    console.log('   2. Creá un turno para un paciente del GRUPO 1 (Microcentro)');
    console.log('   3. Si estás cerca del Obelisco → podrás aceptar el turno');
    console.log('   4. Creá un turno para un paciente de Palermo');
    console.log('   5. Si estás en Microcentro → NO podrás aceptar el turno');
    console.log('');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
});
