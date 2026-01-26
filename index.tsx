import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto'; // CRUCIAL pour Supabase et l'IA
import { registerRootComponent } from 'expo';
import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Composant de secours en cas de crash total
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("CRITICAL APP ERROR:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.errorTitle}>💥 Oups ! L'application a planté.</Text>
            <Text style={styles.errorSubtitle}>Voici l'erreur technique (à montrer au développeur) :</Text>
            <View style={styles.codeBox}>
                <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
            </View>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const Root = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  scroll: {
      paddingBottom: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF453A',
    marginBottom: 10,
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#E5E5EA',
    marginBottom: 20,
  },
  codeBox: {
      backgroundColor: '#000',
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#333',
  },
  errorText: {
    color: '#00FF00',
    fontFamily: 'monospace',
    fontSize: 14,
  },
});

registerRootComponent(Root);