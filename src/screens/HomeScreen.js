import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Próximamente: Lista de pacientes y turnos.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.m,
  },
  title: {
    fontFamily: theme.typography.secondaryBold,
    fontSize: 28,
    color: theme.colors.primary,
    marginBottom: theme.spacing.m,
  },
  subtitle: {
    fontFamily: theme.typography.primary,
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
  }
});
