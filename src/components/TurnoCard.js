/**
 * ============================================================
 * TURNO CARD – Tarjeta de turno / cita médica
 * ============================================================
 * 
 * Muestra la información de un turno en formato card.
 * El color del badge de estado cambia según el estado del turno:
 *   - pendiente  → naranja/warning
 *   - aceptado   → azul/info
 *   - completado → verde/success
 *   - cancelado  → rojo/error
 * 
 * Props:
 *   - turno (object): Datos del turno
 *   - onPress (function): Callback al presionar
 *   - showPatient (boolean): Si mostrar el nombre del paciente (default true)
 *   - showDoctor (boolean): Si mostrar el nombre del médico (default false)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

// Configuración visual por estado del turno
const STATUS_CONFIG = {
    pendiente: {
        color: theme.colors.warning,
        bgColor: theme.colors.warningLight,
        label: 'Pendiente',
        icon: '🕐',
    },
    aceptado: {
        color: theme.colors.info,
        bgColor: theme.colors.infoLight,
        label: 'Aceptado',
        icon: '✅',
    },
    completado: {
        color: theme.colors.success,
        bgColor: theme.colors.successLight,
        label: 'Completado',
        icon: '🏁',
    },
    cancelado: {
        color: theme.colors.error,
        bgColor: theme.colors.errorLight,
        label: 'Cancelado',
        icon: '❌',
    },
};

/**
 * Formatea un Timestamp de Firestore a string legible.
 * @param {object} fecha - Firestore Timestamp o Date
 * @returns {string} Fecha formateada (ej: "15 Dic 2025, 14:30")
 */
const formatDate = (fecha) => {
    if (!fecha) return 'Sin fecha';
    // Firestore Timestamps tienen método toDate()
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function TurnoCard({
    turno,
    onPress,
    showPatient = true,
    showDoctor = false
}) {
    // Obtener configuración visual del estado actual
    const statusConfig = STATUS_CONFIG[turno.estado] || STATUS_CONFIG.pendiente;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            {/* Badge de estado con ícono */}
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                </Text>
            </View>

            {/* Fecha y hora del turno */}
            <View style={styles.dateRow}>
                <Text style={styles.dateIcon}>📅</Text>
                <Text style={styles.dateText}>{formatDate(turno.fecha_hora)}</Text>
            </View>

            {/* Nombre del paciente (si se muestra) */}
            {showPatient && turno.pacienteNombre && (
                <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>🧑‍🦽</Text>
                    <Text style={styles.infoText}>{turno.pacienteNombre}</Text>
                </View>
            )}

            {/* Nombre del médico (si se muestra, ej: desde vista de paciente) */}
            {showDoctor && turno.medicoNombre && (
                <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>👨‍⚕️</Text>
                    <Text style={styles.infoText}>Dr. {turno.medicoNombre}</Text>
                </View>
            )}

            {/* Notas del turno (si las hay) */}
            {turno.notas ? (
                <Text style={styles.notes} numberOfLines={2}>{turno.notas}</Text>
            ) : null}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        ...theme.shadows.light,
    },
    // Badge de estado (ej: "✅ Aceptado")
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.s,
        borderRadius: theme.borderRadius.full,
        marginBottom: theme.spacing.s,
    },
    statusIcon: {
        fontSize: 12,
        marginRight: theme.spacing.xs,
    },
    statusText: {
        fontFamily: theme.typography.primaryBold,
        fontSize: theme.typography.sizes.xs,
        textTransform: 'uppercase',
    },
    // Fecha
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    dateIcon: {
        fontSize: 14,
        marginRight: theme.spacing.s,
    },
    dateText: {
        fontFamily: theme.typography.primaryBold,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.primary,
    },
    // Filas de info (paciente, médico)
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    infoIcon: {
        fontSize: 14,
        marginRight: theme.spacing.s,
    },
    infoText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.textLight,
    },
    // Notas
    notes: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.textMuted,
        fontStyle: 'italic',
        marginTop: theme.spacing.s,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingTop: theme.spacing.s,
    },
});
