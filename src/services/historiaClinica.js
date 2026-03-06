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
 * 
 * SEGURIDAD:
 *   - Validación de datos de entrada antes de escribir
 *   - Whitelist de campos permitidos en updates
 *   - Límite de tamaño en notas clínicas
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

// ── Campos permitidos para update (whitelist) ──
const ALLOWED_UPDATE_FIELDS = ['nota', 'progreso'];

// ── Límites de tamaño ──
const MAX_NOTA_LENGTH = 10000;  // 10k caracteres para notas clínicas
const MAX_PROGRESO_LENGTH = 500;

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
    if (!pacienteId || typeof pacienteId !== 'string') {
        throw new Error('ID de paciente inválido.');
    }

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
    if (!pacienteId || !entradaId) return null;

    const docRef = doc(db, 'pacientes', pacienteId, 'historia_clinica', entradaId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
    }
    return null;
};

/**
 * Valida los datos de una entrada de historia clínica.
 * 
 * @param {object} data - Datos a validar
 * @param {boolean} isCreate - true si es creación
 * @throws {Error} Si los datos no son válidos
 */
const validateHistoriaData = (data, isCreate = true) => {
    // En creación, paciente_id y nota son requeridos
    if (isCreate) {
        if (!data.paciente_id || typeof data.paciente_id !== 'string') {
            throw new Error('El ID del paciente es requerido.');
        }
        if (!data.nota || typeof data.nota !== 'string') {
            throw new Error('La nota clínica es requerida.');
        }
        if (!data.medico || typeof data.medico !== 'string') {
            throw new Error('El ID del médico es requerido.');
        }
    }

    // Validar longitud de nota
    if (data.nota !== undefined) {
        if (typeof data.nota !== 'string') {
            throw new Error('La nota debe ser un texto.');
        }
        const nota = data.nota.trim();
        if (isCreate && nota.length < 1) {
            throw new Error('La nota clínica no puede estar vacía.');
        }
        if (nota.length > MAX_NOTA_LENGTH) {
            throw new Error(`La nota es demasiado larga (máximo ${MAX_NOTA_LENGTH} caracteres).`);
        }
    }

    // Validar longitud de progreso
    if (data.progreso !== undefined && data.progreso !== '') {
        if (typeof data.progreso !== 'string') {
            throw new Error('El progreso debe ser un texto.');
        }
        if (data.progreso.length > MAX_PROGRESO_LENGTH) {
            throw new Error(`El progreso es demasiado largo (máximo ${MAX_PROGRESO_LENGTH} caracteres).`);
        }
    }
};

/**
 * Crea una nueva entrada de historia clínica para un paciente.
 * Cada visita médica genera una nueva entrada en la subcolección.
 * Valida los datos antes de guardar.
 * 
 * @param {object} data - Datos de la entrada
 * @param {string} data.paciente_id - ID del paciente
 * @param {string} data.medico - UID del médico que registra
 * @param {string} data.medicoNombre - Nombre legible del médico
 * @param {string} data.nota - Observaciones clínicas de la visita
 * @param {string} [data.progreso] - Estado de progreso del paciente
 * @param {string} [data.turnoId] - ID del turno vinculado (opcional)
 * @returns {Promise<DocumentReference>}
 * @throws {Error} Si los datos no pasan la validación
 */
export const createEntradaHistoria = async (data) => {
    // Validar datos de entrada
    validateHistoriaData(data, true);

    const historiaRef = getHistoriaRef(data.paciente_id);
    return addDoc(historiaRef, {
        medico: data.medico,
        medicoNombre: data.medicoNombre ? data.medicoNombre.trim() : '',
        nota: data.nota.trim(),
        progreso: data.progreso ? data.progreso.trim() : '',
        turnoId: data.turnoId || null,
        fecha: serverTimestamp(),
        creadoEn: serverTimestamp(),
    });
};

/**
 * Actualiza una entrada existente de historia clínica.
 * Solo permite modificar campos de la whitelist (nota y progreso).
 * Campos como 'medico', 'fecha', 'creadoEn' NO pueden ser modificados.
 * 
 * @param {string} pacienteId - ID del paciente
 * @param {string} entradaId - ID del documento de entrada
 * @param {object} data - Campos a actualizar (solo 'nota' y 'progreso')
 * @returns {Promise<void>}
 * @throws {Error} Si los datos no pasan la validación
 */
export const updateEntradaHistoria = async (pacienteId, entradaId, data) => {
    if (!pacienteId || !entradaId) {
        throw new Error('IDs de paciente y entrada son requeridos.');
    }

    // Validar datos de entrada
    validateHistoriaData(data, false);

    // Filtrar solo campos permitidos (whitelist)
    const sanitized = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
        if (data[key] !== undefined) {
            sanitized[key] = typeof data[key] === 'string' ? data[key].trim() : data[key];
        }
    }

    if (Object.keys(sanitized).length === 0) {
        throw new Error('No se proporcionaron campos válidos para actualizar.');
    }

    const docRef = doc(db, 'pacientes', pacienteId, 'historia_clinica', entradaId);
    return updateDoc(docRef, {
        ...sanitized,
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
    if (!pacienteId || !entradaId) {
        throw new Error('IDs de paciente y entrada son requeridos.');
    }

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
    if (!pacienteId || typeof pacienteId !== 'string') return 0;

    const historiaRef = getHistoriaRef(pacienteId);
    const snapshot = await getDocs(historiaRef);
    return snapshot.size;
};
