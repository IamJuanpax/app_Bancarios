/**
 * ============================================================
 * HOME SCREEN – Dashboard principal
 * ============================================================
 * 
 * Pantalla inicial después del login. Muestra un resumen ejecutivo:
 *   - Saludo personalizado con el rol del usuario
 *   - Estadísticas en cards (pacientes, turnos pendientes, completados)
 *   - Lista de los próximos turnos del día
 *   - Accesos rápidos a las secciones principales
 * 
 * Los datos se consultan con getDocs (consulta puntual) al montar
 * y con pull-to-refresh manual, evitando listeners en tiempo real
 * para optimizar costos (CONTEXT.md §2).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getPacientes } from '../services/pacientes';
import { getTurnosByMedico, getAllTurnos } from '../services/turnos';
import StatCard from '../components/StatCard';
import TurnoCard from '../components/TurnoCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

export default function HomeScreen({ navigation }) {
  // ── Estado ──
  const { user, userRole, userName, logout } = useAuth();
  const [pacientes, setPacientes] = useState([]);      // Lista de pacientes
  const [turnos, setTurnos] = useState([]);            // Lista de turnos
  const [loading, setLoading] = useState(true);        // Carga inicial
  const [refreshing, setRefreshing] = useState(false); // Pull-to-refresh

  /**
   * Carga los datos del dashboard.
   * useFocusEffect asegura que se recarguen al volver a esta pantalla
   * (por ejemplo, después de crear un paciente o turno).
   */
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Cargar pacientes (todos los médicos ven todos, FR2)
      const pacientesData = await getPacientes();
      setPacientes(pacientesData);

      // Cargar todos los turnos (los pendientes no tienen médico asignado)
      const turnosData = await getAllTurnos();
      setTurnos(turnosData);
    } catch (error) {
      if (__DEV__) console.error('Error al cargar datos del dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull-to-refresh: recargar datos manualmente
  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Cerrar sesión con confirmación
  const handleLogout = () => {
    logout();
  };

  // ── Cálculo de métricas ──
  const turnosPendientes = turnos.filter(t => t.estado === 'pendiente').length;
  
  // Turnos de hoy filtrados por médico si no es admin
  const turnosHoy = turnos.filter(t => {
    if (!t.fecha_hora) return false;
    const fecha = t.fecha_hora.toDate ? t.fecha_hora.toDate() : new Date(t.fecha_hora);
    const hoy = new Date();
    const esHoy = fecha.toDateString() === hoy.toDateString();
    
    // Si es médico, solo ve los suyos de hoy
    if (userRole === 'medico') {
      return esHoy && t.medicoId === user.uid;
    }
    return esHoy;
  });

  // Turnos completados filtrados por médico
  const turnosCompletados = turnos.filter(t => {
    const esCompletado = t.estado === 'completado';
    if (userRole === 'medico') {
      return esCompletado && t.medicoId === user.uid;
    }
    return esCompletado;
  }).length;

  // ── Carga inicial ──
  if (loading) {
    return <LoadingSpinner message="Cargando dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header: Saludo + Logout ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hola{userName ? `, ${userName}` : (user?.displayName ? `, ${user.displayName}` : '')} 👋
            </Text>
            <Text style={styles.role}>
              {userRole === 'admin' ? '🛡️ Administrador' : '👨‍⚕️ Médico'}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tarjetas de estadísticas ── */}
        <View style={styles.statsRow}>
          <StatCard
            icon="🧑‍🦽"
            value={pacientes.length}
            label="Pacientes"
            color={theme.colors.accent}
            onPress={() => navigation.navigate('Pacientes')}
          />
          <StatCard
            icon="🕐"
            value={turnosPendientes}
            label="Pendientes"
            color={theme.colors.warning}
            onPress={() => navigation.navigate('Turnos', { initialFilter: 'pendiente' })}
          />
          <StatCard
            icon="✅"
            value={turnosCompletados}
            label="Completados"
            color={theme.colors.success}
            onPress={() => navigation.navigate('Turnos', { initialFilter: 'completado' })}
          />
        </View>

        {/* ── Accesos rápidos ── */}
        <Text style={styles.sectionTitle}>Acceso Rápido</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Pacientes')}
          >
            <Text style={styles.quickActionIcon}>👥</Text>
            <Text style={styles.quickActionLabel}>Pacientes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('CrearPaciente')}
          >
            <Text style={styles.quickActionIcon}>➕</Text>
            <Text style={styles.quickActionLabel}>Nuevo Pac.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Turnos')}
          >
            <Text style={styles.quickActionIcon}>📅</Text>
            <Text style={styles.quickActionLabel}>Turnos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('CrearTurno')}
          >
            <Text style={styles.quickActionIcon}>🗓️</Text>
            <Text style={styles.quickActionLabel}>Nuevo Turno</Text>
          </TouchableOpacity>
        </View>

        {/* ── Turnos del día ── */}
        <Text style={styles.sectionTitle}>
          Turnos de Hoy ({turnosHoy.length})
        </Text>

        {turnosHoy.length > 0 ? (
          turnosHoy.map(turno => (
            <TurnoCard
              key={turno.id}
              turno={turno}
              showPatient={true}
              showDoctor={userRole === 'admin'}
              onPress={() => navigation.navigate('DetalleTurno', { turnoId: turno.id })}
            />
          ))
        ) : (
          <View style={styles.noTurnosCard}>
            <Text style={styles.noTurnosText}>📭 No hay turnos programados para hoy</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxxl,
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.l,
    paddingTop: theme.spacing.m,
  },
  greeting: {
    fontFamily: theme.typography.secondaryBold,
    fontSize: theme.typography.sizes.xxl,
    color: theme.colors.primary,
  },
  role: {
    fontFamily: theme.typography.primary,
    fontSize: theme.typography.sizes.m,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
  },
  logoutButton: {
    backgroundColor: theme.colors.errorLight,
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    borderRadius: theme.borderRadius.xl,
  },
  logoutText: {
    fontFamily: theme.typography.primaryBold,
    fontSize: theme.typography.sizes.s,
    color: theme.colors.error,
  },
  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.l,
  },
  // ── Sección ──
  sectionTitle: {
    fontFamily: theme.typography.secondaryBold,
    fontSize: theme.typography.sizes.l,
    color: theme.colors.primary,
    marginBottom: theme.spacing.m,
  },
  // ── Quick Actions ──
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.l,
    gap: theme.spacing.s,
  },
  quickActionButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.l,
    padding: theme.spacing.m,
    alignItems: 'center',
    flex: 1,
    minWidth: '22%',
    ...theme.shadows.light,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: theme.spacing.xs,
  },
  quickActionLabel: {
    fontFamily: theme.typography.primary,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  // ── No Turnos ──
  noTurnosCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.l,
    padding: theme.spacing.l,
    alignItems: 'center',
    ...theme.shadows.light,
  },
  noTurnosText: {
    fontFamily: theme.typography.primary,
    fontSize: theme.typography.sizes.m,
    color: theme.colors.textLight,
  },
});
