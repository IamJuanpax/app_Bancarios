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
 */

import { db } from './firebase';
import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';

const COLLECTION_NAME = 'turnos';
const turnosRef = collection(db, COLLECTION_NAME);

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
 * Crea un nuevo turno con estado "pendiente".
 * 
 * @param {object} data - Datos del turno
 * @returns {Promise<DocumentReference>}
 */
export const createTurno = async (data) => {
    return addDoc(turnosRef, {
        paciente_id: data.paciente_id,
        pacienteNombre: data.pacienteNombre || '',
        medico_id: data.medico_id,
        medicoNombre: data.medicoNombre || '',
        fecha_hora: data.fecha_hora instanceof Date
            ? Timestamp.fromDate(data.fecha_hora)
            : data.fecha_hora,
        estado: 'pendiente', // Siempre comienza como pendiente (FR4)
        notas: data.notas || '',
        creadoEn: serverTimestamp(),
    });
};

/**
 * Actualiza el estado de un turno.
 * Usado para transicionar: pendiente → aceptado → completado.
 * 
 * @param {string} id - ID del turno
 * @param {string} nuevoEstado - Nuevo estado ('aceptado', 'completado', 'cancelado')
 * @returns {Promise<void>}
 */
export const updateEstadoTurno = async (id, nuevoEstado) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    return updateDoc(docRef, {
        estado: nuevoEstado,
        actualizadoEn: serverTimestamp(),
    });
};

/**
 * Actualiza campos generales de un turno (notas, fecha, etc.).
 * 
 * @param {string} id - ID del turno
 * @param {object} data - Campos a actualizar
 * @returns {Promise<void>}
 */
export const updateTurno = async (id, data) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    return updateDoc(docRef, {
        ...data,
        actualizadoEn: serverTimestamp(),
    });
};
