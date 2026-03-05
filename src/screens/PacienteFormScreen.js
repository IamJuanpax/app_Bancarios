/**
 * ============================================================
 * CREAR / EDITAR PACIENTE – Formulario de paciente
 * ============================================================
 * 
 * Pantalla reutilizable para crear un nuevo paciente o editar
 * uno existente. Solo los admins pueden crear pacientes (FR1).
 * 
 * Campos del formulario:
 *   - Nombre completo (obligatorio)
 *   - Dirección (obligatorio) – se geocodifica automáticamente
 *   - Teléfono
 * 
 * Las coordenadas GPS se obtienen automáticamente a partir
 * de la dirección ingresada usando Nominatim (OpenStreetMap),
 * sin costo y sin API key (CONTEXT.md §2, Estrategia de Costos).
 * 
 * Modos:
 *   - mode: 'crear'  → Agrega un nuevo documento a "pacientes"
 *   - mode: 'editar' → Actualiza el documento existente
 * 
 * Se determina el modo según si route.params.pacienteId existe.
 */

import React, { useState, useEffect } from 'react';
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
import { createPaciente, updatePaciente, getPacienteById } from '../services/pacientes';
import { geocodeAddressVerbose } from '../utils/geocoding';

export default function PacienteFormScreen({ route, navigation }) {
    // Si viene pacienteId en params → modo edición
    const pacienteId = route?.params?.pacienteId;
    const isEditing = !!pacienteId;

    const { user } = useAuth();

    // ── Estado del formulario ──
    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [telefono, setTelefono] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(isEditing);
    const [geocodingStatus, setGeocodingStatus] = useState(null); // null | 'loading' | 'success' | 'error'

    /**
     * Si estamos en modo edición, cargar los datos existentes del paciente.
     */
    useEffect(() => {
        if (isEditing) {
            loadPaciente();
        }
    }, [pacienteId]);

    const loadPaciente = async () => {
        try {
            const data = await getPacienteById(pacienteId);
            if (data) {
                setNombre(data.nombre || '');
                setDireccion(data.direccion || '');
                setTelefono(data.telefono || '');
            }
        } catch (error) {
            console.error('Error al cargar paciente:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    /**
     * Valida los campos, geocodifica la dirección y guarda el paciente.
     */
    const handleSave = async () => {
        // Validación de campos obligatorios
        if (!nombre.trim()) {
            Alert.alert('Campo requerido', 'El nombre es obligatorio.');
            return;
        }
        if (!direccion.trim()) {
            Alert.alert('Campo requerido', 'La dirección es obligatoria.');
            return;
        }

        setIsLoading(true);
        setGeocodingStatus('loading');

        try {
            // 1. Geocodificar la dirección para obtener coordenadas
            const geoResult = await geocodeAddressVerbose(direccion.trim());

            let coordenadas = { lat: 0, lng: 0 };

            if (geoResult) {
                coordenadas = { lat: geoResult.lat, lng: geoResult.lng };
                setGeocodingStatus('success');
            } else {
                setGeocodingStatus('error');
                // Preguntar si quiere guardar sin coordenadas
                const continuar = await new Promise((resolve) => {
                    Alert.alert(
                        '⚠️ Dirección no encontrada',
                        'No se pudo obtener la ubicación GPS de esta dirección. ' +
                        'El paciente se guardará sin coordenadas, pero no se podrá validar la proximidad (400m) hasta que se corrija la dirección.\n\n' +
                        '¿Querés guardar de todas formas?',
                        [
                            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
                            { text: 'Guardar sin ubicación', onPress: () => resolve(true) },
                        ]
                    );
                });

                if (!continuar) {
                    setIsLoading(false);
                    setGeocodingStatus(null);
                    return;
                }
            }

            // 2. Armar los datos del paciente
            const data = {
                nombre: nombre.trim(),
                direccion: direccion.trim(),
                telefono: telefono.trim(),
                coordenadas,
                creadoPor: user?.uid || '',
            };

            // 3. Guardar en Firestore
            if (isEditing) {
                await updatePaciente(pacienteId, data);
                Alert.alert('✅ Paciente actualizado', 'Los datos se guardaron correctamente.');
            } else {
                await createPaciente(data);
                Alert.alert('✅ Paciente creado', 'El paciente se registró exitosamente.');
            }

            navigation.goBack();
        } catch (error) {
            console.error('Error al guardar paciente:', error);
            Alert.alert('Error', 'No se pudo guardar el paciente. Intentá de nuevo.');
        } finally {
            setIsLoading(false);
            setGeocodingStatus(null);
        }
    };

    if (isLoadingData) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.accent} />
            </View>
        );
    }

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
                    {/* ── Título ── */}
                    <Text style={styles.title}>
                        {isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isEditing
                            ? 'Modificá los datos del paciente'
                            : 'Completá los datos para registrar un nuevo paciente'}
                    </Text>

                    {/* ── Campo: Nombre ── */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Nombre completo *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: Juan Pérez"
                            placeholderTextColor={theme.colors.textMuted}
                            value={nombre}
                            onChangeText={setNombre}
                        />
                    </View>

                    {/* ── Campo: Dirección ── */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Dirección *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: Av. Corrientes 1234, CABA"
                            placeholderTextColor={theme.colors.textMuted}
                            value={direccion}
                            onChangeText={setDireccion}
                        />
                        <Text style={styles.fieldHint}>
                            📍 La ubicación en el mapa se obtendrá automáticamente de la dirección
                        </Text>
                    </View>

                    {/* ── Campo: Teléfono ── */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Teléfono</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej: 11 2345-6789"
                            placeholderTextColor={theme.colors.textMuted}
                            keyboardType="phone-pad"
                            value={telefono}
                            onChangeText={setTelefono}
                        />
                    </View>

                    {/* ── Estado del geocoding (mientras guarda) ── */}
                    {geocodingStatus && (
                        <View style={[
                            styles.geocodingBanner,
                            geocodingStatus === 'success' && { backgroundColor: theme.colors.successLight },
                            geocodingStatus === 'error' && { backgroundColor: theme.colors.errorLight },
                            geocodingStatus === 'loading' && { backgroundColor: theme.colors.infoLight },
                        ]}>
                            {geocodingStatus === 'loading' && (
                                <>
                                    <ActivityIndicator size="small" color={theme.colors.info} />
                                    <Text style={[styles.geocodingText, { color: theme.colors.info }]}>
                                        Buscando ubicación de la dirección...
                                    </Text>
                                </>
                            )}
                            {geocodingStatus === 'success' && (
                                <Text style={[styles.geocodingText, { color: theme.colors.success }]}>
                                    ✅ Ubicación encontrada
                                </Text>
                            )}
                            {geocodingStatus === 'error' && (
                                <Text style={[styles.geocodingText, { color: theme.colors.error }]}>
                                    ❌ No se encontró la ubicación
                                </Text>
                            )}
                        </View>
                    )}

                    {/* ── Botón Guardar ── */}
                    <TouchableOpacity
                        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <View style={styles.savingRow}>
                                <ActivityIndicator color={theme.colors.white} />
                                <Text style={[styles.saveButtonText, { marginLeft: 8 }]}>
                                    {geocodingStatus === 'loading' ? 'Buscando ubicación...' : 'Guardando...'}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.saveButtonText}>
                                {isEditing ? 'Guardar Cambios' : 'Registrar Paciente'}
                            </Text>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    // ── Fields ──
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
    fieldHint: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textMuted,
        marginTop: theme.spacing.xs,
        marginLeft: theme.spacing.xs,
    },
    // ── Geocoding status ──
    geocodingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.l,
        gap: theme.spacing.s,
    },
    geocodingText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
    },
    // ── Buttons ──
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
    savingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        ...theme.commonStyles.buttonSecondary,
    },
    cancelButtonText: {
        ...theme.commonStyles.buttonSecondaryText,
    },
});
