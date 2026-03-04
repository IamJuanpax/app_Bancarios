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
 *   - Dirección (obligatorio)
 *   - Teléfono
 *   - Coordenadas (lat, lng) – obtenidas automáticamente o manual
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
import * as Location from 'expo-location';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { createPaciente, updatePaciente, getPacienteById } from '../services/pacientes';

export default function PacienteFormScreen({ route, navigation }) {
    // Si viene pacienteId en params → modo edición
    const pacienteId = route?.params?.pacienteId;
    const isEditing = !!pacienteId;

    const { user } = useAuth();

    // ── Estado del formulario ──
    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [telefono, setTelefono] = useState('');
    const [latitud, setLatitud] = useState('');   // String para el input
    const [longitud, setLongitud] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(isEditing);

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
                setLatitud(data.coordenadas?.lat?.toString() || '');
                setLongitud(data.coordenadas?.lng?.toString() || '');
            }
        } catch (error) {
            console.error('Error al cargar paciente:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    /**
     * Obtiene las coordenadas GPS de la ubicación actual del dispositivo.
     * Útil para registrar pacientes en la ubicación donde se encuentran.
     * Usa expo-location (costo 0, sin API externa).
     */
    const handleGetLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación.');
                return;
            }
            const location = await Location.getCurrentPositionAsync({});
            setLatitud(location.coords.latitude.toString());
            setLongitud(location.coords.longitude.toString());
            Alert.alert('Ubicación obtenida', 'Las coordenadas se han actualizado.');
        } catch (error) {
            Alert.alert('Error', 'No se pudo obtener la ubicación.');
        }
    };

    /**
     * Valida los campos y guarda (crea o actualiza) el paciente en Firestore.
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
        try {
            const data = {
                nombre: nombre.trim(),
                direccion: direccion.trim(),
                telefono: telefono.trim(),
                coordenadas: {
                    lat: parseFloat(latitud) || 0,
                    lng: parseFloat(longitud) || 0,
                },
                creadoPor: user?.uid || '',
            };

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

                    {/* ── Coordenadas ── */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Coordenadas</Text>
                        <View style={styles.coordRow}>
                            <TextInput
                                style={[styles.input, styles.coordInput]}
                                placeholder="Latitud"
                                placeholderTextColor={theme.colors.textMuted}
                                keyboardType="numeric"
                                value={latitud}
                                onChangeText={setLatitud}
                            />
                            <TextInput
                                style={[styles.input, styles.coordInput]}
                                placeholder="Longitud"
                                placeholderTextColor={theme.colors.textMuted}
                                keyboardType="numeric"
                                value={longitud}
                                onChangeText={setLongitud}
                            />
                        </View>
                        {/* Botón para usar GPS */}
                        <TouchableOpacity style={styles.gpsButton} onPress={handleGetLocation}>
                            <Text style={styles.gpsButtonText}>📍 Usar ubicación actual</Text>
                        </TouchableOpacity>
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
    // Coordenadas en fila
    coordRow: {
        flexDirection: 'row',
        gap: theme.spacing.s,
    },
    coordInput: {
        flex: 1,
    },
    gpsButton: {
        marginTop: theme.spacing.s,
        paddingVertical: theme.spacing.s,
        alignItems: 'center',
    },
    gpsButtonText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.info,
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
    cancelButton: {
        ...theme.commonStyles.buttonSecondary,
    },
    cancelButtonText: {
        ...theme.commonStyles.buttonSecondaryText,
    },
});
