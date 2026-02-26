/**
 * ============================================================
 * LOADING SPINNER – Indicador de carga global
 * ============================================================
 * 
 * Componente reutilizable que muestra un spinner centrado
 * con el color de acento de la app. Se usa durante:
 * - Carga inicial de la sesión de Auth
 * - Consultas a Firestore (al obtener pacientes, turnos, etc.)
 * - Cualquier operación async que requiera feedback visual
 * 
 * Props:
 *   - message (string, opcional): Texto debajo del spinner.
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function LoadingSpinner({ message = 'Cargando...' }) {
    return (
        <View style={styles.container}>
            {/* ActivityIndicator nativo con color de acento */}
            <ActivityIndicator size="large" color={theme.colors.accent} />
            {message && <Text style={styles.text}>{message}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.xl,
    },
    text: {
        marginTop: theme.spacing.m,
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.textLight,
    },
});
