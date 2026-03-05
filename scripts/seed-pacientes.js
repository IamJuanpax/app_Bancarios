/**
 * ============================================================
 * SEED SCRIPT – Carga pacientes de prueba en Firestore
 * ============================================================
 * 
 * Este script carga pacientes con direcciones REALES de Buenos Aires
 * y sus coordenadas GPS reales, para poder testear la validación
 * de proximidad (400 metros) con la fórmula de Haversine.
 * 
 * USO:
 *   node scripts/seed-pacientes.js
 * 
 * REQUISITO:
 *   Tener firebase-admin instalado (se instala con: npm install firebase-admin)
 *   Y tener un archivo serviceAccountKey.json en la carpeta scripts/
 *   (descargalo desde Firebase Console → Configuración → Cuentas de servicio)
 * 
 * ALTERNATIVA SIN firebase-admin:
 *   Si no querés instalar firebase-admin, podés usar la versión
 *   web de Firebase que ya tenés. Mirá la sección "Alternativa" abajo.
 */

// ─── CONFIGURACIÓN ───
// Usamos firebase-admin para escritura directa sin autenticación de usuario
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// ⚠️  IMPORTANTE: Descargá tu service account key desde:
// Firebase Console → ⚙ Configuración → Cuentas de servicio → Generar nueva clave privada
// Guardala como: scripts/serviceAccountKey.json
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

initializeApp({
    credential: cert(serviceAccount),
});

const db = getFirestore();

// ─── PACIENTES DE PRUEBA ───
// Direcciones REALES de Buenos Aires con coordenadas GPS reales.
// Agrupados por zona para facilitar el testing de proximidad.
//
// 🟢 GRUPO 1: Zona Microcentro (todos a menos de 400m entre sí)
//    → Si estás en Obelisco, deberías poder aceptar turnos de todos estos
//
// 🟡 GRUPO 2: Zona Palermo (a ~4km del Microcentro)
//    → Si estás en Microcentro, NO podrás aceptar estos
//
// 🔴 GRUPO 3: Zona La Boca / Barracas (a ~3km del Microcentro)
//    → Si estás en Microcentro, NO podrás aceptar estos

