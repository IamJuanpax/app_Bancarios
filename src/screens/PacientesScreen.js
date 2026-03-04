/**
 * ============================================================
 * PACIENTES SCREEN – Listado de todos los pacientes
 * ============================================================
 * 
 * Muestra la lista completa de pacientes registrados en el sistema.
 * Todos los médicos pueden ver todos los pacientes (visibilidad
 * compartida, CONTEXT.md §3, FR2).
 * 
 * Features:
 *   - Búsqueda por nombre en tiempo local (sin consultas extra a Firestore)
 *   - Pull-to-refresh para recargar datos
 *   - FAB (botón flotante) para agregar nuevo paciente (solo admin)
 *   - Cálculo de distancia del médico a cada paciente usando Haversine
 *   - Navegación al detalle del paciente al presionar una card
 * 
 * La ubicación del médico se obtiene con expo-location para calcular
 * la distancia a cada paciente y mostrar el badge verde/rojo.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getPacientes } from '../services/pacientes';
import { calculateDistance } from '../utils/haversine';
import PatientCard from '../components/PatientCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

export default function PacientesScreen({ navigation }) {
    const { userRole } = useAuth();
    // ── Estado ──
    const [pacientes, setPacientes] = useState([]);        // Lista completa
    const [searchQuery, setSearchQuery] = useState('');     // Filtro de búsqueda
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userLocation, setUserLocation] = useState(null); // Ubicación del médico

    /**
     * Recarga los datos cada vez que la pantalla obtiene el foco.
     * También solicita permisos de ubicación para calcular distancias.
     */
    useFocusEffect(
        useCallback(() => {
            loadData();
            getUserLocation();
        }, [])
    );

    const loadData = async () => {
        try {
            const data = await getPacientes();
            setPacientes(data);
        } catch (error) {
            console.error('Error al cargar pacientes:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    /**
     * Obtiene la ubicación actual del usuario (médico) usando expo-location.
     * Se usa para calcular la distancia a cada paciente con Haversine
     * (CONTEXT.md §3, FR3 – Lógica de Cercanía).
     */
    const getUserLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                setUserLocation({
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                });
            }
        } catch (error) {
            console.warn('No se pudo obtener la ubicación:', error);
        }
    };

    // Pull-to-refresh
    const onRefresh = () => {
        setRefreshing(true);
        loadData();
        getUserLocation();
    };

    /**
     * Filtra los pacientes por nombre según el texto de búsqueda.
     * La búsqueda es local (no va a Firestore), optimizando costos.
     */
    const filteredPacientes = pacientes.filter(p =>
        p.nombre?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    /**
     * Calcula la distancia entre la ubicación del médico y un paciente.
     * Retorna undefined si no hay ubicación disponible.
     */
    const getDistancia = (paciente) => {
        if (!userLocation || !paciente.coordenadas) return undefined;
        return calculateDistance(
            userLocation.lat,
            userLocation.lng,
            paciente.coordenadas.lat,
            paciente.coordenadas.lng
        );
    };

    if (loading) {
        return <LoadingSpinner message="Cargando pacientes..." />;
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <Text style={styles.title}>Pacientes</Text>
                <Text style={styles.count}>{pacientes.length} registrados</Text>
            </View>

            {/* ── Barra de búsqueda ── */}
            <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {/* Botón para limpiar búsqueda */}
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Text style={styles.clearIcon}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Lista de pacientes ── */}
            {filteredPacientes.length > 0 ? (
                <FlatList
                    data={filteredPacientes}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[theme.colors.accent]}
                            tintColor={theme.colors.accent}
                        />
                    }
                    renderItem={({ item }) => (
                        <PatientCard
                            paciente={item}
                            distancia={getDistancia(item)}
                            onPress={() => navigation.navigate('DetallePaciente', {
                                pacienteId: item.id,
                                pacienteNombre: item.nombre,
                            })}
                        />
                    )}
                />
            ) : (
                <EmptyState
                    icon="🧑‍🦽"
                    title="No hay pacientes"
                    message={
                        searchQuery
                            ? `No se encontraron resultados para "${searchQuery}"`
                            : 'Aún no se han registrado pacientes en el sistema.'
                    }
                    actionLabel={userRole === 'admin' ? 'Agregar Paciente' : undefined}
                    onAction={userRole === 'admin' ? () => navigation.navigate('CrearPaciente') : undefined}
                />
            )}

            {/* ── FAB: Botón flotante para agregar paciente (solo Admin) ── */}
            {userRole === 'admin' && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('CrearPaciente')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        paddingHorizontal: theme.spacing.m,
        paddingTop: theme.spacing.l,
        paddingBottom: theme.spacing.s,
    },
    title: {
        fontFamily: theme.typography.secondaryBold,
        fontSize: theme.typography.sizes.xxl,
        color: theme.colors.primary,
    },
    count: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.textLight,
        marginTop: theme.spacing.xs,
    },
    // ── Búsqueda ──
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        marginHorizontal: theme.spacing.m,
        marginVertical: theme.spacing.m,
        paddingHorizontal: theme.spacing.m,
        borderRadius: theme.borderRadius.xl,
        ...theme.shadows.light,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: theme.spacing.s,
    },
    searchInput: {
        flex: 1,
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.text,
        paddingVertical: theme.spacing.s + 4,
    },
    clearIcon: {
        fontSize: 16,
        color: theme.colors.textMuted,
        padding: theme.spacing.xs,
    },
    // ── Lista ──
    listContent: {
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.xxxl + 40, // Espacio para el FAB
    },
    // ── FAB (Floating Action Button) ──
    fab: {
        position: 'absolute',
        right: theme.spacing.l,
        bottom: theme.spacing.l,
        width: 56,
        height: 56,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.heavy,
    },
    fabText: {
        fontSize: 28,
        color: theme.colors.white,
        fontWeight: 'bold',
        lineHeight: 30,
    },
});
