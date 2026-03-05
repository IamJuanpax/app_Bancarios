/**
 * ============================================================
 * DETALLE TURNO – Vista y gestión de un turno individual
 * ============================================================
 * 
 * Muestra toda la información de un turno y permite al médico
 * cambiar su estado a través de la máquina de estados:
 * 
 *   pendiente → aceptado → completado
 *                  ↓
 *              cancelado
 * 
 * Features:
 *   - Información completa del turno (paciente, fecha, notas)
 *   - **VALIDACIÓN DE PROXIMIDAD (400m)** al aceptar turno (FR3)
 *   - Botones de acción según el estado actual:
 *     · Si pendiente  → "Aceptar" (con validación GPS) o "Cancelar"
 *     · Si aceptado   → "Completar" o "Cancelar"
 *     · Si completado → Sin acciones (estado final)
 *   - Confirmación antes de cambiar estado
 *   - Muestra distancia al paciente en tiempo real
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { updateEstadoTurno, deleteTurno } from '../services/turnos';
import { getPacienteById } from '../services/pacientes';
import { calculateDistance, isWithinRange, formatDistance } from '../utils/haversine';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import LoadingSpinner from '../components/LoadingSpinner';

// Distancia máxima permitida para aceptar un turno (en metros)
const MAX_DISTANCE_METERS = 400;

// Configuración visual por estado
const STATUS_CONFIG = {
    pendiente: { color: theme.colors.warning, bgColor: theme.colors.warningLight, label: 'Pendiente', icon: '🕐' },
    aceptado: { color: theme.colors.info, bgColor: theme.colors.infoLight, label: 'Aceptado', icon: '✅' },
    completado: { color: theme.colors.success, bgColor: theme.colors.successLight, label: 'Completado', icon: '🏁' },
    cancelado: { color: theme.colors.error, bgColor: theme.colors.errorLight, label: 'Cancelado', icon: '❌' },
};

export default function DetalleTurnoScreen({ route, navigation }) {
    const { turnoId } = route.params;
    const { user, userRole, userName } = useAuth();
    const { notifyTurnoAceptado, notifyTurnoCompletado, notifyTurnoCancelado, cancelReminder } = useNotifications();

    // ── Estado ──
    const [turno, setTurno] = useState(null);
    const [paciente, setPaciente] = useState(null);
    const [medicoNombreDisplay, setMedicoNombreDisplay] = useState(null); // Nombre real del médico desde Firestore
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    // Estado de proximidad
    const [distancia, setDistancia] = useState(null);       // Distancia en metros
    const [dentroDeRango, setDentroDeRango] = useState(null); // true/false/null
    const [checkingProximity, setCheckingProximity] = useState(false);

    useEffect(() => {
        loadTurno();
    }, [turnoId]);

    /**
     * Carga los datos del turno y del paciente asociado desde Firestore.
     */
    const loadTurno = async () => {
        try {
            const turnoDoc = await getDoc(doc(db, 'turnos', turnoId));
            if (turnoDoc.exists()) {
                const turnoData = { id: turnoDoc.id, ...turnoDoc.data() };
                setTurno(turnoData);

                // Cargar datos del paciente para obtener sus coordenadas
                if (turnoData.paciente_id) {
                    const pacienteData = await getPacienteById(turnoData.paciente_id);
                    setPaciente(pacienteData);
                }

                // Cargar nombre real del médico desde la colección usuarios
                if (turnoData.medico_id) {
                    try {
                        const medicoDoc = await getDoc(doc(db, 'Usuarios', turnoData.medico_id));
                        if (medicoDoc.exists() && medicoDoc.data().nombre) {
                            setMedicoNombreDisplay(medicoDoc.data().nombre);
                        }
                    } catch (e) {
                        console.warn('No se pudo cargar nombre del médico:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error al cargar turno:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Verifica la proximidad del médico al paciente.
     * Obtiene la ubicación GPS actual y calcula la distancia con Haversine.
     * 
     * @returns {{ enRango: boolean, distancia: number } | null}
     */
    const verificarProximidad = async () => {
        setCheckingProximity(true);
        try {
            // 1. Pedir permisos de ubicación
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    '📍 Permiso denegado',
                    'Se necesita acceso a la ubicación para verificar la proximidad al paciente.'
                );
                return null;
            }

            // 2. Obtener ubicación actual del médico
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            const medicoLat = location.coords.latitude;
            const medicoLon = location.coords.longitude;

            // 3. Obtener coordenadas del paciente
            if (!paciente?.coordenadas?.lat || !paciente?.coordenadas?.lng) {
                Alert.alert(
                    '⚠️ Sin coordenadas',
                    'El paciente no tiene coordenadas GPS cargadas. Editá su perfil para agregar ubicación.'
                );
                return null;
            }

            const pacienteLat = paciente.coordenadas.lat;
            const pacienteLon = paciente.coordenadas.lng;

            // 4. Calcular distancia con Haversine (FR3, costo $0)
            const dist = calculateDistance(medicoLat, medicoLon, pacienteLat, pacienteLon);
            const enRango = dist <= MAX_DISTANCE_METERS;

            // Actualizar estado visual
            setDistancia(dist);
            setDentroDeRango(enRango);

            return { enRango, distancia: dist };
        } catch (error) {
            console.error('Error al verificar proximidad:', error);
            Alert.alert('Error', 'No se pudo obtener tu ubicación. Intentá de nuevo.');
            return null;
        } finally {
            setCheckingProximity(false);
        }
    };

    /**
     * Maneja la aceptación del turno con validación de proximidad.
     * PRIMERO verifica que el médico esté a ≤400m del paciente (FR3).
     */
    const handleAceptarTurno = async () => {
        setActionLoading(true);

        // Paso 1: Verificar proximidad
        const resultado = await verificarProximidad();

        if (!resultado) {
            setActionLoading(false);
            return; // Error al verificar, ya se mostró alerta
        }

        if (!resultado.enRango) {
            // ❌ Fuera de rango → Bloquear
            setActionLoading(false);
            Alert.alert(
                '🚫 Fuera de rango',
                `Estás a ${formatDistance(resultado.distancia)} del paciente.\n\n` +
                `La distancia máxima permitida es ${formatDistance(MAX_DISTANCE_METERS)}.\n\n` +
                `Debés estar a menos de 400 metros del paciente para aceptar el turno.`,
                [{ text: 'Entendido' }]
            );
            return;
        }

        // ✅ Dentro de rango → Confirmar aceptación
        Alert.alert(
            '✅ Dentro de rango',
            `Estás a ${formatDistance(resultado.distancia)} del paciente.\n\n¿Querés aceptar este turno?`,
            [
                { text: 'No', style: 'cancel', onPress: () => setActionLoading(false) },
                {
                    text: 'Sí, aceptar',
                    onPress: async () => {
                        try {
                            // Asignar el médico que acepta el turno
                            const nombreMedico = userName || user?.displayName || user?.email || 'Médico';
                            await updateEstadoTurno(turnoId, 'aceptado', {
                                medico_id: user?.uid || '',
                                medicoNombre: nombreMedico,
                            });
                            setTurno(prev => ({
                                ...prev,
                                estado: 'aceptado',
                                medico_id: user?.uid || '',
                                medicoNombre: nombreMedico,
                            }));

                            // 📩 Notificar aceptación + programar recordatorio automático
                            await notifyTurnoAceptado(
                                turno.pacienteNombre || 'Paciente',
                                turno.fecha_hora,
                                turnoId
                            );

                            Alert.alert('✅ Turno aceptado', 'El turno fue aceptado y se programó un recordatorio 1 hora antes.');
                        } catch (error) {
                            console.error('Error al aceptar turno:', error);
                            Alert.alert('Error', `No se pudo aceptar el turno: ${error.message}`);
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    /**
     * Cambia el estado del turno con confirmación (para cancelar/completar).
     * NO requiere validación de proximidad.
     * @param {string} nuevoEstado - El nuevo estado a asignar
     * @param {string} accion - Texto descriptivo de la acción (para el Alert)
     */
    const handleCambiarEstado = (nuevoEstado, accion) => {
        Alert.alert(
            `${accion} turno`,
            `¿Estás seguro de querer ${accion.toLowerCase()} este turno?`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Sí',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await updateEstadoTurno(turnoId, nuevoEstado);
                            setTurno(prev => ({ ...prev, estado: nuevoEstado }));

                            // 📩 Notificar según el nuevo estado
                            const pacNombre = turno.pacienteNombre || 'Paciente';
                            if (nuevoEstado === 'completado') {
                                await notifyTurnoCompletado(pacNombre);
                            } else if (nuevoEstado === 'cancelado') {
                                await notifyTurnoCancelado(pacNombre, turnoId);
                            }

                            Alert.alert('✅ Listo', `El turno fue ${nuevoEstado} exitosamente.`);
                        } catch (error) {
                            Alert.alert('Error', `No se pudo ${accion.toLowerCase()} el turno.`);
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    /**
     * Formatea Timestamp de Firestore a string legible.
     */
    const formatDate = (fecha) => {
        if (!fecha) return 'Sin fecha';
        const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
        return date.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) return <LoadingSpinner message="Cargando turno..." />;
    if (!turno) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Turno no encontrado</Text>
            </View>
        );
    }

    const statusConfig = STATUS_CONFIG[turno.estado] || STATUS_CONFIG.pendiente;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Badge de Estado ── */}
                <View style={[styles.statusBanner, { backgroundColor: statusConfig.bgColor }]}>
                    <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
                    <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                        {statusConfig.label}
                    </Text>
                </View>

                {/* ── Información del Turno ── */}
                <View style={styles.infoCard}>
                    <Text style={styles.cardTitle}>Detalles del Turno</Text>

                    {/* Fecha y hora */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>📅</Text>
                        <View>
                            <Text style={styles.infoLabel}>Fecha y hora</Text>
                            <Text style={styles.infoValue}>{formatDate(turno.fecha_hora)}</Text>
                        </View>
                    </View>

                    {/* Paciente */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>🧑‍🦽</Text>
                        <View>
                            <Text style={styles.infoLabel}>Paciente</Text>
                            <Text style={styles.infoValue}>{turno.pacienteNombre || 'Sin nombre'}</Text>
                        </View>
                    </View>

                    {/* Dirección del paciente */}
                    {paciente?.direccion && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoIcon}>📍</Text>
                            <View>
                                <Text style={styles.infoLabel}>Dirección del paciente</Text>
                                <Text style={styles.infoValue}>{paciente.direccion}</Text>
                            </View>
                        </View>
                    )}

                    {/* Médico */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>👨‍⚕️</Text>
                        <View>
                            <Text style={styles.infoLabel}>Médico asignado</Text>
                            <Text style={styles.infoValue}>
                                {turno.medico_id
                                    ? `Dr. ${medicoNombreDisplay || turno.medicoNombre || 'Sin nombre'}`
                                    : 'Sin asignar'}
                            </Text>
                        </View>
                    </View>

                    {/* Notas */}
                    {turno.notas ? (
                        <View style={styles.notesSection}>
                            <Text style={styles.notesLabel}>📝 Notas</Text>
                            <Text style={styles.notesText}>{turno.notas}</Text>
                        </View>
                    ) : null}
                </View>

                {/* ── Card de Proximidad (solo si el turno es pendiente o ya se verificó) ── */}
                {turno.estado === 'pendiente' && (
                    <View style={styles.proximityCard}>
                        <Text style={styles.proximityTitle}>📡 Proximidad al Paciente</Text>
                        <Text style={styles.proximityDesc}>
                            Para aceptar este turno debés estar a menos de {formatDistance(MAX_DISTANCE_METERS)} del paciente.
                        </Text>

                        {/* Resultado de la verificación */}
                        {distancia !== null && (
                            <View style={[
                                styles.proximityResult,
                                { backgroundColor: dentroDeRango ? '#E8F5E9' : '#FFEBEE' }
                            ]}>
                                <Text style={[
                                    styles.proximityDistance,
                                    { color: dentroDeRango ? '#2E7D32' : '#C62828' }
                                ]}>
                                    {dentroDeRango ? '🟢' : '🔴'} {formatDistance(distancia)}
                                </Text>
                                <Text style={[
                                    styles.proximityStatus,
                                    { color: dentroDeRango ? '#2E7D32' : '#C62828' }
                                ]}>
                                    {dentroDeRango
                                        ? 'Estás dentro del rango permitido'
                                        : `Fuera de rango (máximo: ${formatDistance(MAX_DISTANCE_METERS)})`}
                                </Text>
                            </View>
                        )}

                        {/* Botón para verificar proximidad sin aceptar */}
                        <TouchableOpacity
                            style={styles.checkProximityButton}
                            onPress={verificarProximidad}
                            disabled={checkingProximity}
                        >
                            {checkingProximity ? (
                                <ActivityIndicator color={theme.colors.info} size="small" />
                            ) : (
                                <Text style={styles.checkProximityText}>
                                    📍 {distancia !== null ? 'Verificar de nuevo' : 'Verificar mi distancia'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Botones de Acción ── */}
                {actionLoading ? (
                    <View style={styles.loadingActionContainer}>
                        <ActivityIndicator size="large" color={theme.colors.accent} />
                        <Text style={styles.loadingActionText}>
                            {checkingProximity ? 'Verificando ubicación...' : 'Procesando...'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.actionsContainer}>
                        {/* Si el turno está PENDIENTE → Aceptar (con validación GPS) o Cancelar */}
                        {turno.estado === 'pendiente' && (
                            <>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: theme.colors.info }]}
                                    onPress={handleAceptarTurno}
                                >
                                    <Text style={styles.actionButtonText}>✅ Aceptar Turno</Text>
                                    <Text style={styles.actionButtonSubtext}>Se verificará tu ubicación</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
                                    onPress={() => handleCambiarEstado('cancelado', 'Cancelar')}
                                >
                                    <Text style={styles.actionButtonText}>❌ Cancelar Turno</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Si el turno está ACEPTADO → Completar o Cancelar */}
                        {turno.estado === 'aceptado' && (
                            <>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                                    onPress={() => handleCambiarEstado('completado', 'Completar')}
                                >
                                    <Text style={styles.actionButtonText}>🏁 Completar Turno</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
                                    onPress={() => handleCambiarEstado('cancelado', 'Cancelar')}
                                >
                                    <Text style={styles.actionButtonText}>❌ Cancelar Turno</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Si completado o cancelado → Estado final */}
                        {(turno.estado === 'completado' || turno.estado === 'cancelado') && (
                            <View style={styles.finalStateBanner}>
                                <Text style={styles.finalStateText}>
                                    Este turno ya fue {turno.estado}.
                                </Text>
                            </View>
                        )}

                        {/* Eliminar turno (solo si está cancelado o completado) */}
                        {(turno.estado === 'cancelado' || turno.estado === 'completado') && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
                                onPress={() => {
                                    Alert.alert(
                                        '🗑️ Eliminar turno',
                                        `¿Estás seguro de que querés eliminar este turno ${turno.estado}? Esta acción no se puede deshacer.`,
                                        [
                                            { text: 'No', style: 'cancel' },
                                            {
                                                text: 'Sí, eliminar',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    setActionLoading(true);
                                                    try {
                                                        await deleteTurno(turnoId);
                                                        Alert.alert('✅ Turno eliminado', 'El turno fue eliminado permanentemente.');
                                                        navigation.goBack();
                                                    } catch (error) {
                                                        Alert.alert('Error', 'No se pudo eliminar el turno.');
                                                    } finally {
                                                        setActionLoading(false);
                                                    }
                                                },
                                            },
                                        ]
                                    );
                                }}
                            >
                                <Text style={styles.actionButtonText}>🗑️ Eliminar Turno</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* ── Botón Volver ── */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>← Volver a la agenda</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.m,
        paddingBottom: theme.spacing.xxxl,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.error,
    },
    // ── Status Banner ──
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.l,
    },
    statusIcon: {
        fontSize: 24,
        marginRight: theme.spacing.s,
    },
    statusLabel: {
        fontFamily: theme.typography.secondaryBold,
        fontSize: theme.typography.sizes.xl,
        textTransform: 'uppercase',
    },
    // ── Info Card ──
    infoCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        marginBottom: theme.spacing.l,
        ...theme.shadows.medium,
    },
    cardTitle: {
        fontFamily: theme.typography.secondaryBold,
        fontSize: theme.typography.sizes.l,
        color: theme.colors.primary,
        marginBottom: theme.spacing.l,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.l,
    },
    infoIcon: {
        fontSize: 20,
        marginRight: theme.spacing.m,
        marginTop: 2,
    },
    infoLabel: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textLight,
        marginBottom: 2,
    },
    infoValue: {
        fontFamily: theme.typography.primaryBold,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.primary,
    },
    // ── Notes ──
    notesSection: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.m,
    },
    notesLabel: {
        fontFamily: theme.typography.primaryBold,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.s,
    },
    notesText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.text,
        lineHeight: 22,
    },
    // ── Proximity Card ──
    proximityCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        marginBottom: theme.spacing.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.medium,
    },
    proximityTitle: {
        fontFamily: theme.typography.secondaryBold,
        fontSize: theme.typography.sizes.l,
        color: theme.colors.primary,
        marginBottom: theme.spacing.s,
    },
    proximityDesc: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.m,
        lineHeight: 20,
    },
    proximityResult: {
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    proximityDistance: {
        fontFamily: theme.typography.secondaryBold,
        fontSize: theme.typography.sizes.xxl,
        marginBottom: theme.spacing.xs,
    },
    proximityStatus: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        textAlign: 'center',
    },
    checkProximityButton: {
        alignItems: 'center',
        paddingVertical: theme.spacing.s,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.m,
    },
    checkProximityText: {
        fontFamily: theme.typography.primaryBold,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.info,
    },
    // ── Actions ──
    actionsContainer: {
        gap: theme.spacing.m,
        marginBottom: theme.spacing.l,
    },
    loadingActionContainer: {
        alignItems: 'center',
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.l,
    },
    loadingActionText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.textLight,
        marginTop: theme.spacing.s,
    },
    actionButton: {
        paddingVertical: theme.spacing.m,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.xl,
        alignItems: 'center',
        ...theme.shadows.medium,
    },
    actionButtonText: {
        fontFamily: theme.typography.primaryBold,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.white,
    },
    actionButtonSubtext: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.xs,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 2,
    },
    finalStateBanner: {
        backgroundColor: theme.colors.backgroundDark,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
    },
    finalStateText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.textLight,
        textAlign: 'center',
    },
    // ── Back Button ──
    backButton: {
        alignItems: 'center',
        paddingVertical: theme.spacing.m,
    },
    backButtonText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.info,
    },
});
