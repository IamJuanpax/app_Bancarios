/**
 * ============================================================
 * NOTIFICATION CONTEXT – Contexto global de notificaciones
 * ============================================================
 * 
 * Responsabilidades:
 *   1. Configurar el handler de notificaciones al montar
 *   2. Solicitar permisos de notificaciones al detectar un usuario logueado
 *   3. Proveer funciones de notificación a toda la app vía useNotifications()
 *   4. Manejar la navegación cuando el usuario toca una notificación
 *   5. Limpiar recordatorios al hacer logout
 * 
 * Se posiciona DENTRO del AuthProvider y del NavigationContainer
 * para poder acceder tanto al usuario como a la navegación.
 * 
 * Estrategia costo $0: solo notificaciones locales.
 */

import React, { createContext, useContext, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import {
    configureNotifications,
    requestNotificationPermissions,
    cancelAllReminders,
    notifyTurnoCreado,
    notifyTurnoAceptado,
    notifyTurnoCompletado,
    notifyTurnoCancelado,
    scheduleReminder,
    cancelReminder,
} from '../services/notificationService';

// Crear el contexto
const NotificationContext = createContext(null);

/**
 * Hook para acceder a las funciones de notificaciones.
 * 
 * Ejemplo de uso:
 *   const { notifyTurnoCreado, notifyTurnoAceptado } = useNotifications();
 *   await notifyTurnoCreado('Juan Pérez', new Date());
 */
export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications debe usarse dentro de un NotificationProvider');
    }
    return context;
};

/**
 * NotificationProvider – Envuelve la app y gestiona el ciclo de vida
 * de las notificaciones.
 * 
 * Debe colocarse DENTRO del AuthProvider:
 *   <AuthProvider>
 *     <NotificationProvider>
 *       <AppNavigator />
 *     </NotificationProvider>
 *   </AuthProvider>
 * 
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {object} [props.navigationRef] - Ref de NavigationContainer para deep-linking
 */
export function NotificationProvider({ children, navigationRef }) {
    const { user } = useAuth();

    // Refs para listeners (para cleanup)
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        // Configurar el handler de notificaciones (cómo se muestran en foreground)
        // Envuelto en try-catch: en Expo Go SDK 53+ esto puede lanzar un error
        // sobre remote notifications que NO afecta a las notificaciones locales.
        try {
            configureNotifications();
        } catch (e) {
            console.log('ℹ️ configureNotifications:', e.message);
        }
    }, []);

    useEffect(() => {
        if (user) {
            // Usuario logueado → solicitar permisos
            // Envuelto en try-catch para evitar errores en Expo Go (SDK 53+)
            // donde las notificaciones remotas no están disponibles
            requestNotificationPermissions().catch((e) => {
                console.log('ℹ️ Permisos de notificaciones:', e.message);
            });

            // Listeners de notificaciones (también envueltos por seguridad)
            try {
                // Listener: notificación recibida mientras la app está abierta
                notificationListener.current = Notifications.addNotificationReceivedListener(
                    (notification) => {
                        console.log('📩 Notificación recibida:', notification.request.content.title);
                    }
                );

                // Listener: usuario tocó una notificación
                responseListener.current = Notifications.addNotificationResponseReceivedListener(
                    (response) => {
                        const data = response.notification.request.content.data;
                        console.log('👆 Notificación tocada, data:', data);

                        // Navegar a la pantalla correspondiente si hay un deep-link
                        if (data?.screen && data?.turnoId && navigationRef?.current) {
                            navigationRef.current.navigate(data.screen, {
                                turnoId: data.turnoId,
                            });
                        }
                    }
                );
            } catch (e) {
                console.log('ℹ️ Notification listeners:', e.message);
            }
        }

        // Cleanup al desmontar o cambiar de usuario
        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, [user]);

    // Cuando el usuario hace logout, cancelar todos los recordatorios
    useEffect(() => {
        if (!user) {
            cancelAllReminders();
        }
    }, [user]);

    // Valor del contexto: expone las funciones de notificación
    const value = {
        notifyTurnoCreado,
        notifyTurnoAceptado,
        notifyTurnoCompletado,
        notifyTurnoCancelado,
        scheduleReminder,
        cancelReminder,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
