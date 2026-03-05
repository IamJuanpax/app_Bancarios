/**
 * ============================================================
 * MIGRACIÓN: historia_clinica → subcolecciones
 * ============================================================
 * 
 * Este script migra los datos de la colección global "historia_clinica"
 * a subcolecciones dentro de cada paciente:
 * 
 *   ANTES: historia_clinica/{entradaId}  (con campo paciente_id)
 *   DESPUÉS: pacientes/{pacienteId}/historia_clinica/{entradaId}
 * 
 * El script:
 *   1. Lee TODAS las entradas de la colección vieja
 *   2. Las agrupa por paciente_id
 *   3. Crea cada entrada como documento en la subcolección del paciente
 *   4. (Opcional) Elimina los documentos de la colección vieja
 * 
 * REQUISITO: Las reglas de Firestore deben permitir escritura
 * 
 * USO:
 *   node scripts/migrate-historia.mjs
 *     o
 *   npm run migrate:historia
 */

import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
} from 'firebase/firestore';

// ── Credenciales (mismas que seed-pacientes-web.mjs) ──
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

// ── Configuración ──
const DELETE_OLD = true;  // ¿Eliminar los datos de la colección vieja después de migrar?

async function migrate() {
    console.log('');
    console.log('🔄 RehabMobile – Migración de Historia Clínica');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('  📁 Origen:  historia_clinica/ (colección global)');
    console.log('  📁 Destino: pacientes/{id}/historia_clinica/ (subcolección)');
    console.log('');

    // 1. Leer TODAS las entradas de la colección vieja
    console.log('  📖 Leyendo entradas de la colección vieja...');
    const oldRef = collection(db, 'historia_clinica');
    const snapshot = await getDocs(oldRef);

    if (snapshot.empty) {
        console.log('');
        console.log('  ℹ️  No hay entradas en la colección "historia_clinica".');
        console.log('  ✅ No hay nada que migrar. ¡Todo listo!');
        console.log('');
        process.exit(0);
    }

    console.log(`  📄 Encontradas: ${snapshot.size} entradas`);
    console.log('');

    // 2. Agrupar por paciente_id
    const porPaciente = {};
    snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const pacienteId = data.paciente_id;

        if (!pacienteId) {
            console.log(`  ⚠️  Entrada ${docSnap.id} sin paciente_id, se omite.`);
            return;
        }

        if (!porPaciente[pacienteId]) {
            porPaciente[pacienteId] = [];
        }
        porPaciente[pacienteId].push({
            oldDocId: docSnap.id,
            data: data,
        });
    });

    const totalPacientes = Object.keys(porPaciente).length;
    console.log(`  👥 Pacientes con historia: ${totalPacientes}`);
    console.log('');

    // 3. Migrar cada entrada a la subcolección del paciente
    let migrated = 0;
    let errors = 0;

    for (const [pacienteId, entradas] of Object.entries(porPaciente)) {
        console.log(`  🏥 Paciente: ${pacienteId} (${entradas.length} entradas)`);

        for (const entrada of entradas) {
            try {
                // Crear en la subcolección (sin el campo paciente_id, ya no es necesario)
                const { paciente_id, ...dataSinPacienteId } = entrada.data;

                const subColRef = collection(db, 'pacientes', pacienteId, 'historia_clinica');
                const newDocRef = await addDoc(subColRef, {
                    ...dataSinPacienteId,
                    turnoId: dataSinPacienteId.turnoId || null,  // Asegurar campo turnoId
                });

                console.log(`     ✅ ${entrada.oldDocId} → ${newDocRef.id}`);
                migrated++;

                // 4. (Opcional) Eliminar el documento viejo
                if (DELETE_OLD) {
                    const oldDocRef = doc(db, 'historia_clinica', entrada.oldDocId);
                    await deleteDoc(oldDocRef);
                    console.log(`     🗑️  Eliminado de colección vieja`);
                }
            } catch (error) {
                console.error(`     ❌ Error migrando ${entrada.oldDocId}:`, error.message);
                errors++;
            }
        }
        console.log('');
    }

    // Resumen
    console.log('═══════════════════════════════════════════════');
    console.log(`  ✅ Migradas: ${migrated} entradas`);
    if (errors > 0) {
        console.log(`  ❌ Errores:  ${errors} entradas`);
    }
    if (DELETE_OLD) {
        console.log(`  🗑️  Colección vieja limpiada`);
    } else {
        console.log(`  ℹ️  Los datos viejos se mantuvieron (DELETE_OLD = false)`);
    }
    console.log('');
    console.log('  🎉 ¡Migración completada!');
    console.log('  La app ahora leerá las entradas desde las subcolecciones.');
    console.log('');
    process.exit(0);
}

migrate().catch((err) => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
