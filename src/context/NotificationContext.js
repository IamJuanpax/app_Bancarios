/**
 * ============================================================
 * NOTIFICATION CONTEXT – Proveedor de notificaciones locales
 * ============================================================
 * 
 * Gestiona la inicialización de notificaciones locales y
 * el manejo de respuestas cuando el usuario toca una notificación.
 * 
 * Responsabilidades:
 *   1. Configurar el handler de notificaciones al montar
 *   2. Solicitar permisos de notificaciones
 *   3. Escuchar cuando el usuario toca una notificación y
 *      navegar a la pantalla correspondiente (deep-linking)
 * 
 * NOTA: En Expo Go (SDK 53+), las notificaciones remotas
 * no están disponibles. Este contexto maneja ese error de forma
 * segura y NO bloquea la app. Las notificaciones locales
 * siguen funcionando normalmente.
 * 
 * Estrategia de costos (CONTEXT.md §2, §6):
 *   - Se usan SOLO notificaciones locales (costo $0)
 *   - NO se usa Firebase Cloud Messaging
 */

import React, { createContext, useContext, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import {
    configureNotifications,
    requestNotificationPermissions,
} from '../services/notificationService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({});

/**
 * Hook para acceder al contexto de notificaciones.
 */
export const useNotifications = () => useContext(NotificationContext);

/**
 * Provider que envuelve la app y gestiona las notificaciones.
 * 
 * Todas las operaciones de notificación están envueltas en
 * try-catch para evitar crashes en Expo Go (SDK 53+) donde
 * las notificaciones remotas no están disponibles.
 * 
 * @param {object} props
 * @param {React.RefObject} props.navigationRef - Ref al NavigationContainer
 * @param {React.ReactNode} props.children
 */
export function NotificationProvider({ navigationRef, children }) {
    const { user } = useAuth();
    const responseListener = useRef(null);

    // ── Configurar handler de notificaciones al montar ──
    useEffect(() => {
        try {
            configureNotifications();
        } catch (error) {
            // Expo Go SDK 53+ no soporta notificaciones remotas.
            // Las locales siguen funcionando, ignoramos el error.
            console.log('ℹ️ Configuración de notificaciones (modo limitado en Expo Go):', error?.message);
        }
    }, []);

    // ── Solicitar permisos cuando el usuario se loguea ──
    useEffect(() => {
        if (user) {
            requestNotificationPermissions().catch((error) => {
                // Error esperado en Expo Go SDK 53+ para notificaciones remotas.
                console.log('ℹ️ Permisos de notificaciones (modo limitado en Expo Go):', error?.message);
            });
        }
    }, [user]);

    // ── Escuchar cuando el usuario toca una notificación ──
    useEffect(() => {
        try {
            // Listener para respuesta a notificaciones (tap)
            responseListener.current = Notifications.addNotificationResponseReceivedListener(
                (response) => {
                    const data = response.notification.request.content.data;

                    // Deep-linking: navegar a la pantalla indicada en la notificación
                    if (data?.screen && navigationRef?.current) {
                        try {
                            const params = {};
                            if (data.turnoId) {
                                params.turnoId = data.turnoId;
                            }
                            navigationRef.current.navigate(data.screen, params);
                        } catch (navError) {
                            console.warn('No se pudo navegar desde la notificación:', navError);
                        }
                    }
                }
            );
        } catch (error) {
            console.log('ℹ️ Listener de notificaciones no disponible en Expo Go:', error?.message);
        }

        // Limpiar listener al desmontar
        return () => {
            if (responseListener.current) {
                try {
                    Notifications.removeNotificationSubscription(responseListener.current);
                } catch (e) {
                    // Ignorar error de limpieza
                }
            }
        };
    }, [navigationRef]);

    return (
        <NotificationContext.Provider value={{}}>
            {children}
        </NotificationContext.Provider>
    );
}
