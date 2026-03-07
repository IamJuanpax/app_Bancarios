/**
 * ============================================================
 * TURNOS SCREEN – Listado de turnos / agenda
 * ============================================================
 * 
 * Muestra la agenda de turnos del sistema.
 * - Admin: ve TODOS los turnos de todos los médicos
 * - Médico: ve solo sus turnos asignados
 * 
 * Features:
 *   - Filtro por estado (todos, pendientes, aceptados, completados)
 *   - Pull-to-refresh
 *   - FAB para crear nuevo turno
 *   - Navegación al detalle del turno
 * 
 * Los turnos se almacenan en Firestore (CONTEXT.md §3 FR4)
 * con estados: pendiente / aceptado / completado / cancelado.
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getTurnosByMedico, getAllTurnos } from '../services/turnos';
import TurnoCard from '../components/TurnoCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

// Filtros de estado disponibles
const FILTROS = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'aceptado', label: 'Aceptados' },
    { key: 'completado', label: 'Completados' },
];

export default function TurnosScreen({ navigation }) {
    const { user, userRole } = useAuth();

    // ── Estado ──
    const [turnos, setTurnos] = useState([]);
    const [filtroActivo, setFiltroActivo] = useState('todos');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            // Todos ven todos los turnos (los pendientes no tienen médico asignado)
            const data = await getAllTurnos();
            setTurnos(data);
        } catch (error) {
            if (__DEV__) console.error('Error al cargar turnos:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    /**
     * Lógica de filtrado combinada (Estado + Texto de búsqueda)
     */
    const turnosFiltrados = turnos.filter(turno => {
        // 1. Filtrar por estado (chips)
        const coincideEstado = filtroActivo === 'todos' || turno.estado === filtroActivo;
        
        // 2. Filtrar por texto (lupita)
        const searchLower = searchQuery.toLowerCase().trim();
        const coincideBusqueda = 
            !searchLower || 
            turno.pacienteNombre?.toLowerCase().includes(searchLower) ||
            turno.medicoNombre?.toLowerCase().includes(searchLower) ||
            turno.estado?.toLowerCase().includes(searchLower) ||
            turno.direccion?.toLowerCase().includes(searchLower);

        return coincideEstado && coincideBusqueda;
    });

    if (loading) return <LoadingSpinner message="Cargando turnos..." />;

    return (
        <SafeAreaView style={styles.container}>
            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.title}>Agenda</Text>
                        <Text style={styles.count}>
                            {turnosFiltrados.length === turnos.length 
                                ? `${turnos.length} turnos totales`
                                : `Mostrando ${turnosFiltrados.length} de ${turnos.length}`
                            }
                        </Text>
                    </View>
                </View>

                {/* ── Barra de Búsqueda (Lupita) ── */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar paciente, médico o estado..."
                            placeholderTextColor={theme.colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCapitalize="none"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Text style={styles.clearIcon}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* ── Filtros de estado ── */}
            <View>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={FILTROS}
                    contentContainerStyle={styles.filterRow}
                    keyExtractor={(item) => item.key}
                    renderItem={({ item: filtro }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                filtroActivo === filtro.key && styles.filterChipActive,
                            ]}
                            onPress={() => setFiltroActivo(filtro.key)}
                        >
                            <Text style={[
                                styles.filterText,
                                filtroActivo === filtro.key && styles.filterTextActive,
                            ]}>
                                {filtro.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* ── Lista de turnos ── */}
            {turnosFiltrados.length > 0 ? (
                <FlatList
                    data={turnosFiltrados}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[theme.colors.accent]}
                        />
                    }
                    renderItem={({ item }) => (
                        <TurnoCard
                            turno={item}
                            showPatient={true}
                            showDoctor={userRole === 'admin'}
                            onPress={() => navigation.navigate('DetalleTurno', { turnoId: item.id })}
                        />
                    )}
                />
            ) : (
                <EmptyState
                    icon="📅"
                    title="No hay turnos"
                    message={
                        filtroActivo !== 'todos'
                            ? `No hay turnos con estado "${filtroActivo}"`
                            : 'Aún no se han programado turnos.'
                    }
                    actionLabel="Crear Turno"
                    onAction={() => navigation.navigate('CrearTurno')}
                />
            )}

            {/* ── FAB: Botón flotante para nuevo turno ── */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CrearTurno')}
                activeOpacity={0.8}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
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
        paddingBottom: theme.spacing.m,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.m,
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
        marginTop: theme.spacing.xs,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.m,
        paddingHorizontal: theme.spacing.m,
        height: 48,
        ...theme.shadows.light,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    searchIcon: {
        fontSize: 18,
        marginRight: theme.spacing.s,
    },
    searchInput: {
        flex: 1,
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.m,
        color: theme.colors.text,
        height: '100%',
    },
    clearIcon: {
        fontSize: 14,
        color: theme.colors.textMuted,
        padding: theme.spacing.xs,
    },
    // ── Filtros ──
    filterRow: {
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.m,
        gap: theme.spacing.s,
    },
    filterChip: {
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.m,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.white,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterChipActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
    },
    filterText: {
        fontFamily: theme.typography.primary,
        fontSize: theme.typography.sizes.s,
        color: theme.colors.textLight,
    },
    filterTextActive: {
        fontFamily: theme.typography.primaryBold,
        color: theme.colors.white,
    },
    // ── Lista ──
    listContent: {
        paddingHorizontal: theme.spacing.m,
        paddingBottom: theme.spacing.xxxl + 40,
    },
    // ── FAB ──
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
