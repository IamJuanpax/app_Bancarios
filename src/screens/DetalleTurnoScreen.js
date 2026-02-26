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
 *   - Botones de acción según el estado actual:
 *     · Si pendiente  → "Aceptar" o "Cancelar"
 *     · Si aceptado   → "Completar" o "Cancelar"
 *     · Si completado → Sin acciones (estado final)
 *   - Confirmación antes de cambiar estado
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { updateEstadoTurno } from '../services/turnos';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import LoadingSpinner from '../components/LoadingSpinner';

// Configuración visual por estado
const STATUS_CONFIG = {
    pendiente: { color: theme.colors.warning, bgColor: theme.colors.warningLight, label: 'Pendiente', icon: '🕐' },
    aceptado: { color: theme.colors.info, bgColor: theme.colors.infoLight, label: 'Aceptado', icon: '✅' },
    completado: { color: theme.colors.success, bgColor: theme.colors.successLight, label: 'Completado', icon: '🏁' },
    cancelado: { color: theme.colors.error, bgColor: theme.colors.errorLight, label: 'Cancelado', icon: '❌' },
};

export default function DetalleTurnoScreen({ route, navigation }) {
    const { turnoId } = route.params;
    const { userRole } = useAuth();

    // ── Estado ──
    const [turno, setTurno] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadTurno();
    }, [turnoId]);

    /**
     * Carga los datos del turno desde Firestore.
     */
    const loadTurno = async () => {
        try {
            const turnoDoc = await getDoc(doc(db, 'turnos', turnoId));
            if (turnoDoc.exists()) {
                setTurno({ id: turnoDoc.id, ...turnoDoc.data() });
            }
        } catch (error) {
            console.error('Error al cargar turno:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Cambia el estado del turno con confirmación.
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
                            // Actualizar estado local sin re-consultar Firestore
                            setTurno(prev => ({ ...prev, estado: nuevoEstado }));
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

                    {/* Médico */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>👨‍⚕️</Text>
                        <View>
                            <Text style={styles.infoLabel}>Médico asignado</Text>
                            <Text style={styles.infoValue}>Dr. {turno.medicoNombre || 'Sin asignar'}</Text>
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

                {/* ── Botones de Acción ── */}
                {actionLoading ? (
                    <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: theme.spacing.xl }} />
                ) : (
                    <View style={styles.actionsContainer}>
                        {/* Si el turno está PENDIENTE → Aceptar o Cancelar */}
                        {turno.estado === 'pendiente' && (
                            <>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: theme.colors.info }]}
                                    onPress={() => handleCambiarEstado('aceptado', 'Aceptar')}
                                >
                                    <Text style={styles.actionButtonText}>✅ Aceptar Turno</Text>
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

                        {/* Si completado o cancelado → Estado final, sin acciones */}
                        {(turno.estado === 'completado' || turno.estado === 'cancelado') && (
                            <View style={styles.finalStateBanner}>
                                <Text style={styles.finalStateText}>
                                    Este turno ya fue {turno.estado}. No se pueden realizar más acciones.
                                </Text>
                            </View>
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
    // ── Actions ──
    actionsContainer: {
        gap: theme.spacing.m,
        marginBottom: theme.spacing.l,
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
