/**
 * ============================================================
 * SERVICIO DE TURNOS – Gestión de citas médicas
 * ============================================================
 * 
 * Maneja la colección "turnos" en Firestore.
 * Estados posibles (CONTEXT.md §3, FR4):
 *   - "pendiente":   Turno creado, esperando aceptación del médico
 *   - "aceptado":    Médico aceptó el turno
 *   - "completado":  Turno finalizado
 *   - "cancelado":   Turno anulado
 * 
 * Estructura de cada documento:
 * {
 *   paciente_id:     string,
 *   pacienteNombre:  string,     // Desnormalizado para listados rápidos
 *   medico_id:       string,
 *   medicoNombre:    string,     // Desnormalizado
 *   fecha_hora:      Timestamp,  // Fecha y hora del turno
 *   estado:          string,     // pendiente | aceptado | completado | cancelado
 *   notas:           string,     // Notas adicionales
 *   creadoEn:        Timestamp,
 * }
 * 
 * SEGURIDAD:
 *   - Validación de datos de entrada antes de escribir
 *   - Whitelist de campos en updates
 *   - Validación de transiciones de estado
 *   - Verificación de estado antes de eliminar
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
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';

const COLLECTION_NAME = 'turnos';
const turnosRef = collection(db, COLLECTION_NAME);

// ── Estados válidos y transiciones permitidas ──
const VALID_STATES = ['pendiente', 'aceptado', 'completado', 'cancelado'];
const ALLOWED_TRANSITIONS = {
    pendiente: ['aceptado', 'cancelado'],
    aceptado: ['completado', 'cancelado'],
    completado: [],  // Estado final, sin transiciones
    cancelado: [],  // Estado final, sin transiciones
};

// ── Campos permitidos para updateEstadoTurno (extra data) ──
const ALLOWED_ESTADO_EXTRA_FIELDS = ['medico_id', 'medicoNombre'];

// ── Campos permitidos para updateTurno (edición general) ──
const ALLOWED_UPDATE_FIELDS = ['notas', 'fecha_hora'];

/**
 * Obtiene todos los turnos de un médico, ordenados por fecha.
 * 
 * @param {string} medicoId - UID del médico
 * @returns {Promise<Array>} Lista de turnos
 */
export const getTurnosByMedico = async (medicoId) => {
    const q = query(
        turnosRef,
        where('medico_id', '==', medicoId),
        orderBy('fecha_hora', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
    }));
};

/**
 * Obtiene todos los turnos de un paciente específico.
 * 
 * @param {string} pacienteId - ID del paciente
 * @returns {Promise<Array>} Lista de turnos del paciente
 */
export const getTurnosByPaciente = async (pacienteId) => {
    const q = query(
        turnosRef,
        where('paciente_id', '==', pacienteId),
        orderBy('fecha_hora', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
    }));
};

/**
 * Obtiene TODOS los turnos (para vista admin).
 * 
 * @returns {Promise<Array>} Todos los turnos del sistema
 */
export const getAllTurnos = async () => {
    const q = query(turnosRef, orderBy('fecha_hora', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
    }));
};

/**
 * Valida los datos de un turno antes de crearlo.
 * 
 * @param {object} data - Datos del turno
 * @throws {Error} Si los datos no son válidos
 */
const validateTurnoData = (data) => {
    // paciente_id es requerido
    if (!data.paciente_id || typeof data.paciente_id !== 'string' || data.paciente_id.trim() === '') {
        throw new Error('El ID del paciente es requerido.');
    }

    // fecha_hora es requerida
    if (!data.fecha_hora) {
        throw new Error('La fecha y hora del turno son requeridas.');
    }

    // Validar que la fecha no sea en el pasado (con tolerancia de 5 minutos)
    const fechaTurno = data.fecha_hora instanceof Date
        ? data.fecha_hora
        : (data.fecha_hora?.toDate ? data.fecha_hora.toDate() : new Date(data.fecha_hora));

    const cincoMinAtras = new Date(Date.now() - 5 * 60 * 1000);
    if (fechaTurno < cincoMinAtras) {
        throw new Error('No se puede crear un turno en el pasado.');
    }

    // Notas: limitar longitud
    if (data.notas && data.notas.length > 2000) {
        throw new Error('Las notas son demasiado largas (máximo 2000 caracteres).');
    }

    // Nombre del paciente: limitar longitud
    if (data.pacienteNombre && data.pacienteNombre.length > 200) {
        throw new Error('El nombre del paciente es demasiado largo.');
    }
};

/**
 * Crea un nuevo turno con estado "pendiente".
 * Valida los datos antes de guardar.
 * 
 * @param {object} data - Datos del turno
 * @returns {Promise<DocumentReference>}
 * @throws {Error} Si los datos no pasan la validación
 */
