/**
 * ============================================================
 * PATIENT CARD – Tarjeta de paciente para listados
 * ============================================================
 * 
 * Muestra la información básica de un paciente en formato card.
 * Se usa en la pantalla de listado de pacientes (PacientesScreen).
 * 
 * Incluye:
 *   - Nombre del paciente
 *   - Dirección
 *   - Teléfono
 *   - Indicador de distancia (si se provee)
 * 
 * Estilo: card blanca con sombra suave y acento verde en el borde
 * izquierdo (inspirado en UI médica premium, CONTEXT.md §5).
 * 
 * Props:
 *   - paciente (object): Datos del paciente (nombre, direccion, telefono)
 *   - distancia (number, opcional): Distancia en metros desde el médico
 *   - onPress (function): Callback al presionar la card
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function PatientCard({ paciente, distancia, onPress }) {
    // Determinar si la distancia es válida (dentro de 400m)
    const isInRange = distancia !== undefined && distancia <= 400;
    const isOutOfRange = distancia !== undefined && distancia > 400;

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            {/* Barra decorativa lateral izquierda (acento verde) */}
            <View style={styles.accentBar} />

            {/* Contenido principal de la tarjeta */}
            <View style={styles.content}>
                {/* Fila superior: Nombre y badge de distancia */}
                <View style={styles.header}>
                    <Text style={styles.name} numberOfLines={1}>{paciente.nombre}</Text>

                    {/* Badge de distancia (solo si se provee) */}
                    {distancia !== undefined && (
                        <View style={[
                            styles.distanceBadge,
                            isInRange && styles.distanceBadgeInRange,
                            isOutOfRange && styles.distanceBadgeOutRange,
                        ]}>
                            <Text style={[
                                styles.distanceText,
                                isInRange && styles.distanceTextInRange,
                                isOutOfRange && styles.distanceTextOutRange,
                            ]}>
                                {distancia < 1000
                                    ? `${Math.round(distancia)}m`
                                    : `${(distancia / 1000).toFixed(1)}km`
                                }
                            </Text>
                        </View>
                    )}
                </View>

                {/* Dirección */}
                <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>📍</Text>
                    <Text style={styles.infoText} numberOfLines={1}>{paciente.direccion || 'Sin dirección'}</Text>
                </View>

                {/* Teléfono */}
                {paciente.telefono && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>📞</Text>
                        <Text style={styles.infoText}>{paciente.telefono}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.m,
        overflow: 'hidden', // Para que la barra lateral respete el borde redondeado
        ...theme.shadows.light,
    },
    // Barra lateral decorativa verde esmeralda
    accentBar: {
        width: 4,
        backgroundColor: theme.colors.accent,
    },
    content: {
        flex: 1,
        padding: theme.spacing.m,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    name: {
        flex: 1,
        fontFamily: theme.typography.secondaryBold,
        fontSize: theme.typography.sizes.l,
        color: theme.colors.primary,
        marginRight: theme.spacing.s,
    },
    // Badge de distancia
    distanceBadge: {
        paddingVertical: 2,
        paddingHorizontal: theme.spacing.s,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.backgroundDark,
    },
    distanceBadgeInRange: {
        backgroundColor: theme.colors.successLight,
    },
    distanceBadgeOutRange: {
        backgroundColor: theme.colors.errorLight,
    },
    distanceText: {
        fontFamily: theme.typography.primaryBold,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textLight,
    },
    distanceTextInRange: {
        color: theme.colors.success,
    },
    distanceTextOutRange: {
        color: theme.colors.error,
    },
    // Filas de información
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: theme.spacing.xs,
    },
    infoIcon: {
        fontSize: 14,
        marginRight: theme.spacing.s,
    },
    infoText: {
        flex: 1,
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.textLight,
    },
});
