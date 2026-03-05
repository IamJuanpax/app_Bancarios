/**
 * ============================================================
 * SEED SCRIPT – Carga pacientes de prueba en Firestore
 * ============================================================
 *
 * Carga pacientes con direcciones REALES de Buenos Aires.
 * Las coordenadas se obtienen via Nominatim (geocoding gratis).
 *
 * USO:
 *   npm run seed
 *
 * REQUISITO:
 *   - npm install firebase-admin
 *   - Archivo scripts/serviceAccountKey.json
 *     (Firebase Console → Configuración → Cuentas de servicio → Generar clave)
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// ── Service Account Key ──
let serviceAccount;
try {
    serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
    console.error('❌ No se encontró scripts/serviceAccountKey.json');
    console.error('');
    console.error('Para obtener este archivo:');
    console.error('1. Andá a https://console.firebase.google.com/');
    console.error('2. Seleccioná tu proyecto "rehabmobile-69cd4"');
    console.error('3. Hacé clic en ⚙ (Configuración del proyecto)');
    console.error('4. Pestaña "Cuentas de servicio"');
    console.error('5. Botón "Generar nueva clave privada"');
    console.error('6. Guardá el archivo como: scripts/serviceAccountKey.json');
    console.error('');
    console.error('⚠️  NUNCA subas este archivo a Git (ya está en .gitignore)');
    process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Geocoding con Nominatim (gratis) ──
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
            return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
        }
        return { lat: 0, lng: 0 };
    } catch {
        return { lat: 0, lng: 0 };
    }
}

// ── Pacientes de Prueba ──
const PACIENTES_SEED = [
    // MICROCENTRO
    { nombre: 'María García López', direccion: 'Av. Corrientes 1234, CABA', telefono: '11 2345-6789' },
    { nombre: 'Carlos Rodríguez', direccion: 'Av. 9 de Julio 1100, CABA', telefono: '11 3456-7890' },
    { nombre: 'Ana Martínez', direccion: 'Diagonal Norte 640, CABA', telefono: '11 4567-8901' },
    { nombre: 'Roberto Fernández', direccion: 'Lavalle 730, CABA', telefono: '11 5678-9012' },
    // PALERMO
    { nombre: 'Lucía Pérez', direccion: 'Av. Santa Fe 3250, Palermo, CABA', telefono: '11 6789-0123' },
    { nombre: 'Diego Álvarez', direccion: 'Honduras 5500, Palermo, CABA', telefono: '11 7890-1234' },
    { nombre: 'Valentina Torres', direccion: 'Av. Del Libertador 4500, Palermo, CABA', telefono: '11 8901-2345' },
    // LA BOCA / BARRACAS
    { nombre: 'Martín Romero', direccion: 'Caminito 35, La Boca, CABA', telefono: '11 9012-3456' },
    { nombre: 'Florencia Díaz', direccion: 'Av. Montes de Oca 800, Barracas, CABA', telefono: '11 0123-4567' },
    // CABALLITO
    { nombre: 'Santiago Morales', direccion: 'Av. Rivadavia 5200, Caballito, CABA', telefono: '11 1234-5670' },
];

// ── Ejecutar ──
async function seedPacientes() {
    console.log('');
    console.log('🏥 RehabMobile – Seed de Pacientes');
    console.log('═══════════════════════════════════');
    console.log('');

    let count = 0;
    for (const paciente of PACIENTES_SEED) {
        console.log(`  🔍 Geocodificando: ${paciente.direccion}...`);
        const coordenadas = await geocode(paciente.direccion);

        // Esperar 1.1s entre requests (política de Nominatim)
        await new Promise(r => setTimeout(r, 1100));

        const docRef = db.collection('pacientes').doc();
        await docRef.set({
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

        console.log(`  ✅ ${paciente.nombre}`);
        console.log(`     📍 ${paciente.direccion}`);
        console.log(`     🗺️  Coordenadas: ${coordStr}`);
        console.log('');
    }

    console.log('═══════════════════════════════════');
    console.log(`✅ ${count} pacientes cargados!`);
    console.log('');
    process.exit(0);
}

seedPacientes().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
});
