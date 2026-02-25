import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

export default function LoginScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RehabMobile</Text>
      <Text style={styles.subtitle}>Acceso Profesional</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.replace('Home')}
      >
        <Text style={styles.buttonText}>Ingresar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    fontFamily: theme.typography.secondaryBold,
    fontSize: 32,
    color: theme.colors.primary,
    marginBottom: theme.spacing.s,
  },
  subtitle: {
    fontFamily: theme.typography.primary,
    fontSize: 18,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xxl,
  },
  button: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.l,
    width: '100%',
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  buttonText: {
    color: theme.colors.primary, // Using primary color for text on accent for good contrast
    fontFamily: theme.typography.primaryBold,
    fontSize: 16,
  }
});
