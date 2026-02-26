/**
 * ============================================================
 * SERVICIO DE HISTORIA CLÍNICA – Entradas evolutivas
 * ============================================================
 * 
 * Maneja la colección "historia_clinica" en Firestore.
 * Cada entrada es un documento INDEPENDIENTE (no un sub-array dentro
 * del paciente), lo que mejora escalabilidad y costos de lectura
 * (ver CONTEXT.md §4, "Separar historia_clinica como colección independiente").
 * 
 * Estructura de cada documento:
 * {
 *   paciente_id: string,     // ID del paciente asociado
 *   fecha:       Timestamp,  // Fecha de la entrada
 *   medico:      string,     // UID del médico que creó la entrada
 *   medicoNombre: string,    // Nombre del médico (desnormalizado para lectura rápida)
 *   nota:        string,     // Descripción / observaciones
 *   progreso:    string,     // Estado de progreso del paciente
 * }
 */

import { db } from './firebase';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';

const COLLECTION_NAME = 'historia_clinica';
const historiaRef = collection(db, COLLECTION_NAME);

/**
 * Obtiene todas las entradas de historia clínica de un paciente.
 * Se filtran por paciente_id y se ordenan por fecha descendente 
 * (la más reciente primero).
 * 
 * @param {string} pacienteId - ID del paciente
 * @returns {Promise<Array>} Lista de entradas de historia clínica
 */
export const getHistoriaByPaciente = async (pacienteId) => {
    const q = query(
        historiaRef,
        where('paciente_id', '==', pacienteId),
        orderBy('fecha', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
    }));
};

/**
 * Crea una nueva entrada de historia clínica para un paciente.
 * 
 * @param {object} data - Datos de la entrada
 * @param {string} data.paciente_id - ID del paciente
 * @param {string} data.medico - UID del médico
 * @param {string} data.medicoNombre - Nombre legible del médico
 * @param {string} data.nota - Observaciones clínicas
 * @param {string} data.progreso - Estado de progreso
 * @returns {Promise<DocumentReference>}
 */
export const createEntradaHistoria = async (data) => {
    return addDoc(historiaRef, {
        paciente_id: data.paciente_id,
        medico: data.medico,
        medicoNombre: data.medicoNombre || '',
        nota: data.nota,
        progreso: data.progreso || '',
        fecha: serverTimestamp(), // Timestamp del servidor para consistencia
    });
};

/**
 * Actualiza una entrada existente de historia clínica.
 * 
 * @param {string} id - ID del documento de entrada
 * @param {object} data - Campos a actualizar (nota, progreso)
 * @returns {Promise<void>}
 */
export const updateEntradaHistoria = async (id, data) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    return updateDoc(docRef, {
        ...data,
        actualizadoEn: serverTimestamp(),
    });
};

/**
 * Elimina una entrada de historia clínica.
 * 
 * @param {string} id - ID del documento
 * @returns {Promise<void>}
 */
export const deleteEntradaHistoria = async (id) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    return deleteDoc(docRef);
};