export const createTurno = async (data) => {
    // Validar datos de entrada
    validateTurnoData(data);

    return addDoc(turnosRef, {
        paciente_id: data.paciente_id,
        pacienteNombre: data.pacienteNombre ? data.pacienteNombre.trim() : '',
        medico_id: data.medico_id || '',
        medicoNombre: data.medicoNombre ? data.medicoNombre.trim() : '',
        fecha_hora: data.fecha_hora instanceof Date
            ? Timestamp.fromDate(data.fecha_hora)
            : data.fecha_hora,
        estado: 'pendiente', // Siempre comienza como pendiente (FR4)
        notas: data.notas ? data.notas.trim() : '',
        creadoEn: serverTimestamp(),
    });
};

/**
 * Actualiza el estado de un turno con validación de transición.
 * Verifica que la transición de estado sea válida según la máquina de estados:
 *   pendiente → aceptado | cancelado
 *   aceptado  → completado | cancelado
 *   completado / cancelado → (no se puede cambiar)
 * 
 * @param {string} id - ID del turno
 * @param {string} nuevoEstado - Nuevo estado ('aceptado', 'completado', 'cancelado')
 * @param {object} [extraData] - Datos adicionales (solo medico_id y medicoNombre permitidos)
 * @returns {Promise<void>}
 * @throws {Error} Si la transición no es válida
 */
export const updateEstadoTurno = async (id, nuevoEstado, extraData = {}) => {
    if (!id || typeof id !== 'string') {
        throw new Error('ID de turno inválido.');
    }

    // Validar que el nuevo estado sea válido
    if (!VALID_STATES.includes(nuevoEstado)) {
        throw new Error(`Estado "${nuevoEstado}" no es válido. Estados permitidos: ${VALID_STATES.join(', ')}.`);
    }

    // Obtener el estado actual del turno para validar la transición
    const docRef = doc(db, COLLECTION_NAME, id);
    const turnoDoc = await getDoc(docRef);

    if (!turnoDoc.exists()) {
        throw new Error('El turno no existe.');
    }

    const estadoActual = turnoDoc.data().estado;

    // Validar transición de estado
    const transicionesPermitidas = ALLOWED_TRANSITIONS[estadoActual] || [];
    if (!transicionesPermitidas.includes(nuevoEstado)) {
        throw new Error(
            `No se puede cambiar el estado de "${estadoActual}" a "${nuevoEstado}". ` +
            `Transiciones permitidas: ${transicionesPermitidas.join(', ') || 'ninguna (estado final)'}.`
        );
    }

    // Filtrar extraData: solo permitir campos de la whitelist
    const sanitizedExtra = {};
    for (const key of ALLOWED_ESTADO_EXTRA_FIELDS) {
        if (extraData[key] !== undefined) {
            sanitizedExtra[key] = typeof extraData[key] === 'string'
                ? extraData[key].trim()
                : extraData[key];
        }
    }

    return updateDoc(docRef, {
        estado: nuevoEstado,
        ...sanitizedExtra,
        actualizadoEn: serverTimestamp(),
    });
};

/**
 * Actualiza campos generales de un turno (notas, fecha).
 * Solo permite modificar campos de la whitelist (ALLOWED_UPDATE_FIELDS).
 * Campos como 'estado', 'paciente_id', 'creadoEn' NO pueden ser modificados.
 * 
 * @param {string} id - ID del turno
 * @param {object} data - Campos a actualizar (solo 'notas' y 'fecha_hora')
 * @returns {Promise<void>}
 * @throws {Error} Si no hay campos válidos o la validación falla
 */
export const updateTurno = async (id, data) => {
    if (!id || typeof id !== 'string') {
        throw new Error('ID de turno inválido.');
    }

    // Filtrar solo campos permitidos (whitelist)
    const sanitized = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
        if (data[key] !== undefined) {
            if (key === 'notas') {
                if (data[key].length > 2000) {
                    throw new Error('Las notas son demasiado largas (máximo 2000 caracteres).');
                }
                sanitized[key] = data[key].trim();
            } else {
                sanitized[key] = data[key];
            }
        }
    }

    if (Object.keys(sanitized).length === 0) {
        throw new Error('No se proporcionaron campos válidos para actualizar.');
    }

    const docRef = doc(db, COLLECTION_NAME, id);
    return updateDoc(docRef, {
        ...sanitized,
        actualizadoEn: serverTimestamp(),
    });
};

/**
 * Elimina un turno de Firestore.
 * Solo permite eliminar turnos en estado 'cancelado' o 'completado'.
 * 
 * @param {string} id - ID del turno a eliminar
 * @returns {Promise<void>}
 * @throws {Error} Si el turno no está en un estado eliminable
 */
export const deleteTurno = async (id) => {
    if (!id || typeof id !== 'string') {
        throw new Error('ID de turno inválido.');
    }

    // Verificar el estado actual antes de eliminar
    const docRef = doc(db, COLLECTION_NAME, id);
    const turnoDoc = await getDoc(docRef);

    if (!turnoDoc.exists()) {
        throw new Error('El turno no existe.');
    }

    const estado = turnoDoc.data().estado;
    if (!['cancelado', 'completado'].includes(estado)) {
        throw new Error(
            `No se puede eliminar un turno en estado "${estado}". ` +
            `Solo se pueden eliminar turnos cancelados o completados.`
        );
    }

    return deleteDoc(docRef);
};
