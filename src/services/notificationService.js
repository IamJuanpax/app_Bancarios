/**
 * ============================================================
 * NOTIFICATION SERVICE – Notificaciones locales (Costo $0)
 * ============================================================
 * 
 * Implementa notificaciones locales usando expo-notifications.
 * Esto permite:
 *   - Notificar cuando se crea un turno nuevo
 *   - Notificar cuando un médico acepta un turno
 *   - Programar recordatorios previos al turno
 *   - Cancelar recordatorios si el turno se cancela
 * 
 * Estrategia de costos (CONTEXT.md §2, §6):
 *   - Se usan SOLO notificaciones locales programadas en el dispositivo
 *   - NO se usa Firebase Cloud Messaging (requeriría plan Blaze)
 *   - Costo total: $0
 * 
 * Limitaciones del enfoque local:
 *   - Las notificaciones solo se disparan en el dispositivo que las programó
 *   - No se puede notificar a OTROS usuarios (ej: notificar a médicos cuando
 *     se crea un turno nuevo desde otro dispositivo)
 *   - Para notificaciones cross-device se necesitaría FCM + Cloud Functions
 *     (Fase 2 - Escalamiento)
 * 
 * Dependencia: expo-notifications (ya instalado en package.json)
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Clave de AsyncStorage para mapear turnoId → notificationId ──
const REMINDER_STORAGE_KEY = '@rehab_reminders';

// ── Tiempo de anticipación para recordatorios (en minutos) ──
const REMINDER_MINUTES_BEFORE = 60; // 1 hora antes del turno

/**
 * Configura el comportamiento de las notificaciones cuando la app está en primer plano.
 * Con esta configuración, las notificaciones se muestran como banners incluso
 * si la app está abierta.
 */
export const configureNotifications = () => {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,   // Mostrar alerta visual
            shouldPlaySound: true,   // Reproducir sonido
            shouldSetBadge: true,    // Mostrar badge en el ícono de la app
        }),
    });
};

/**
 * Solicita permisos de notificaciones al usuario.
 * Debe llamarse al iniciar la app o al hacer login.
 * 
 * @returns {Promise<boolean>} true si se concedieron los permisos
 */
export const requestNotificationPermissions = async () => {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();

        if (existingStatus === 'granted') {
            return true;
        }

        const { status } = await Notifications.requestPermissionsAsync();

        if (status !== 'granted') {
            console.warn('⚠️ Permisos de notificaciones denegados');
            return false;
        }

        // En Android, configurar el canal de notificaciones
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('turnos', {
                name: 'Turnos',
                description: 'Notificaciones de turnos y citas médicas',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#50C878', // Verde esmeralda (accent del theme)
                sound: 'default',
            });

            await Notifications.setNotificationChannelAsync('recordatorios', {
                name: 'Recordatorios',
                description: 'Recordatorios previos a turnos',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#0A84FF', // Azul info
                sound: 'default',
            });
        }

        return true;
    } catch (error) {
        console.error('Error al solicitar permisos de notificaciones:', error);
        return false;
    }
};

/**
 * Dispara una notificación local inmediata.
 * Útil para confirmar acciones como "turno creado" o "turno aceptado".
 * 
 * @param {object} options
 * @param {string} options.title - Título de la notificación
 * @param {string} options.body - Cuerpo del mensaje
 * @param {object} [options.data] - Datos adicionales (para manejar al tocar la notificación)
 * @returns {Promise<string>} ID de la notificación programada
 */
export const sendLocalNotification = async ({ title, body, data = {} }) => {
    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: 'default',
                ...(Platform.OS === 'android' && { channelId: 'turnos' }),
            },
            trigger: null, // null = inmediata
        });
        return notificationId;
    } catch (error) {
        console.error('Error al enviar notificación:', error);
        return null;
    }
};

/**
 * Programa un recordatorio previo al turno.
 * Se programa para X minutos antes de la fecha del turno.
 * El ID del recordatorio se guarda en AsyncStorage para poder cancelarlo después.
 * 
 * @param {object} options
 * @param {string} options.turnoId - ID del turno en Firestore
 * @param {string} options.pacienteNombre - Nombre del paciente
 * @param {Date} options.fechaHora - Fecha y hora del turno
 * @param {number} [options.minutesBefore] - Minutos de anticipación (default: 60)
 * @returns {Promise<string|null>} ID del recordatorio o null si no se pudo programar
 */
export const scheduleReminder = async ({
    turnoId,
    pacienteNombre,
    fechaHora,
    minutesBefore = REMINDER_MINUTES_BEFORE,
}) => {
    try {
        // Convertir a Date si es un Timestamp de Firestore
        const turnoDate = fechaHora?.toDate ? fechaHora.toDate() : new Date(fechaHora);

        // Calcular la fecha del recordatorio
        const reminderDate = new Date(turnoDate.getTime() - minutesBefore * 60 * 1000);

        // Si la fecha del recordatorio ya pasó, no programar
        if (reminderDate <= new Date()) {
            console.log(`⏭️ Recordatorio para turno ${turnoId} no programado (fecha ya pasada)`);
            return null;
        }

        // Calcular seconds desde ahora hasta el recordatorio
        const secondsUntilReminder = Math.floor((reminderDate.getTime() - Date.now()) / 1000);

        if (secondsUntilReminder <= 0) {
            return null;
        }

        // Formatear hora del turno para el mensaje
        const horaFormateada = turnoDate.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
        });

        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ Recordatorio de Turno',
                body: `En ${minutesBefore} minutos tenés turno con ${pacienteNombre} a las ${horaFormateada}.`,
                data: {
                    type: 'reminder',
                    turnoId,
                    screen: 'DetalleTurno',
                },
                sound: 'default',
                ...(Platform.OS === 'android' && { channelId: 'recordatorios' }),
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: secondsUntilReminder,
                repeats: false,
            },
        });

        // Guardar el mapping turnoId → notificationId en AsyncStorage
        await saveReminderMapping(turnoId, notificationId);

        console.log(`✅ Recordatorio programado para turno ${turnoId} en ${secondsUntilReminder}s`);
        return notificationId;
    } catch (error) {
        console.error('Error al programar recordatorio:', error);
        return null;
    }
};

