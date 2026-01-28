import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto'; // CRUCIAL pour Supabase et l'IA
import { registerRootComponent } from 'expo';
import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, NativeModules } from 'react-native';
import App from './App';

declare const __DEV__: boolean;

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

// Composant de secours en cas de crash total
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("CRITICAL APP ERROR:", error, errorInfo);
  }

  restartApp = () => {
      // Tentative de rechargement en développement
      if (__DEV__ && NativeModules.DevSettings) {
          NativeModules.DevSettings.reload();
      } else {
          // En production, on demande à l'utilisateur de redémarrer car on n'a pas expo-updates configuré
          Alert.alert("Redémarrage requis", "Veuillez fermer complètement l'application et la relancer.");
      }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.errorTitle}>Oups ! Une erreur est survenue.</Text>
            <Text style={styles.errorSubtitle}>L'application a rencontré un problème inattendu. Ne vous inquiétez pas, vos données sont sécurisées.</Text>
            
            <TouchableOpacity style={styles.restartBtn} onPress={this.restartApp}>
                <Text style={styles.restartText}>Redémarrer l'application</Text>
            </TouchableOpacity>

            <View style={styles.codeBox}>
                <Text style={styles.errorLabel}>Détails techniques (pour le support) :</Text>
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
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  scroll: {
      paddingBottom: 40,
      alignItems: 'center',
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#E5E5EA',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 22,
  },
  restartBtn: {
      backgroundColor: '#007AFF',
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 25,
      marginBottom: 40,
  },
  restartText: {
      color: '#FFF',
      fontSize: 17,
      fontWeight: '700',
  },
  codeBox: {
      backgroundColor: '#000',
      padding: 15,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#333',
      width: '100%',
  },
  errorLabel: {
      color: '#8E8E93',
      fontSize: 12,
      marginBottom: 8,
      textTransform: 'uppercase',
  },
  errorText: {
    color: '#FF453A',
    fontFamily: 'monospace',
    fontSize: 12,
  },
});

registerRootComponent(Root);