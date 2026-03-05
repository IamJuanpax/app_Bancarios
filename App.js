/**
 * ============================================================
 * APP.JS – Punto de entrada principal de RehabMobile
 * ============================================================
 * 
 * Responsabilidades:
 * 1. Cargar las fuentes personalizadas (Inter y Montserrat) con expo-font
 * 2. Envolver toda la app en el AuthProvider (contexto de autenticación)
 * 3. Envolver en NotificationProvider (notificaciones locales)
 * 4. Mostrar un splash/spinner mientras se cargan las fuentes
 * 5. Renderizar el sistema de navegación principal
 * 
 * Jerarquía de componentes:
 *   App
 *   └── AuthProvider               (Contexto de autenticación global)
 *       └── NotificationProvider   (Notificaciones locales, costo $0)
 *           └── AppNavigator       (Sistema de navegación)
 *               ├── LoginScreen    (Si no está autenticado)
 *               └── [Stack]        (Si está autenticado)
 */

import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as Font from 'expo-font';
import {
  Inter_400Regular,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';

// Importar contextos y navegador
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/theme';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const navigationRef = useRef(null);  // Ref para navegación desde notificaciones

  useEffect(() => {
    /**
     * Carga asíncrona de las fuentes personalizadas.
     * Se registran con los nombres que usa theme.typography:
     *   - 'Inter-Regular'      → Texto body
     *   - 'Inter-Bold'         → Texto enfático
     *   - 'Montserrat-Regular' → Títulos secundarios
     *   - 'Montserrat-Bold'    → Títulos principales
     */
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Inter-Regular': Inter_400Regular,
          'Inter-Bold': Inter_700Bold,
          'Montserrat-Regular': Montserrat_400Regular,
          'Montserrat-Bold': Montserrat_700Bold,
        });
      } catch (error) {
        console.warn('Error al cargar fuentes:', error);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  // Mostrar spinner mientras se cargan las fuentes
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <>
      {/* Barra de estado con estilo automático (oscuro en fondos claros) */}
      <StatusBar style="auto" />

      {/* 
        AuthProvider envuelve toda la app para que cualquier componente
        pueda acceder al estado de autenticación con useAuth().
        
        NotificationProvider gestiona las notificaciones locales (costo $0).
        Recibe navigationRef para deep-linking al tocar notificaciones.
      */}
      <AuthProvider>
        <NotificationProvider navigationRef={navigationRef}>
          <AppNavigator navigationRef={navigationRef} />
        </NotificationProvider>
      </AuthProvider>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});