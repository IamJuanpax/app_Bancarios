/**
 * ============================================================
 * LOGIN SCREEN – Pantalla de inicio de sesión
 * ============================================================
 * 
 * Pantalla de acceso cerrado (CONTEXT.md §3, FR1).
 * Solo usuarios registrados por el administrador pueden ingresar.
 * 
 * Usa Firebase Auth con email y contraseña.
 * La pantalla incluye:
 *   - Logo y nombre de la app
 *   - Campos de email y contraseña
 *   - Botón de ingreso con estado de carga
 *   - Manejo de errores con mensajes amigables en español
 * 
 * Diseño: fondo claro, elementos centrados, estética premium médica.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  // ── Estado local ──
  const [email, setEmail] = useState('');           // Email del usuario
  const [password, setPassword] = useState('');      // Contraseña
  const [isLoading, setIsLoading] = useState(false); // Indicador de procesando
  const [error, setError] = useState('');             // Mensaje de error

  // Accedemos a la función login del contexto de autenticación
  const { login } = useAuth();

  /**
   * Maneja el intento de login.
   * Valida campos vacíos, luego intenta autenticar con Firebase.
   * Si falla, muestra un mensaje de error amigable.
   */
  const handleLogin = async () => {
    // Limpiar error previo
    setError('');

    // Validación básica de campos vacíos
    if (!email.trim() || !password.trim()) {
      setError('Por favor completá todos los campos.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      // Si el login es exitoso, el AuthContext detectará el cambio
      // y la navegación se actualizará automáticamente
    } catch (err) {
      // Mapear códigos de error de Firebase a mensajes amigables en español
      const errorMessages = {
        'auth/invalid-email': 'El formato del email no es válido.',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
        'auth/user-not-found': 'No existe una cuenta con este email.',
        'auth/wrong-password': 'La contraseña es incorrecta.',
        'auth/invalid-credential': 'Las credenciales son incorrectas.',
        'auth/too-many-requests': 'Demasiados intentos. Intentá más tarde.',
      };
      setError(errorMessages[err.code] || 'Error al iniciar sesión. Intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* ── Sección superior: Logo y branding ── */}
        <View style={styles.brandSection}>
          {/* Ícono circular con gradiente simulado */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🏥</Text>
          </View>
          <Text style={styles.title}>RehabMobile</Text>
          <Text style={styles.subtitle}>Acceso Profesional</Text>
        </View>

        {/* ── Formulario de login ── */}
        <View style={styles.formSection}>
          {/* Mensaje de error (si existe) */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Campo de Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="email-address"    // Teclado optimizado para email
              autoCapitalize="none"           // No capitalizar automáticamente
              autoCorrect={false}             // Sin autocorrección
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}            // Deshabilitar durante carga
            />
          </View>

          {/* Campo de Contraseña */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu contraseña"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={true}           // Ocultar caracteres
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              onSubmitEditing={handleLogin}     // Enter = intentar login
            />
          </View>

          {/* Botón de Ingreso */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled, // Estilo disabled durante carga
            ]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>Ingresar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Pie: Nota de acceso restringido ── */}
        <Text style={styles.footerNote}>
          Acceso restringido a personal autorizado
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  // ── Branding ──
  brandSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent + '15', // Verde muy suave
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
    ...theme.shadows.light,
  },
  logoIcon: {
    fontSize: 36,
  },
  title: {
    fontFamily: theme.typography.secondaryBold,
    fontSize: theme.typography.sizes.hero,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontFamily: theme.typography.primary,
    fontSize: theme.typography.sizes.l,
    color: theme.colors.textLight,
  },
  // ── Formulario ──
  formSection: {
    marginBottom: theme.spacing.xl,
  },
  inputGroup: {
    marginBottom: theme.spacing.m,
  },
  inputLabel: {
    fontFamily: theme.typography.primaryBold,
    fontSize: theme.typography.sizes.s,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  input: {
    ...theme.commonStyles.input,
  },
  // ── Botón de Login ──
  loginButton: {
    ...theme.commonStyles.buttonPrimary,
    marginTop: theme.spacing.s,
  },
  loginButtonDisabled: {
    opacity: 0.6, // Reducir opacidad cuando está deshabilitado/cargando
  },
  loginButtonText: {
    ...theme.commonStyles.buttonPrimaryText,
    fontSize: theme.typography.sizes.l,
  },
  // ── Error ──
  errorContainer: {
    backgroundColor: theme.colors.errorLight,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
  },
  errorText: {
    fontFamily: theme.typography.primary,
    fontSize: theme.typography.sizes.s,
    color: theme.colors.error,
    textAlign: 'center',
  },
  // ── Footer ──
  footerNote: {
    fontFamily: theme.typography.primary,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
