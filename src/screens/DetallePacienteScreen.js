/**
 * ============================================================
 * DETALLE PACIENTE – Vista completa de un paciente
 * ============================================================
 * 
 * Muestra todos los datos de un paciente específico, incluyendo:
 *   - Información personal (nombre, dirección, teléfono, coordenadas)
 *   - Historia clínica evolutiva (entradas ordenadas por fecha desc)
 *   - Botón para agregar nueva entrada de historia clínica
 *   - Validación de cercanía (400m) usando GPS + Haversine
 *   - Botones de editar/eliminar (solo admin)
 * 
 * La historia clínica se almacena como documentos independientes
 * en la colección "historia_clinica" (no como sub-array del paciente),
 * para mejor escalabilidad (CONTEXT.md §4).
 * 
 * La validación de cercanía (FR3) bloquea la posibilidad de
 * agregar entradas si el médico está a más de 400 metros.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getPacienteById, deletePaciente } from '../services/pacientes';
import { getHistoriaByPaciente } from '../services/historiaClinica';
import { calculateDistance, isWithinRange } from '../utils/haversine';
import LoadingSpinner from '../components/LoadingSpinner';

export default function DetallePacienteScreen({ route, navigation }) {
    const { pacienteId } = route.params;
    const { user, userRole } = useAuth();

    // ── Estado ──
    const [paciente, setPaciente] = useState(null);
    const [historia, setHistoria] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [distancia, setDistancia] = useState(null); // Distancia en metros

    useFocusEffect(
        useCallback(() => {
            loadData();
            getUserLocation();
        }, [pacienteId])
    );

    const loadData = async () => {
        try {
            // Obtener datos del paciente
            const pacienteData = await getPacienteById(pacienteId);
            setPaciente(pacienteData);

            // Obtener historia clínica (documentos independientes)
            const historiaData = await getHistoriaByPaciente(pacienteId);
            setHistoria(historiaData);
        } catch (error) {
            console.error('Error al cargar paciente:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    /**
     * Obtiene la ubicación del médico y calcula la distancia al paciente.
     * Usa la fórmula de Haversine (costo 0, sin APIs externas, FR3).
     */
    const getUserLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                const userLoc = {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                };
                setUserLocation(userLoc);
            }
        } catch (error) {
            console.warn('No se pudo obtener ubicación:', error);
        }
    };

    // Calcular distancia cuando ambas ubicaciones están disponibles
    React.useEffect(() => {
        if (userLocation && paciente?.coordenadas) {
            const dist = calculateDistance(
                userLocation.lat, userLocation.lng,
                paciente.coordenadas.lat, paciente.coordenadas.lng
            );
            setDistancia(dist);
        }
    }, [userLocation, paciente]);

    // ¿El médico está dentro de los 400m? (FR3)
    const withinRange = distancia !== null && distancia <= 400;

    /**
     * Elimina el paciente (solo admin puede hacerlo).
     * Pide confirmación antes de ejecutar.
     */
    const handleDelete = () => {
        Alert.alert(
            'Eliminar Paciente',
            `¿Estás seguro de que querés eliminar a ${paciente.nombre}? Esta acción no se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deletePaciente(pacienteId);
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo eliminar el paciente.');
                        }
                    },
                },
            ]
        );
    };

    /**
     * Formatea un Timestamp de Firestore a string legible.
     */
    const formatDate = (fecha) => {
        if (!fecha) return 'Sin fecha';
        const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
        return date.toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    if (loading) return <LoadingSpinner message="Cargando paciente..." />;
    if (!paciente) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Paciente no encontrado</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
                }
            >
                {/* ── Cabecera con info del paciente ── */}
                <View style={styles.profileCard}>
                    {/* Ícono de perfil */}
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>
                            {paciente.nombre?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                    </View>

                    <Text style={styles.patientName}>{paciente.nombre}</Text>

                    {/* Dirección */}
                    <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>📍</Text>
                        <Text style={styles.infoText}>{paciente.direccion || 'Sin dirección'}</Text>
                    </View>

                    {/* Teléfono */}
                    {paciente.telefono && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoIcon}>📞</Text>
                            <Text style={styles.infoText}>{paciente.telefono}</Text>
                        </View>
                    )}

                    {/* Indicador de distancia (si hay GPS) */}
                    {distancia !== null && (
                        <View style={[
                            styles.distanceBanner,
                            withinRange ? styles.distanceBannerOk : styles.distanceBannerFar,
                        ]}>
                            <Text style={styles.distanceBannerIcon}>
                                {withinRange ? '✅' : '⚠️'}
                            </Text>
                            <Text style={[
                                styles.distanceBannerText,
                                { color: withinRange ? theme.colors.success : theme.colors.error }
                            ]}>
                                {withinRange
                                    ? `Estás a ${Math.round(distancia)}m – Dentro del rango`
                                    : `Estás a ${Math.round(distancia)}m – Fuera del rango (máx 400m)`
                                }
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Acciones ── */}
                <View style={styles.actions}>
                    {userRole === 'admin' && (
                        <>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => navigation.navigate('EditarPaciente', { pacienteId })}
                            >
                                <Text style={styles.actionIcon}>✏️</Text>
                                <Text style={styles.actionLabel}>Editar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionButton, styles.actionButtonDanger]}
                                onPress={handleDelete}
                            >
                                <Text style={styles.actionIcon}>🗑️</Text>
                                <Text style={[styles.actionLabel, { color: theme.colors.error }]}>Eliminar</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('CrearTurno', { pacienteId, pacienteNombre: paciente.nombre })}
                    >
                        <Text style={styles.actionIcon}>📅</Text>
                        <Text style={styles.actionLabel}>Crear Turno</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Historia Clínica ── */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Historia Clínica</Text>
                    <TouchableOpacity
                        style={[
                            styles.addEntryButton,
                            !withinRange && distancia !== null && styles.addEntryButtonDisabled,
                        ]}
                        onPress={() => {
                            // Validación de cercanía (FR3)
                            if (distancia !== null && !withinRange) {
                                Alert.alert(
                                    'Fuera de rango',
                                    'Debés estar a menos de 400 metros del paciente para registrar una entrada en la historia clínica.',
                                    [{ text: 'Entendido' }]
                                );
                                return;
                            }
                            navigation.navigate('NuevaEntradaHistoria', {
                                pacienteId,
                                pacienteNombre: paciente.nombre,
                            });
                        }}
                    >
                        <Text style={styles.addEntryButtonText}>+ Agregar</Text>
                    </TouchableOpacity>
                </View>

                {/* Entradas de historia clínica */}
                {historia.length > 0 ? (
                    historia.map((entrada) => (
                        <View key={entrada.id} style={styles.historiaCard}>
                            {/* Fecha y médico */}
                            <View style={styles.historiaHeader}>
                                <Text style={styles.historiaDate}>{formatDate(entrada.fecha)}</Text>
                                <Text style={styles.historiaMedico}>
                                    Dr. {entrada.medicoNombre || 'Desconocido'}
                                </Text>
                            </View>

                            {/* Notas clínicas */}
                            <Text style={styles.historiaNota}>{entrada.nota}</Text>

                            {/* Progreso */}
                            {entrada.progreso && (
                                <View style={styles.progresoContainer}>
                                    <Text style={styles.progresoLabel}>Progreso:</Text>
                                    <Text style={styles.progresoText}>{entrada.progreso}</Text>
                                </View>
                            )}
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyHistoria}>
                        <Text style={styles.emptyHistoriaIcon}>📋</Text>
                        <Text style={styles.emptyHistoriaText}>
                            No hay entradas en la historia clínica
                        </Text>
                    </View>
                )}
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
    // ── Profile Card ──
    profileCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        ...theme.shadows.medium,
    },
    avatarContainer: {
        width: 72,
        height: 72,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.accent + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    avatarText: {
        fontFamily: theme.typography.secondaryBold,
        fontSize: 28,
        color: theme.colors.accent,
    },
    patientName: {
        fontFamily: theme.typography.secondaryBold,
        fontSize: theme.typography.sizes.xl,
        color: theme.colors.primary,
        marginBottom: theme.spacing.m,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    infoIcon: {
        fontSize: 16,
        marginRight: theme.spacing.s,
    },
    infoText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.textLight,
    },
    // ── Distance Banner ──
    distanceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.s,
        borderRadius: theme.borderRadius.m,
        marginTop: theme.spacing.m,
        width: '100%',
    },
    distanceBannerOk: {
        backgroundColor: theme.colors.successLight,
    },
    distanceBannerFar: {
        backgroundColor: theme.colors.errorLight,
    },
    distanceBannerIcon: {
        fontSize: 16,
        marginRight: theme.spacing.s,
    },
    distanceBannerText: {
        flex: 1,
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
    },
    // ── Actions ──
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: theme.spacing.l,
    },
    actionButton: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: theme.spacing.xs,
        ...theme.shadows.light,
    },
    actionButtonDanger: {
        borderWidth: 1,
        borderColor: theme.colors.errorLight,
    },
    actionIcon: {
        fontSize: 20,
        marginBottom: theme.spacing.xs,
    },
    actionLabel: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textLight,
    },
    // ── Section Header ──
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    sectionTitle: {
        fontFamily: theme.typography.secondaryBold,
        fontSize: theme.typography.sizes.l,
        color: theme.colors.primary,
    },
    addEntryButton: {
        backgroundColor: theme.colors.accent,
        paddingVertical: theme.spacing.xs + 2,
        paddingHorizontal: theme.spacing.m,
        borderRadius: theme.borderRadius.xl,
    },
    addEntryButtonDisabled: {
        backgroundColor: theme.colors.textMuted,
        opacity: 0.6,
    },
    addEntryButtonText: {
        fontFamily: theme.typography.primaryBold,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.white,
    },
    // ── Historia Clínica Cards ──
    historiaCard: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.accent,
        ...theme.shadows.light,
    },
    historiaHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.s,
    },
    historiaDate: {
        fontFamily: theme.typography.primaryBold,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.primary,
    },
    historiaMedico: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.textLight,
    },
    historiaNota: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.text,
        lineHeight: 22,
    },
    progresoContainer: {
        marginTop: theme.spacing.s,
        backgroundColor: theme.colors.accentLight + '30',
        padding: theme.spacing.s,
        borderRadius: theme.borderRadius.m,
    },
    progresoLabel: {
        fontFamily: theme.typography.primaryBold,
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.accentDark,
        marginBottom: theme.spacing.xs,
    },
    progresoText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.text,
    },
    // ── Empty Historia ──
    emptyHistoria: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.xl,
        alignItems: 'center',
        ...theme.shadows.light,
    },
    emptyHistoriaIcon: {
        fontSize: 40,
        marginBottom: theme.spacing.s,
    },
    emptyHistoriaText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.textLight,
        textAlign: 'center',
    },
});
