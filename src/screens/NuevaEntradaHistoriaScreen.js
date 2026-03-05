/**
 * ============================================================
 * NUEVA ENTRADA HISTORIA CLÍNICA – Formulario de evolución
 * ============================================================
 * 
 * Permite al médico agregar una nueva entrada (visita/evolución)
 * a la historia clínica de un paciente.
 * 
 * Se guarda como documento en la subcolección:
 *   pacientes/{pacienteId}/historia_clinica/{entradaId}
 * 
 * Puede recibir un turnoId opcional para vincular la entrada
 * directamente con el turno desde el cual se creó.
 * 
 * Campos:
 *   - Nota clínica (observaciones, texto largo)
 *   - Progreso (mejora, estable, empeora, etc.)
 *   - turnoId (vinculación opcional con turno)
 * 
 * El médico que crea la entrada se guarda automáticamente
 * desde el contexto de Auth.
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { createEntradaHistoria } from '../services/historiaClinica';

// Opciones predefinidas de progreso para facilitar la selección
const PROGRESO_OPTIONS = [
    { label: 'Mejora significativa', value: 'mejora_significativa', icon: '📈' },
    { label: 'Mejora leve', value: 'mejora_leve', icon: '📊' },
    { label: 'Estable', value: 'estable', icon: '➡️' },
    { label: 'Empeora leve', value: 'empeora_leve', icon: '📉' },
    { label: 'Empeora significativo', value: 'empeora_significativo', icon: '⚠️' },
];

export default function NuevaEntradaHistoriaScreen({ route, navigation }) {
    const { pacienteId, pacienteNombre, turnoId } = route.params;
    const { user, userName } = useAuth();

    // ── Estado del formulario ──
    const [nota, setNota] = useState('');
    const [progresoSeleccionado, setProgresoSeleccionado] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Guarda la nueva entrada de historia clínica.
     * El paciente_id y medico se obtienen automáticamente.
     */
    const handleSave = async () => {
        if (!nota.trim()) {
            Alert.alert('Campo requerido', 'La nota clínica es obligatoria.');
            return;
        }

        setIsLoading(true);
        try {
            await createEntradaHistoria({
                paciente_id: pacienteId,
                medico: user?.uid || '',
                medicoNombre: userName || user?.displayName || user?.email || 'Médico',
                nota: nota.trim(),
                progreso: progresoSeleccionado,
                turnoId: turnoId || null,  // Vincular con turno si viene de uno
            });
            Alert.alert('✅ Entrada guardada', 'La historia clínica se actualizó correctamente.');
            navigation.goBack();
        } catch (error) {
            console.error('Error al guardar entrada:', error);
            Alert.alert('Error', 'No se pudo guardar la entrada. Intentá de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Cabecera ── */}
                    <Text style={styles.title}>Nueva Evolución</Text>
                    <Text style={styles.subtitle}>
                        Historia clínica de {pacienteNombre}
                    </Text>

                    {/* Indicador de turno vinculado */}
                    {turnoId && (
                        <View style={styles.turnoLinkBanner}>
                            <Text style={styles.turnoLinkBannerText}>
                                📋 Esta entrada se vinculará con el turno completado
                            </Text>
                        </View>
                    )}

                    {/* ── Campo: Nota clínica ── */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Nota clínica *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describí las observaciones, tratamientos realizados, evolución del paciente..."
                            placeholderTextColor={theme.colors.textMuted}
                            multiline={true}               // Permite múltiples líneas
                            numberOfLines={6}              // Altura inicial
                            textAlignVertical="top"        // Texto comienza arriba
                            value={nota}
                            onChangeText={setNota}
                        />
                    </View>

                    {/* ── Selector de Progreso ── */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Progreso del paciente</Text>
                        <View style={styles.progressGrid}>
                            {PROGRESO_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.progressOption,
                                        progresoSeleccionado === option.value && styles.progressOptionSelected,
                                    ]}
                                    onPress={() => setProgresoSeleccionado(option.value)}
                                >
                                    <Text style={styles.progressIcon}>{option.icon}</Text>
                                    <Text style={[
                                        styles.progressLabel,
                                        progresoSeleccionado === option.value && styles.progressLabelSelected,
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* ── Botón Guardar ── */}
                    <TouchableOpacity
                        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={theme.colors.white} />
                        ) : (
                            <Text style={styles.saveButtonText}>Guardar Entrada</Text>
                        )}
                    </TouchableOpacity>

                    {/* ── Botón Cancelar ── */}
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.l,
        paddingBottom: theme.spacing.xxxl,
    },
    title: {
        fontFamily: theme.typography.secondaryBold,
        fontSize: theme.typography.sizes.xxl,
        color: theme.colors.primary,
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.xl,
    },
    fieldGroup: {
        marginBottom: theme.spacing.l,
    },
    label: {
        fontFamily: theme.typography.primaryBold,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.primary,
        marginBottom: theme.spacing.s,
        marginLeft: theme.spacing.xs,
    },
    input: {
        ...theme.commonStyles.input,
    },
    // TextArea para notas largas
    textArea: {
        height: 150,
        textAlignVertical: 'top',
        paddingTop: theme.spacing.m,
    },
    // ── Grid de progreso ──
    progressGrid: {
        gap: theme.spacing.s,
    },
    progressOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
    },
    progressOptionSelected: {
        borderColor: theme.colors.accent,
        backgroundColor: theme.colors.accent + '10',
    },
    progressIcon: {
        fontSize: 18,
        marginRight: theme.spacing.m,
    },
    progressLabel: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.text,
    },
    progressLabelSelected: {
        fontFamily: theme.typography.primaryBold,
        color: theme.colors.accentDark,
    },
    // ── Botones ──
    saveButton: {
        ...theme.commonStyles.buttonPrimary,
        marginBottom: theme.spacing.m,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        ...theme.commonStyles.buttonPrimaryText,
        fontSize: theme.typography.sizes.l,
    },
    cancelButton: {
        ...theme.commonStyles.buttonSecondary,
    },
    cancelButtonText: {
        ...theme.commonStyles.buttonSecondaryText,
    },
    // ── Turno Link Banner ──
    turnoLinkBanner: {
        backgroundColor: theme.colors.infoLight,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.l,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.info,
    },
    turnoLinkBannerText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.info,
        lineHeight: 20,
    },
});
