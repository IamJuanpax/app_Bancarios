/**
 * ============================================================
 * APP NAVIGATOR – Sistema de navegación completo
 * ============================================================
 * 
 * Estructura de navegación:
 * 
 * Si NO está autenticado → Login Screen
 * Si SÍ está autenticado → Stack principal:
 *   ├── Home (Dashboard)
 *   ├── Pacientes (Lista)
 *   ├── DetallePaciente
 *   ├── CrearPaciente (Formulario)
 *   ├── EditarPaciente (Formulario reutilizado)
 *   ├── NuevaEntradaHistoria
 *   ├── Turnos (Lista/Agenda)
 *   ├── CrearTurno (Formulario)
 *   └── DetalleTurno
 * 
 * La decisión de mostrar Login o el stack principal se basa
 * en el estado del AuthContext (user !== null).
 * 
 * Se usan NativeStack para navegación performante con transiciones
 * nativas del sistema operativo.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

// ── Pantallas ──
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import PacientesScreen from '../screens/PacientesScreen';
import DetallePacienteScreen from '../screens/DetallePacienteScreen';
import PacienteFormScreen from '../screens/PacienteFormScreen';
import NuevaEntradaHistoriaScreen from '../screens/NuevaEntradaHistoriaScreen';
import TurnosScreen from '../screens/TurnosScreen';
import CrearTurnoScreen from '../screens/CrearTurnoScreen';
import DetalleTurnoScreen from '../screens/DetalleTurnoScreen';

const Stack = createNativeStackNavigator();

/**
 * Opciones globales de estilo para el header de navegación.
 * Aplica los colores y tipografías del theme a todas las pantallas.
 */
const defaultScreenOptions = {
  headerStyle: {
    backgroundColor: theme.colors.white,
  },
  headerTintColor: theme.colors.primary,
  headerTitleStyle: {
    fontFamily: theme.typography.secondaryBold,
    fontSize: theme.typography.sizes.l,
  },
  headerShadowVisible: false, // Sin sombra debajo del header (estilo limpio)
  contentStyle: {
    backgroundColor: theme.colors.background,
  },
};

export default function AppNavigator({ navigationRef }) {
  // Obtener estado de autenticación del contexto
  const { user, loading } = useAuth();

  // Mientras se resuelve la sesión inicial, mostrar spinner
  if (loading) {
    return <LoadingSpinner message="Iniciando RehabMobile..." />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={defaultScreenOptions}>
        {user ? (
          // ═══ USUARIO AUTENTICADO ═══
          // Stack principal con todas las pantallas de la app
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}  // El Home tiene su propio header custom
            />

            {/* ── Flujo de Pacientes ── */}
            <Stack.Screen
              name="Pacientes"
              component={PacientesScreen}
              options={{ title: 'Pacientes' }}
            />
            <Stack.Screen
              name="DetallePaciente"
              component={DetallePacienteScreen}
              options={({ route }) => ({
                title: route.params?.pacienteNombre || 'Paciente',
              })}
            />
            <Stack.Screen
              name="CrearPaciente"
              component={PacienteFormScreen}
              options={{ title: 'Nuevo Paciente' }}
            />
            <Stack.Screen
              name="EditarPaciente"
              component={PacienteFormScreen}
              options={{ title: 'Editar Paciente' }}
            />
            <Stack.Screen
              name="NuevaEntradaHistoria"
              component={NuevaEntradaHistoriaScreen}
              options={{ title: 'Nueva Entrada' }}
            />

            {/* ── Flujo de Turnos ── */}
            <Stack.Screen
              name="Turnos"
              component={TurnosScreen}
              options={{ title: 'Agenda' }}
            />
            <Stack.Screen
              name="CrearTurno"
              component={CrearTurnoScreen}
              options={{ title: 'Nuevo Turno' }}
            />
            <Stack.Screen
              name="DetalleTurno"
              component={DetalleTurnoScreen}
              options={{ title: 'Detalle del Turno' }}
            />
          </>
        ) : (
          // ═══ USUARIO NO AUTENTICADO ═══
          // Solo se muestra la pantalla de Login
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }} // Login sin header
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
