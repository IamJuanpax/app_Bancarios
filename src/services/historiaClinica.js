/**
 * ============================================================
 * SERVICIO DE HISTORIA CLÍNICA – Subcolección por paciente
 * ============================================================
 * 
 * Maneja la SUBCOLECCIÓN "historia_clinica" dentro de cada
 * documento de paciente en Firestore.
 * 
 * Estructura:
 *   pacientes/{pacienteId}/historia_clinica/{entradaId}
 *     ├── fecha:         Timestamp    (fecha de la visita)
 *     ├── medico:        string       (UID del médico)
 *     ├── medicoNombre:  string       (nombre desnormalizado)
 *     ├── nota:          string       (observaciones clínicas)
 *     ├── progreso:      string       (estado de avance)
 *     ├── turnoId:       string|null  (ID del turno vinculado, opcional)
 *     └── creadoEn:      Timestamp    (timestamp del servidor)
 * 
 * Ventajas de subcolección vs colección top-level:
 *   ✅ No necesita índice compuesto (ahorra en configuración)
 *   ✅ Query directa sin `where` (ahorra lecturas de Firestore)
 *   ✅ Datos organizados naturalmente por paciente
 *   ✅ Más eficiente en costos de lectura
 *   ✅ Eliminar un paciente puede eliminar su historia en cascada
 * 
 * Estrategia de costos (CONTEXT.md §2, §4):
 *   - Cada entrada es un documento separado (no arrays gigantes)
 *   - queries puntuales con getDocs (sin listeners en tiempo real)
 */

import { db } from './firebase';
import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';

/**
 * Obtiene la referencia a la subcolección de historia clínica de un paciente.
 * 
 * @param {string} pacienteId - ID del paciente
 * @returns {CollectionReference} Referencia a pacientes/{pacienteId}/historia_clinica
 */
const getHistoriaRef = (pacienteId) => {
    return collection(db, 'pacientes', pacienteId, 'historia_clinica');
};

/**
 * Obtiene todas las entradas de historia clínica de un paciente.
 * Se ordenan por fecha descendente (la más reciente primero).
 * 
 * Al usar subcolección, NO necesitamos un `where` por paciente_id,
 * ya que la subcolección solo contiene datos de ese paciente.
 * Esto ahorra un índice compuesto y reduce lecturas.
 * 
 * @param {string} pacienteId - ID del paciente
 * @returns {Promise<Array>} Lista de entradas de historia clínica
 */
export const getHistoriaByPaciente = async (pacienteId) => {
    const historiaRef = getHistoriaRef(pacienteId);
    const q = query(historiaRef, orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
    }));
};

/**
 * Obtiene una entrada específica de historia clínica.
 * 
 * @param {string} pacienteId - ID del paciente
 * @param {string} entradaId - ID de la entrada
 * @returns {Promise<object|null>} La entrada o null si no existe
 */
export const getEntradaById = async (pacienteId, entradaId) => {
    const docRef = doc(db, 'pacientes', pacienteId, 'historia_clinica', entradaId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
    }
    return null;
};

/**
 * Crea una nueva entrada de historia clínica para un paciente.
 * Cada visita médica genera una nueva entrada en la subcolección.
 * 
 * @param {object} data - Datos de la entrada
 * @param {string} data.paciente_id - ID del paciente
 * @param {string} data.medico - UID del médico que registra
 * @param {string} data.medicoNombre - Nombre legible del médico
 * @param {string} data.nota - Observaciones clínicas de la visita
 * @param {string} [data.progreso] - Estado de progreso del paciente
 * @param {string} [data.turnoId] - ID del turno vinculado (opcional)
 * @returns {Promise<DocumentReference>}
 */
export const createEntradaHistoria = async (data) => {
    const historiaRef = getHistoriaRef(data.paciente_id);
    return addDoc(historiaRef, {
        medico: data.medico,
        medicoNombre: data.medicoNombre || '',
        nota: data.nota,
        progreso: data.progreso || '',
        turnoId: data.turnoId || null,
        fecha: serverTimestamp(),
        creadoEn: serverTimestamp(),
    });
};

/**
 * Actualiza una entrada existente de historia clínica.
 * 
 * @param {string} pacienteId - ID del paciente
 * @param {string} entradaId - ID del documento de entrada
 * @param {object} data - Campos a actualizar (nota, progreso)
 * @returns {Promise<void>}
 */
export const updateEntradaHistoria = async (pacienteId, entradaId, data) => {
    const docRef = doc(db, 'pacientes', pacienteId, 'historia_clinica', entradaId);
    return updateDoc(docRef, {
        ...data,
        actualizadoEn: serverTimestamp(),
    });
};

/**
 * Elimina una entrada de historia clínica.
 * 
 * @param {string} pacienteId - ID del paciente
 * @param {string} entradaId - ID del documento
 * @returns {Promise<void>}
 */
export const deleteEntradaHistoria = async (pacienteId, entradaId) => {
    const docRef = doc(db, 'pacientes', pacienteId, 'historia_clinica', entradaId);
    return deleteDoc(docRef);
};

/**
 * Obtiene el conteo de entradas de historia clínica de un paciente.
 * Útil para mostrar estadísticas sin cargar todos los documentos.
 * 
 * @param {string} pacienteId - ID del paciente
 * @returns {Promise<number>} Cantidad de entradas
 */
export const getHistoriaCount = async (pacienteId) => {
    const historiaRef = getHistoriaRef(pacienteId);
    const snapshot = await getDocs(historiaRef);
    return snapshot.size;
};
