/**
 * ============================================================
 * STAT CARD – Tarjeta de estadística para el Dashboard
 * ============================================================
 * 
 * Muestra un valor numérico con un ícono y etiqueta descriptiva.
 * Se usa en el HomeScreen/Dashboard para mostrar métricas como:
 *   - Total de pacientes
 *   - Turnos pendientes hoy
 *   - Turnos completados
 * 
 * Estilo: neomorfismo ligero con sombras suaves (CONTEXT.md §5).
 * 
 * Props:
 *   - icon   (string): Emoji representativo
 *   - value  (string|number): Valor numérico o texto
 *   - label  (string): Descripción de la métrica
 *   - color  (string, opcional): Color de acento del ícono
 *   - onPress (function, opcional): Si es presionable
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function StatCard({ icon, value, label, color, onPress }) {
    // Color por defecto es el acento (Verde Esmeralda)
    const accentColor = color || theme.colors.accent;

    // Si tiene onPress, se envuelve en TouchableOpacity
    const Container = onPress ? TouchableOpacity : View;

    return (
        <Container
            style={styles.card}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            {/* Ícono con fondo circular coloreado */}
            <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
                <Text style={styles.icon}>{icon}</Text>
            </View>

            {/* Valor numérico grande */}
            <Text style={[styles.value, { color: accentColor }]}>{value}</Text>

            {/* Etiqueta descriptiva */}
            <Text style={styles.label}>{label}</Text>
        </Container>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        alignItems: 'center',
        marginHorizontal: theme.spacing.xs,
        ...theme.shadows.light,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: theme.borderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    icon: {
        fontSize: 22,
    },
    value: {
        fontFamily: theme.typography.secondaryBold,
        fontSize: theme.typography.sizes.xl,
        marginBottom: theme.spacing.xs,
    },
    label: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textLight,
        textAlign: 'center',
    },
});
