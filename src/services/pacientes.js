/**
 * ============================================================
 * SERVICIO DE PACIENTES – CRUD completo contra Firestore
 * ============================================================
 * 
 * Maneja la colección "pacientes" en Firestore.
 * Estructura de cada documento (según CONTEXT.md §4):
 * {
 *   nombre:      string,
 *   direccion:    string,
 *   coordenadas:  { lat: number, lng: number },
 *   telefono:     string,
 *   creadoPor:    string (uid del admin que lo creó),
 *   creadoEn:     Timestamp,
 *   actualizadoEn: Timestamp
 * }
 * 
 * Todas las funciones usan consultas puntuales (getDocs/getDoc)
 * en lugar de listeners en tiempo real, para optimizar costos
 * en el plan Spark de Firebase (CONTEXT.md §2, Estrategia de Costos).
 */

import { db } from './firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';

// Referencia a la colección raíz de pacientes
const COLLECTION_NAME = 'pacientes';
const pacientesRef = collection(db, COLLECTION_NAME);

/**
 * Obtiene TODOS los pacientes, ordenados por nombre.
 * Se usa consulta puntual (getDocs) en vez de onSnapshot para minimizar 
 * lecturas continuas y costos en Firestore.
 * 
 * @returns {Promise<Array>} Lista de pacientes con su id incluido
 */
export const getPacientes = async () => {
    const q = query(pacientesRef, orderBy('nombre', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,       // ID del documento en Firestore
        ...doc.data(),    // Spread de todos los campos
    }));
};

/**
 * Obtiene UN paciente por su ID de documento.
 * 
 * @param {string} id - ID del documento en Firestore
 * @returns {Promise<object|null>} Datos del paciente o null si no existe
 */
export const getPacienteById = async (id) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
};

/**
 * Crea un nuevo paciente en Firestore.
 * Agrega automáticamente timestamps de creación y actualización.
 * 
 * @param {object} data - Datos del paciente (nombre, direccion, coordenadas, telefono)
 * @returns {Promise<DocumentReference>} Referencia al nuevo documento
 */
export const createPaciente = async (data) => {
    return addDoc(pacientesRef, {
        nombre: data.nombre,
        direccion: data.direccion,
        coordenadas: data.coordenadas || { lat: 0, lng: 0 },
        telefono: data.telefono || '',
        creadoPor: data.creadoPor || '',    // UID del admin que creó
        creadoEn: serverTimestamp(),         // Timestamp del servidor
        actualizadoEn: serverTimestamp(),
    });
};

/**
 * Actualiza los datos de un paciente existente.
 * Solo modifica los campos enviados en `data` (merge parcial).
 * 
 * @param {string} id - ID del documento a actualizar
 * @param {object} data - Campos a actualizar
 * @returns {Promise<void>}
 */
export const updatePaciente = async (id, data) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    return updateDoc(docRef, {
        ...data,
        actualizadoEn: serverTimestamp(), // Siempre actualizar el timestamp
    });
};

/**
 * Elimina un paciente por su ID.
 * NOTA: También debería limpiarse la historia clínica asociada
 * (se maneja aparte en el servicio de historia clínica).
 * 
 * @param {string} id - ID del documento a eliminar
 * @returns {Promise<void>}
 */
export const deletePaciente = async (id) => {
    const docRef = doc(db, COLLECTION_NAME, id);
    return deleteDoc(docRef);
};
