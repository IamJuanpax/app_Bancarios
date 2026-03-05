/**
 * ============================================================
 * SEED (alternativa simple) – Usa Firebase web SDK
 * ============================================================
 * 
 * Carga pacientes de prueba con direcciones REALES de Buenos Aires.
 * Las coordenadas se obtienen automáticamente via Nominatim (geocoding).
 * 
 * REQUISITO: Las reglas de Firestore deben permitir escritura
 * (temporalmente poné: allow read, write: if true; en las reglas)
 * 
 * USO:
 *   node scripts/seed-pacientes-web.mjs
 *     o
 *   npm run seed:web
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

// ── Credenciales ──
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

// ── Geocoding con Nominatim (OpenStreetMap, gratis) ──
async function geocode(direccion) {
    try {
        let query = direccion.trim();
        if (!query.toLowerCase().includes('argentina')) {
            query += ', Argentina';
        }

        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: '1',
            countrycodes: 'ar',
        });

        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: {
                'User-Agent': 'RehabMobile/1.0 (seed-script)',
                'Accept-Language': 'es',
            },
        });

        const results = await response.json();

        if (results && results.length > 0) {
            return {
                lat: parseFloat(results[0].lat),
                lng: parseFloat(results[0].lon),
            };
        }
        return { lat: 0, lng: 0 };
    } catch {
        return { lat: 0, lng: 0 };
    }
}

// ── Pacientes de Prueba ──
// Direcciones REALES de Buenos Aires.
// Las coordenadas se obtienen automáticamente via geocoding.
const PACIENTES_SEED = [
    // GRUPO 1: MICROCENTRO (cercanos entre sí, ~400m)
    { nombre: 'María García López', direccion: 'Av. Corrientes 1234, CABA', telefono: '11 2345-6789' },
    { nombre: 'Carlos Rodríguez', direccion: 'Av. 9 de Julio 1100, CABA', telefono: '11 3456-7890' },
    { nombre: 'Ana Martínez', direccion: 'Diagonal Norte 640, CABA', telefono: '11 4567-8901' },
    { nombre: 'Roberto Fernández', direccion: 'Lavalle 730, CABA', telefono: '11 5678-9012' },

    // GRUPO 2: PALERMO (~4-5km del Microcentro)
    { nombre: 'Lucía Pérez', direccion: 'Av. Santa Fe 3250, Palermo, CABA', telefono: '11 6789-0123' },
    { nombre: 'Diego Álvarez', direccion: 'Honduras 5500, Palermo, CABA', telefono: '11 7890-1234' },
    { nombre: 'Valentina Torres', direccion: 'Av. Del Libertador 4500, Palermo, CABA', telefono: '11 8901-2345' },

    // GRUPO 3: LA BOCA / BARRACAS (~3km del Microcentro)
    { nombre: 'Martín Romero', direccion: 'Caminito 35, La Boca, CABA', telefono: '11 9012-3456' },
    { nombre: 'Florencia Díaz', direccion: 'Av. Montes de Oca 800, Barracas, CABA', telefono: '11 0123-4567' },

    // GRUPO 4: CABALLITO (~5km del Microcentro)
    { nombre: 'Santiago Morales', direccion: 'Av. Rivadavia 5200, Caballito, CABA', telefono: '11 1234-5670' },
];

// ── Ejecutar ──
async function seed() {
    console.log('');
    console.log('🏥 RehabMobile – Seed de Pacientes');
    console.log('═══════════════════════════════════');
    console.log('');

    let count = 0;
    for (const paciente of PACIENTES_SEED) {
        try {
            // Geocodificar dirección
            console.log(`  🔍 Geocodificando: ${paciente.direccion}...`);
            const coordenadas = await geocode(paciente.direccion);

            // Esperar 1.1 segundos entre requests (política de Nominatim)
            await new Promise(r => setTimeout(r, 1100));

            const docRef = await addDoc(collection(db, 'pacientes'), {
                nombre: paciente.nombre,
                direccion: paciente.direccion,
                telefono: paciente.telefono,
                coordenadas,
                creadoPor: 'seed-script',
                creadoEn: Timestamp.now(),
                actualizadoEn: Timestamp.now(),
            });

            count++;
            const coordStr = coordenadas.lat !== 0
                ? `${coordenadas.lat.toFixed(4)}, ${coordenadas.lng.toFixed(4)}`
                : '⚠️ No encontrada';

            console.log(`  ✅ ${paciente.nombre} (${docRef.id})`);
            console.log(`     📍 ${paciente.direccion}`);
            console.log(`     🗺️  Coordenadas: ${coordStr}`);
            console.log('');
        } catch (error) {
            console.error(`  ❌ Error con ${paciente.nombre}:`, error.message);
        }
    }

    console.log('═══════════════════════════════════');
    console.log(`✅ ${count}/${PACIENTES_SEED.length} pacientes cargados!`);
    console.log('');
    console.log('🧪 Para testear:');
    console.log('   1. Abrí la app en tu celular');
    console.log('   2. Andá a Pacientes → tocá uno para ver su perfil');
    console.log('   3. Deberías ver el mapa con su ubicación');
    console.log('   4. Creá un turno y probá aceptar con GPS');
    console.log('');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
});