/**
 * Cancela un recordatorio previamente programado para un turno.
 * Se usa cuando un turno se cancela o se elimina.
 * 
 * @param {string} turnoId - ID del turno cuyo recordatorio se quiere cancelar
 * @returns {Promise<boolean>} true si se canceló exitosamente
 */
export const cancelReminder = async (turnoId) => {
    try {
        const reminders = await getReminderMappings();
        const notificationId = reminders[turnoId];

        if (notificationId) {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
            // Limpiar del storage
            delete reminders[turnoId];
            await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminders));
            console.log(`🗑️ Recordatorio cancelado para turno ${turnoId}`);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error al cancelar recordatorio:', error);
        return false;
    }
};

/**
 * Cancela TODOS los recordatorios programados.
 * Útil al hacer logout.
 * 
 * @returns {Promise<void>}
 */
export const cancelAllReminders = async () => {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await AsyncStorage.removeItem(REMINDER_STORAGE_KEY);
        console.log('🗑️ Todos los recordatorios cancelados');
    } catch (error) {
        console.error('Error al cancelar todos los recordatorios:', error);
    }
};

// ── Helpers internos para AsyncStorage ──

/**
 * Guarda el mapping turnoId → notificationId en AsyncStorage.
 */
const saveReminderMapping = async (turnoId, notificationId) => {
    try {
        const reminders = await getReminderMappings();
        reminders[turnoId] = notificationId;
        await AsyncStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminders));
    } catch (error) {
        console.error('Error al guardar mapping de recordatorio:', error);
    }
};

/**
 * Obtiene todos los mappings turnoId → notificationId de AsyncStorage.
 */
const getReminderMappings = async () => {
    try {
        const json = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
        return json ? JSON.parse(json) : {};
    } catch (error) {
        console.error('Error al leer mappings de recordatorios:', error);
        return {};
    }
};

// ══════════════════════════════════════════════════════════════
// NOTIFICACIONES ESPECÍFICAS DEL FLUJO DE TURNOS
// ══════════════════════════════════════════════════════════════

/**
 * Notifica que se creó un turno nuevo.
 * Se dispara localmente en el dispositivo del usuario que lo crea.
 * 
 * @param {string} pacienteNombre - Nombre del paciente
 * @param {Date|Timestamp} fechaHora - Fecha y hora del turno
 */
export const notifyTurnoCreado = async (pacienteNombre, fechaHora) => {
    const date = fechaHora?.toDate ? fechaHora.toDate() : new Date(fechaHora);
    const fechaStr = date.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });

    await sendLocalNotification({
        title: '📅 Nuevo Turno Creado',
        body: `Turno para ${pacienteNombre} programado para el ${fechaStr}.`,
        data: { type: 'turno_creado' },
    });
};

/**
 * Notifica que un turno fue aceptado por un médico.
 * Se dispara localmente en el dispositivo del médico que acepta.
 * 
 * @param {string} pacienteNombre - Nombre del paciente
 * @param {Date|Timestamp} fechaHora - Fecha y hora del turno
 * @param {string} turnoId - ID del turno
 */
export const notifyTurnoAceptado = async (pacienteNombre, fechaHora, turnoId) => {
    const date = fechaHora?.toDate ? fechaHora.toDate() : new Date(fechaHora);
    const horaStr = date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
    });

    await sendLocalNotification({
        title: '✅ Turno Aceptado',
        body: `Aceptaste el turno con ${pacienteNombre} a las ${horaStr}. ¡No olvides asistir!`,
        data: { type: 'turno_aceptado', turnoId, screen: 'DetalleTurno' },
    });

    // Programar recordatorio automático 1h antes
    await scheduleReminder({
        turnoId,
        pacienteNombre,
        fechaHora: date,
    });
};

/**
 * Notifica que un turno fue completado.
 * 
 * @param {string} pacienteNombre - Nombre del paciente
 */
export const notifyTurnoCompletado = async (pacienteNombre) => {
    await sendLocalNotification({
        title: '🏁 Turno Completado',
        body: `El turno con ${pacienteNombre} fue marcado como completado. ¡Buen trabajo!`,
        data: { type: 'turno_completado' },
    });
};

/**
 * Notifica que un turno fue cancelado y cancela su recordatorio.
 * 
 * @param {string} pacienteNombre - Nombre del paciente
 * @param {string} turnoId - ID del turno
 */
export const notifyTurnoCancelado = async (pacienteNombre, turnoId) => {
    // Cancelar recordatorio programado
    await cancelReminder(turnoId);

    await sendLocalNotification({
        title: '❌ Turno Cancelado',
        body: `El turno con ${pacienteNombre} fue cancelado.`,
        data: { type: 'turno_cancelado' },
    });
};
