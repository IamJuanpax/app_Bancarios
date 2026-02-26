/**
 * ============================================================
 * THEME - Sistema de diseño global de RehabMobile
 * ============================================================
 * 
 * Define todos los tokens de diseño: colores, tipografía,
 * espaciado, bordes, sombras y estilos reutilizables.
 * Basado en la paleta definida en CONTEXT.md (Sección 5):
 * - Base blanca/gris clara (#F8F9FA)
 * - Azul medianoche profundo
 * - Acentos en Verde Esmeralda
 * 
 * Estilo: neomorfismo ligero, bordes redondeados, profesional.
 */

// ── Paleta de Colores ──
export const colors = {
  background: '#F8F9FA',       // Fondo general gris muy claro
  backgroundDark: '#E9ECEF',   // Fondo alternativo más oscuro
  primary: '#0D1B2A',          // Azul medianoche profundo
  primaryLight: '#1B3A5C',     // Variante más clara del primario
  accent: '#50C878',           // Verde Esmeralda (color de acento principal)
  accentDark: '#3DA865',       // Variante oscura del acento
  accentLight: '#A8E6C1',      // Variante suave del acento
  text: '#1C1C1E',             // Texto principal negro suave
  textLight: '#8E8E93',        // Texto secundario gris
  textMuted: '#ADB5BD',        // Texto muy sutil (placeholders)
  white: '#FFFFFF',            // Blanco puro
  error: '#FF3B30',            // Rojo para errores y alertas
  errorLight: '#FFE5E3',       // Fondo suave para mensajes de error
  success: '#34C759',          // Verde éxito
  successLight: '#E3F9E5',     // Fondo suave para mensajes de éxito
  warning: '#FF9500',          // Naranja para advertencias
  warningLight: '#FFF3E0',     // Fondo suave para advertencias
  info: '#0A84FF',             // Azul informacional
  infoLight: '#E0F0FF',        // Fondo suave para info
  border: '#DEE2E6',           // Color de bordes sutiles
  overlay: 'rgba(0, 0, 0, 0.5)', // Overlay para modales
};

// ── Tipografía ──
// Las fuentes Inter y Montserrat se cargan en App.js con expo-font
export const typography = {
  primary: 'Inter-Regular',        // Texto corrido y descripciones
  primaryBold: 'Inter-Bold',       // Texto enfático
  secondary: 'Montserrat-Regular', // Títulos secundarios
  secondaryBold: 'Montserrat-Bold',// Títulos principales y encabezados

  // Tamaños tipográficos estandarizados
  sizes: {
    xs: 11,      // Etiquetas muy pequeñas (badges, captions)
    s: 13,       // Texto auxiliar
    m: 15,       // Texto body normal
    l: 18,       // Subtítulos
    xl: 22,      // Títulos de sección
    xxl: 28,     // Títulos de pantalla
    hero: 34,    // Títulos hero / splash
  },
};

// ── Espaciado uniforme (múltiplos de 4) ──
export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 40,
  xxxl: 56,
};

// ── Radios de borde ──
export const borderRadius = {
  s: 4,    // Chips, badges
  m: 8,    // Inputs, botones pequeños
  l: 16,   // Cards, contenedores
  xl: 24,  // Botones grandes, FABs
  full: 9999, // Perfectamente circular
};

// ── Sombras (neomorfismo ligero) ──
export const shadows = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
};

// ── Estilos comunes reutilizables ──
export const commonStyles = {
  // Card base usada en la mayoría de listas
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.l,
    padding: spacing.m,
    marginBottom: spacing.m,
    ...shadows.light,
  },
  // Input de texto estándar
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.m,
    paddingVertical: spacing.s + 4,
    paddingHorizontal: spacing.m,
    fontFamily: typography.primary,
    fontSize: typography.sizes.m,
    color: colors.text,
  },
  // Botón primario (acento)
  buttonPrimary: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  // Texto del botón primario
  buttonPrimaryText: {
    color: colors.white,
    fontFamily: typography.primaryBold,
    fontSize: typography.sizes.m,
  },
  // Botón secundario (outline)
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.accent,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Texto del botón secundario
  buttonSecondaryText: {
    color: colors.accent,
    fontFamily: typography.primaryBold,
    fontSize: typography.sizes.m,
  },
  // Botón de peligro 
  buttonDanger: {
    backgroundColor: colors.error,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

// ── Exportación consolidada del tema ──
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  commonStyles,
};
