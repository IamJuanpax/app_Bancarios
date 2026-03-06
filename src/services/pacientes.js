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
 * 
 * SEGURIDAD:
 *   - Validación de datos de entrada antes de escribir a Firestore
 *   - Whitelist de campos permitidos en updates
 *   - Eliminación en cascada (historia clínica + turnos huérfanos)
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
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';

// Referencia a la colección raíz de pacientes
const COLLECTION_NAME = 'pacientes';
const pacientesRef = collection(db, COLLECTION_NAME);

// ── Campos permitidos para update (whitelist) ──
const ALLOWED_UPDATE_FIELDS = ['nombre', 'direccion', 'coordenadas', 'telefono'];

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
    if (!id || typeof id !== 'string') return null;

    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
};

/**
 * Valida los datos de un paciente antes de crear o actualizar.
 * Lanza un Error con mensaje descriptivo si la validación falla.
 * 
 * @param {object} data - Datos del paciente a validar
 * @param {boolean} isCreate - true si es creación (campos requeridos), false si es update
 * @throws {Error} Si los datos no son válidos
 */
const validatePacienteData = (data, isCreate = true) => {
    // Nombre: requerido en creación, validado si se envía en update
    if (isCreate && (!data.nombre || typeof data.nombre !== 'string')) {
        throw new Error('El nombre del paciente es requerido.');
    }
    if (data.nombre !== undefined) {
        const nombre = data.nombre.trim();
        if (nombre.length < 2) {
            throw new Error('El nombre debe tener al menos 2 caracteres.');
        }
        if (nombre.length > 200) {
            throw new Error('El nombre es demasiado largo (máximo 200 caracteres).');
        }
    }

    // Teléfono: validar formato si se envía
    if (data.telefono !== undefined && data.telefono !== '') {
        const tel = String(data.telefono).trim();
        if (tel.length > 30) {
            throw new Error('El teléfono es demasiado largo (máximo 30 caracteres).');
        }
    }

    // Dirección: validar longitud si se envía
    if (data.direccion !== undefined && data.direccion !== '') {
        if (data.direccion.length > 500) {
            throw new Error('La dirección es demasiado larga (máximo 500 caracteres).');
        }
    }

    // Coordenadas: validar rango geográfico si se envían
    if (data.coordenadas) {
        const { lat, lng } = data.coordenadas;
        if (lat !== undefined && (typeof lat !== 'number' || Math.abs(lat) > 90)) {
            throw new Error('Latitud inválida (debe ser un número entre -90 y 90).');
        }
        if (lng !== undefined && (typeof lng !== 'number' || Math.abs(lng) > 180)) {
            throw new Error('Longitud inválida (debe ser un número entre -180 y 180).');
        }
    }
};

/**
 * Crea un nuevo paciente en Firestore.
 * Agrega automáticamente timestamps de creación y actualización.
 * Valida los datos antes de guardar.
 * 
 * @param {object} data - Datos del paciente (nombre, direccion, coordenadas, telefono)
 * @returns {Promise<DocumentReference>} Referencia al nuevo documento
 * @throws {Error} Si los datos no pasan la validación
 */
export const createPaciente = async (data) => {
    // Validar datos antes de escribir a Firestore
    validatePacienteData(data, true);

    return addDoc(pacientesRef, {
        nombre: data.nombre.trim(),
        direccion: data.direccion || '',
        coordenadas: data.coordenadas || { lat: 0, lng: 0 },
        telefono: data.telefono ? String(data.telefono).trim() : '',
        creadoPor: data.creadoPor || '',    // UID del admin que creó
        creadoEn: serverTimestamp(),         // Timestamp del servidor
        actualizadoEn: serverTimestamp(),
    });
};

/**
 * Actualiza los datos de un paciente existente.
 * Solo permite modificar campos de la whitelist (ALLOWED_UPDATE_FIELDS).
 * Campos como 'creadoPor' y 'creadoEn' NO pueden ser modificados.
 * 
 * @param {string} id - ID del documento a actualizar
 * @param {object} data - Campos a actualizar
 * @returns {Promise<void>}
 * @throws {Error} Si los datos no pasan la validación
 */
export const updatePaciente = async (id, data) => {
    if (!id || typeof id !== 'string') {
        throw new Error('ID de paciente inválido.');
    }

    // Validar datos de entrada
    validatePacienteData(data, false);

    // Filtrar solo campos permitidos (whitelist)
    const sanitized = {};
    for (const key of ALLOWED_UPDATE_FIELDS) {
        if (data[key] !== undefined) {
            sanitized[key] = key === 'nombre' ? data[key].trim() : data[key];
        }
    }

    // Si no hay campos válidos para actualizar, no hacer nada
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
 * Elimina un paciente por su ID con limpieza en cascada.
 * 
 * Antes de eliminar el paciente:
 * 1. Verifica que no tenga turnos pendientes o aceptados (activos)
 * 2. Elimina toda la historia clínica asociada (subcolección)
 * 3. Elimina TODOS los turnos asociados (incluyendo completados/cancelados)
 * 
 * @param {string} id - ID del documento a eliminar
 * @returns {Promise<void>}
 * @throws {Error} Si el paciente tiene turnos activos
 */
export const deletePaciente = async (id) => {
    if (!id || typeof id !== 'string') {
        throw new Error('ID de paciente inválido.');
    }

    // 1. Verificar que el paciente no tenga turnos pendientes/aceptados (BLOQUEO)
    const turnosRef = collection(db, 'turnos');
    const turnosActivosQuery = query(
        turnosRef,
        where('paciente_id', '==', id),
        where('estado', 'in', ['pendiente', 'aceptado'])
    );
    const turnosActivos = await getDocs(turnosActivosQuery);

    if (!turnosActivos.empty) {
        throw new Error(
            `No se puede eliminar el paciente: tiene ${turnosActivos.size} turno(s) activo(s) (pendiente/aceptado). Cancelalos primero.`
        );
    }

    // 2. Eliminar historia clínica en cascada (subcolección)
    const historiaRef = collection(db, 'pacientes', id, 'historia_clinica');
    const historiaSnapshot = await getDocs(historiaRef);
    const deleteHistoriaPromises = historiaSnapshot.docs.map(docSnap =>
        deleteDoc(doc(db, 'pacientes', id, 'historia_clinica', docSnap.id))
    );
    await Promise.all(deleteHistoriaPromises);

    // 3. Eliminar TODOS los turnos asociados (completados o cancelados)
    // Ya verificamos que no hay activos, así que solo quedan los pasados.
    const allTurnosQuery = query(turnosRef, where('paciente_id', '==', id));
    const allTurnosSnapshot = await getDocs(allTurnosQuery);
    const deleteTurnosPromises = allTurnosSnapshot.docs.map(docSnap =>
        deleteDoc(doc(db, 'turnos', docSnap.id))
    );
    await Promise.all(deleteTurnosPromises);

    // 4. Eliminar el documento del paciente
    const docRef = doc(db, COLLECTION_NAME, id);
    return deleteDoc(docRef);
};
