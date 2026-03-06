/**
 * ============================================================
 * CREAR TURNO – Formulario de nuevo turno
 * ============================================================
 * 
 * Permite crear un nuevo turno/cita médica.
 * Los turnos siempre comienzan con estado "pendiente" (FR4).
 * 
 * Campos:
 *   - Paciente (selector de pacientes existentes)
 *   - Fecha y hora
 *   - Notas adicionales
 * 
 * El médico asignado se toma automáticamente del usuario logueado.
 * Si el turno se preselecciona un paciente (viene de DetallePaciente),
 * se muestra precargado.
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import { notifyTurnoCreado } from '../services/notificationService';
import { getPacientes } from '../services/pacientes';
import { createTurno } from '../services/turnos';

export default function CrearTurnoScreen({ route, navigation }) {
    // Paciente precargado (si viene de DetallePaciente)
    const preselectedPacienteId = route?.params?.pacienteId;
    const preselectedPacienteNombre = route?.params?.pacienteNombre;

    const { user } = useAuth();

    // ── Estado ──
    const [pacientes, setPacientes] = useState([]);
    const [pacienteSeleccionado, setPacienteSeleccionado] = useState(
        preselectedPacienteId || ''
    );
    const [pacienteNombre, setPacienteNombre] = useState(
        preselectedPacienteNombre || ''
    );
    const [fecha, setFecha] = useState('');             // DD/MM/AAAA
    const [hora, setHora] = useState('');               // HH:MM
    const [notas, setNotas] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPacienteList, setShowPacienteList] = useState(false);
    const [pacienteTelefono, setPacienteTelefono] = useState('');
    const [busquedaPaciente, setBusquedaPaciente] = useState('');

    // Filtrar pacientes por búsqueda
    const pacientesFiltrados = useMemo(() => {
        if (!busquedaPaciente.trim()) return pacientes;
        const query = busquedaPaciente.toLowerCase().trim();
        return pacientes.filter(p =>
            p.nombre?.toLowerCase().includes(query) ||
            p.direccion?.toLowerCase().includes(query)
        );
    }, [pacientes, busquedaPaciente]);

    // Cargar lista de pacientes al montar
    useEffect(() => {
        loadPacientes();
    }, []);

    const loadPacientes = async () => {
        try {
            const data = await getPacientes();
            setPacientes(data);
        } catch (error) {
            if (__DEV__) console.error('Error al cargar pacientes:', error);
        }
    };

    /**
     * Selecciona un paciente de la lista desplegable.
     */
    const selectPaciente = (paciente) => {
        setPacienteSeleccionado(paciente.id);
        setPacienteNombre(paciente.nombre);
        setPacienteTelefono(paciente.telefono || '');
        setShowPacienteList(false);
    };

    /**
     * Auto-formatea la fecha mientras el usuario escribe.
     * Entrada del usuario: solo dígitos → Auto-inserta las barras /
     * Ejemplo: "15" → "15/" → "1503" → "15/03/" → "15032026" → "15/03/2026"
     */
    const handleFechaChange = (text) => {
        // Quitar todo lo que no sea dígito
        const digits = text.replace(/\D/g, '');

        let formatted = '';
        if (digits.length <= 2) {
            formatted = digits;
        } else if (digits.length <= 4) {
            formatted = digits.slice(0, 2) + '/' + digits.slice(2);
        } else {
            formatted = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
        }
        setFecha(formatted);
    };

    /**
     * Auto-formatea la hora mientras el usuario escribe.
     * Entrada del usuario: solo dígitos → Auto-inserta los dos puntos :
     * Ejemplo: "14" → "14:" → "1430" → "14:30"
     */
    const handleHoraChange = (text) => {
        const digits = text.replace(/\D/g, '');

        let formatted = '';
        if (digits.length <= 2) {
            formatted = digits;
        } else {
            formatted = digits.slice(0, 2) + ':' + digits.slice(2, 4);
        }
        setHora(formatted);
    };

    /**
     * Parsea la fecha y hora ingresadas y crea el turno en Firestore.
     * Formato esperado: fecha → DD/MM/AAAA, hora → HH:MM
     */
    const handleSave = async () => {
        // Validaciones
        if (!pacienteSeleccionado) {
            Alert.alert('Campo requerido', 'Seleccioná un paciente.');
            return;
        }
        if (!fecha.trim()) {
            Alert.alert('Campo requerido', 'Ingresá la fecha del turno.');
            return;
        }
        if (!hora.trim()) {
            Alert.alert('Campo requerido', 'Ingresá la hora del turno.');
            return;
        }

        // Parsear fecha DD/MM/AAAA
        const partes = fecha.split('/');
        if (partes.length !== 3 || partes[2].length !== 4) {
            Alert.alert('Formato inválido', 'La fecha debe tener formato DD/MM/AAAA.');
            return;
        }
        const [dia, mes, anio] = partes.map(Number);

        // Validar rangos del día y mes
        if (mes < 1 || mes > 12) {
            Alert.alert('Fecha inválida', 'El mes debe estar entre 01 y 12.');
            return;
        }
        if (dia < 1 || dia > 31) {
            Alert.alert('Fecha inválida', 'El día debe estar entre 01 y 31.');
            return;
        }

        // Parsear hora HH:MM
        const horaPartes = hora.split(':');
        if (horaPartes.length !== 2) {
            Alert.alert('Formato inválido', 'La hora debe tener formato HH:MM.');
            return;
        }
        const [horas, minutos] = horaPartes.map(Number);

        // Validar rango de hora (00:00 a 23:59)
        if (horas < 0 || horas > 23) {
            Alert.alert('Hora inválida', 'La hora debe estar entre 00 y 23.');
            return;
        }
        if (minutos < 0 || minutos > 59) {
            Alert.alert('Hora inválida', 'Los minutos deben estar entre 00 y 59.');
            return;
        }

        // Construir objeto Date
        const fechaHora = new Date(anio, mes - 1, dia, horas, minutos);

        if (isNaN(fechaHora.getTime())) {
            Alert.alert('Fecha inválida', 'Verificá que la fecha y hora sean correctas.');
            return;
        }

        // Validar que la fecha no sea en el pasado (mínimo hoy)
        const ahora = new Date();
        const hoyInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        const fechaSinHora = new Date(anio, mes - 1, dia);

        if (fechaSinHora < hoyInicio) {
            Alert.alert(
                'Fecha pasada',
                'No se puede programar un turno en una fecha anterior a hoy. Ingresá una fecha desde hoy en adelante.'
            );
            return;
        }

        setIsLoading(true);
        try {
            await createTurno({
                paciente_id: pacienteSeleccionado,
                pacienteNombre: pacienteNombre,
                pacienteTelefono: pacienteTelefono,  // Para mostrar en la card del turno
                medico_id: '',           // Sin médico asignado inicialmente
                medicoNombre: '',        // Se asigna cuando un médico acepta el turno
                fecha_hora: fechaHora,
                notas: notas.trim(),
            });

            // 📩 Notificar que se creó el turno (notificación local)
            try {
                await notifyTurnoCreado(pacienteNombre, fechaHora);
            } catch (notifError) {
                // No bloquear la creación del turno si falla la notificación
                if (__DEV__) console.warn('Notificación no enviada:', notifError?.message);
            }

            Alert.alert('✅ Turno creado', 'El turno se programó exitosamente.');
            navigation.goBack();
        } catch (error) {
            if (__DEV__) console.error('Error al crear turno:', error);
            Alert.alert('Error', 'No se pudo crear el turno. Intentá de nuevo.');
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
                    {/* ── Título ── */}
                    <Text style={styles.title}>Nuevo Turno</Text>
                    <Text style={styles.subtitle}>
                        Programá una nueva cita médica
                    </Text>

                    {/* ── Selector de Paciente ── */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Paciente *</Text>
                        <TouchableOpacity
                            style={styles.selectorButton}
                            onPress={() => setShowPacienteList(!showPacienteList)}
                        >
                            <Text style={[
                                styles.selectorText,
                                !pacienteNombre && styles.selectorPlaceholder,
                            ]}>
                                {pacienteNombre || 'Seleccioná un paciente...'}
                            </Text>
                            <Text style={styles.selectorArrow}>
                                {showPacienteList ? '▲' : '▼'}
                            </Text>
                        </TouchableOpacity>

                        {/* Lista desplegable de pacientes con búsqueda */}
                        {showPacienteList && (
                            <View style={styles.dropdownList}>
                                {/* Campo de búsqueda */}
                                <View style={styles.searchContainer}>
                                    <Text style={styles.searchIcon}>🔍</Text>
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Buscar paciente por nombre..."
                                        placeholderTextColor={theme.colors.textMuted}
                                        value={busquedaPaciente}
                                        onChangeText={setBusquedaPaciente}
                                        autoFocus={true}
                                    />
                                    {busquedaPaciente.length > 0 && (
                                        <TouchableOpacity onPress={() => setBusquedaPaciente('')}>
                                            <Text style={styles.searchClear}>✕</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Lista scrolleable de pacientes */}
                                <ScrollView
                                    style={styles.dropdownScroll}
                                    nestedScrollEnabled={true}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {pacientesFiltrados.map((p) => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[
                                                styles.dropdownItem,
                                                pacienteSeleccionado === p.id && styles.dropdownItemSelected,
                                            ]}
                                            onPress={() => selectPaciente(p)}
                                        >
                                            <Text style={styles.dropdownItemText}>{p.nombre}</Text>
                                            <Text style={styles.dropdownItemSub}>{p.direccion}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    {pacientesFiltrados.length === 0 && busquedaPaciente.trim() !== '' && (
                                        <Text style={styles.dropdownEmpty}>
                                            No se encontraron pacientes con "{busquedaPaciente}"
                                        </Text>
                                    )}
                                    {pacientes.length === 0 && (
                                        <Text style={styles.dropdownEmpty}>No hay pacientes registrados</Text>
                                    )}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* ── Campo: Fecha ── */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Fecha *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="DD/MM/AAAA"
                            placeholderTextColor={theme.colors.textMuted}
                            keyboardType="number-pad"
                            maxLength={10}
                            value={fecha}
                            onChangeText={handleFechaChange}
                        />
                    </View>

                    {/* ── Campo: Hora ── */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Hora *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="HH:MM"
                            placeholderTextColor={theme.colors.textMuted}
                            keyboardType="number-pad"
                            maxLength={5}
                            value={hora}
                            onChangeText={handleHoraChange}
                        />
                    </View>

                    {/* ── Campo: Notas ── */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Notas adicionales</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Observaciones o instrucciones especiales..."
                            placeholderTextColor={theme.colors.textMuted}
                            multiline={true}
                            numberOfLines={3}
                            textAlignVertical="top"
                            value={notas}
                            onChangeText={setNotas}
                        />
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
                            <Text style={styles.saveButtonText}>Programar Turno</Text>
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
    textArea: {
        height: 90,
        textAlignVertical: 'top',
        paddingTop: theme.spacing.m,
    },
    // ── Selector de paciente ──
    selectorButton: {
        ...theme.commonStyles.input,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectorText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.text,
        flex: 1,
    },
    selectorPlaceholder: {
        color: theme.colors.textMuted,
    },
    selectorArrow: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginLeft: theme.spacing.s,
    },
    // ── Dropdown ──
    dropdownList: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginTop: theme.spacing.xs,
        maxHeight: 300,
        ...theme.shadows.medium,
    },
    dropdownScroll: {
        maxHeight: 240,
    },
    // ── Search dentro del dropdown ──
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: theme.borderRadius.m,
        borderTopRightRadius: theme.borderRadius.m,
    },
    searchIcon: {
        fontSize: 14,
        marginRight: theme.spacing.s,
    },
    searchInput: {
        flex: 1,
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.text,
        paddingVertical: Platform.OS === 'ios' ? theme.spacing.xs : 0,
    },
    searchClear: {
        fontSize: 16,
        color: theme.colors.textMuted,
        paddingHorizontal: theme.spacing.xs,
    },
    dropdownItem: {
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dropdownItemSelected: {
        backgroundColor: theme.colors.accent + '10',
    },
    dropdownItemText: {
        fontFamily: theme.typography.primaryBold,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.primary,
    },
    dropdownItemSub: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textLight,
        marginTop: 2,
    },
    dropdownEmpty: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.textMuted,
        textAlign: 'center',
        padding: theme.spacing.m,
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
});
