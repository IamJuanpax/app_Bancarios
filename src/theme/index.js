export const colors = {
  background: '#F8F9FA', // Base blanca/gris clara
  primary: '#0D1B2A',    // Azul medianoche profundo
  accent: '#50C878',     // Verde Esmeralda (acento)
  text: '#1C1C1E',       // Texto principal oscuro
  textLight: '#8E8E93',  // Texto secundario
  white: '#FFFFFF',
  error: '#FF3B30',
  success: '#34C759',
};

export const typography = {
  // Configuración de fuentes (se requeriría cargar Inter/Montserrat con expo-font en App.js)
  primary: 'Inter-Regular',
  primaryBold: 'Inter-Bold',
  secondary: 'Montserrat-Regular',
  secondaryBold: 'Montserrat-Bold',
};

export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 40,
};

export const borderRadius = {
  s: 4,
  m: 8,
  l: 16,
  xl: 24,
};

export const shadows = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};
