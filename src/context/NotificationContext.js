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
 * Actualmente expone el contexto vacío, pero se puede
 * extender para exponer funciones como sendLocalNotification.
 */
export const useNotifications = () => useContext(NotificationContext);

/**
 * Provider que envuelve la app y gestiona las notificaciones.
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
        configureNotifications();
    }, []);

    // ── Solicitar permisos cuando el usuario se loguea ──
    useEffect(() => {
        if (user) {
            requestNotificationPermissions();
        }
    }, [user]);

    // ── Escuchar cuando el usuario toca una notificación ──
    useEffect(() => {
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
                    } catch (error) {
                        console.warn('No se pudo navegar desde la notificación:', error);
                    }
                }
            }
        );

        // Limpiar listener al desmontar
        return () => {
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, [navigationRef]);

    return (
        <NotificationContext.Provider value={{}}>
            {children}
        </NotificationContext.Provider>
    );
}
