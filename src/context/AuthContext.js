/**
 * ============================================================
 * AUTH CONTEXT – Contexto global de autenticación
 * ============================================================
 * 
 * Provee a toda la app:
 *  - user:      Objeto del usuario de Firebase Auth (o null si no hay sesión)
 *  - userRole:  Rol del usuario ('admin' | 'medico' | null)
 *  - loading:   Booleano para mostrar spinner mientras se resuelve la sesión
 *  - login():   Función de inicio de sesión con email y contraseña
 *  - logout():  Función de cierre de sesión
 * 
 * Flujo:
 *  1. Al montar, se suscribe a onAuthStateChanged de Firebase Auth.
 *  2. Cuando detecta un usuario autenticado, consulta Firestore (colección "usuarios")
 *     para obtener el rol asignado (admin o médico).
 *  3. Todos los componentes hijos acceden a estos datos vía useAuth().
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Creamos el contexto con valor por defecto null
const AuthContext = createContext(null);

/**
 * Custom hook para acceder al contexto de autenticación.
 * IMPORTANTE: Solo puede usarse dentro de <AuthProvider>.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return context;
};

/**
 * AuthProvider – Componente que envuelve la app y provee el estado de auth.
 * 
 * @param {object} props.children - Los componentes hijos que tendrán acceso al contexto.
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);         // Usuario de Firebase Auth
    const [userRole, setUserRole] = useState(null);  // 'admin' | 'medico'
    const [userName, setUserName] = useState(null);  // Nombre del usuario desde Firestore
    const [loading, setLoading] = useState(true);    // Cargando sesión inicial

    useEffect(() => {
        // onAuthStateChanged se ejecuta cada vez que cambia el estado de auth
        // (login, logout, refresh de token, etc.)
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Usuario autenticado → buscar su rol en Firestore
                setUser(firebaseUser);
                try {
                    const userDoc = await getDoc(doc(db, 'Usuarios', firebaseUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        console.log('📋 Datos del usuario en Firestore:', JSON.stringify(data));
                        console.log('📋 Campos disponibles:', Object.keys(data));
                        setUserRole(data.rol); // 'admin' o 'medico'
                        setUserName(data.nombre || data.Nombre || data.name || null); // Nombre del usuario
                    } else {
                        console.log('⚠️ No se encontró documento de usuario en colección "usuarios" para UID:', firebaseUser.uid);
                        // Si no tiene documento en Firestore, se asume sin rol
                        setUserRole(null);
                    }
                } catch (error) {
                    console.error('Error al obtener rol del usuario:', error);
                    setUserRole(null);
                }
            } else {
                // No hay usuario autenticado
                setUser(null);
                setUserRole(null);
                setUserName(null);
            }
            setLoading(false);
        });

        // Cleanup: desuscribirse al desmontar
        return unsubscribe;
    }, []);

    /**
     * Inicia sesión con email y contraseña usando Firebase Auth.
     * @param {string} email 
     * @param {string} password 
     * @returns {Promise<UserCredential>}
     */
    const login = async (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    /**
     * Cierra la sesión actual.
     * @returns {Promise<void>}
     */
    const logout = async () => {
        setUserRole(null);
        setUserName(null);
        return signOut(auth);
    };

    // Valor que se provee a todos los consumidores del contexto
    const value = {
        user,
        userRole,
        userName,
        loading,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
