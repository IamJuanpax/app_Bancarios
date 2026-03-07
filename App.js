/**
 * ============================================================
 * APP.JS – Punto de entrada principal de RehabMobile
 * ============================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import * as Font from 'expo-font';

// Silenciar warnings de notificaciones remotas (usamos solo locales)
LogBox.ignoreLogs([
  'expo-notifications',
  'Android Push notifications',
  'remote notifications',
]);

import {
  Inter_400Regular,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Montserrat_400Regular,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';

// Importar contextos, navegador y protector de errores
import { AuthProvider } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { theme } from './src/theme';

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const navigationRef = useRef(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Inter-Regular': Inter_400Regular,
          'Inter-Bold': Inter_700Bold,
          'Montserrat-Regular': Montserrat_400Regular,
          'Montserrat-Bold': Montserrat_700Bold,
        });
      } catch (error) {
        if (__DEV__) console.warn('Error al cargar fuentes:', error);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      {/* Barra de estado con estilo automático */}
      <StatusBar style="auto" />

      {/* Proveedores de contexto globales */}
      <AuthProvider>
        <NotificationProvider navigationRef={navigationRef}>
          <AppNavigator navigationRef={navigationRef} />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
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