const PACIENTES_SEED = [
    // ══════════════════════════════════════════
    // GRUPO 1: MICROCENTRO – dentro de 400m del Obelisco
    // Obelisco coords: -34.6037, -58.3816
    // ══════════════════════════════════════════
    {
        nombre: 'María García López',
        direccion: 'Av. Corrientes 1234, CABA',
        coordenadas: { lat: -34.6040, lng: -58.3850 },
        telefono: '11 2345-6789',
        _grupo: 'Microcentro (~100m del Obelisco)',
    },
    {
        nombre: 'Carlos Rodríguez',
        direccion: 'Av. 9 de Julio 1100, CABA',
        coordenadas: { lat: -34.6042, lng: -58.3816 },
        telefono: '11 3456-7890',
        _grupo: 'Microcentro (~50m del Obelisco)',
    },
    {
        nombre: 'Ana Martínez',
        direccion: 'Diagonal Norte 640, CABA',
        coordenadas: { lat: -34.6050, lng: -58.3790 },
        telefono: '11 4567-8901',
        _grupo: 'Microcentro (~300m del Obelisco)',
    },
    {
        nombre: 'Roberto Fernández',
        direccion: 'Lavalle 730, CABA',
        coordenadas: { lat: -34.6025, lng: -58.3790 },
        telefono: '11 5678-9012',
        _grupo: 'Microcentro (~250m del Obelisco)',
    },

    // ══════════════════════════════════════════
    // GRUPO 2: PALERMO – a ~4km del Obelisco
    // ══════════════════════════════════════════
    {
        nombre: 'Lucía Pérez',
        direccion: 'Av. Santa Fe 3250, Palermo, CABA',
        coordenadas: { lat: -34.5875, lng: -58.4050 },
        telefono: '11 6789-0123',
        _grupo: 'Palermo (~4km del Obelisco)',
    },
    {
        nombre: 'Diego Álvarez',
        direccion: 'Honduras 5500, Palermo Soho, CABA',
        coordenadas: { lat: -34.5830, lng: -58.4290 },
        telefono: '11 7890-1234',
        _grupo: 'Palermo Soho (~5km del Obelisco)',
    },
    {
        nombre: 'Valentina Torres',
        direccion: 'Av. Del Libertador 4500, Palermo, CABA',
        coordenadas: { lat: -34.5720, lng: -58.4200 },
        telefono: '11 8901-2345',
        _grupo: 'Palermo (~5.5km del Obelisco)',
    },

    // ══════════════════════════════════════════
    // GRUPO 3: LA BOCA / BARRACAS – a ~3km del Obelisco
    // ══════════════════════════════════════════
    {
        nombre: 'Martín Romero',
        direccion: 'Caminito 35, La Boca, CABA',
        coordenadas: { lat: -34.6393, lng: -58.3634 },
        telefono: '11 9012-3456',
        _grupo: 'La Boca (~3.5km del Obelisco)',
    },
    {
        nombre: 'Florencia Díaz',
        direccion: 'Av. Montes de Oca 800, Barracas, CABA',
        coordenadas: { lat: -34.6350, lng: -58.3800 },
        telefono: '11 0123-4567',
        _grupo: 'Barracas (~3km del Obelisco)',
    },

    // ══════════════════════════════════════════
    // GRUPO 4: CABALLITO / FLORES – a ~5km del Obelisco
    // ══════════════════════════════════════════
    {
        nombre: 'Santiago Morales',
        direccion: 'Av. Rivadavia 5200, Caballito, CABA',
        coordenadas: { lat: -34.6180, lng: -58.4360 },
        telefono: '11 1234-5670',
        _grupo: 'Caballito (~5km del Obelisco)',
    },
];


// ─── FUNCIÓN PRINCIPAL ───
async function seedPacientes() {
    console.log('');
    console.log('🏥 RehabMobile – Seed de Pacientes de Prueba');
    console.log('═══════════════════════════════════════════════');
    console.log('');

    const batch = db.batch();
    let count = 0;

    for (const paciente of PACIENTES_SEED) {
        const grupo = paciente._grupo;
        const { _grupo, ...data } = paciente; // Quitar el campo _grupo

        const docRef = db.collection('pacientes').doc();
        batch.set(docRef, {
            ...data,
            creadoPor: 'seed-script',
            creadoEn: Timestamp.now(),
            actualizadoEn: Timestamp.now(),
        });

        count++;
        console.log(`  ✅ ${data.nombre}`);
        console.log(`     📍 ${data.direccion}`);
        console.log(`     🗺️  Lat: ${data.coordenadas.lat}, Lng: ${data.coordenadas.lng}`);
        console.log(`     📦 Grupo: ${grupo}`);
        console.log('');
    }

    await batch.commit();

    console.log('═══════════════════════════════════════════════');
    console.log(`✅ ${count} pacientes cargados exitosamente!`);
    console.log('');
    console.log('📋 Resumen de grupos para testing:');
    console.log('');
    console.log('  🟢 MICROCENTRO (4 pacientes):');
    console.log('     Si estás cerca del Obelisco → PODRÁS aceptar sus turnos');
    console.log('');
    console.log('  🟡 PALERMO (3 pacientes):');
    console.log('     Si estás en Microcentro → NO podrás aceptar sus turnos');
    console.log('');
    console.log('  🔴 LA BOCA (2 pacientes):');
    console.log('     Si estás en Microcentro → NO podrás aceptar sus turnos');
    console.log('');
    console.log('  🔵 CABALLITO (1 paciente):');
    console.log('     Si estás en Microcentro → NO podrás aceptar sus turnos');
    console.log('');
    process.exit(0);
}

seedPacientes().catch((error) => {
    console.error('❌ Error al ejecutar seed:', error);
    process.exit(1);
});
