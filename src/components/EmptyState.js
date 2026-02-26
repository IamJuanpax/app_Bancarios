/**
 * ============================================================
 * EMPTY STATE – Componente para estados vacíos
 * ============================================================
 * 
 * Se muestra cuando una lista no tiene datos (ej: "No hay pacientes",
 * "No hay turnos programados"). Provee un ícono, mensaje y opcionalmente
 * un botón de acción para guiar al usuario.
 * 
 * Props:
 *   - icon    (string):   Emoji o carácter a mostrar como ícono
 *   - title   (string):   Título principal del estado vacío
 *   - message (string):   Descripción adicional
 *   - actionLabel (string, opcional): Texto del botón de acción
 *   - onAction   (function, opcional): Callback del botón
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function EmptyState({
    icon = '📋',
    title,
    message,
    actionLabel,
    onAction
}) {
    return (
        <View style={styles.container}>
            {/* Ícono grande tipo emoji */}
            <Text style={styles.icon}>{icon}</Text>

            {/* Título del estado vacío */}
            <Text style={styles.title}>{title}</Text>

            {/* Mensaje descriptivo */}
            {message && <Text style={styles.message}>{message}</Text>}

            {/* Botón de acción opcional (ej: "Agregar Paciente") */}
            {actionLabel && onAction && (
                <TouchableOpacity style={styles.button} onPress={onAction}>
                    <Text style={styles.buttonText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    icon: {
        fontSize: 56,
        marginBottom: theme.spacing.m,
    },
    title: {
        fontFamily: theme.typography.secondaryBold,
        fontSize: theme.typography.sizes.xl,
        color: theme.colors.primary,
        marginBottom: theme.spacing.s,
        textAlign: 'center',
    },
    message: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.textLight,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: theme.spacing.l,
    },
    button: {
        ...theme.commonStyles.buttonPrimary,
        paddingHorizontal: theme.spacing.xl,
    },
    buttonText: {
        ...theme.commonStyles.buttonPrimaryText,
    },
});
