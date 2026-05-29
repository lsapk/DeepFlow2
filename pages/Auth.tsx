
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { supabase } from '../services/supabase';
import { Theme } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { PageContainer } from '../components/PageContainer';

declare var require: any;

interface AuthProps {
  onLogin: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: fullName } }
        });
        if (error) throw error;
        if (data.user) {
           Alert.alert("Bienvenue !", "Veuillez vérifier votre email pour confirmer votre compte.");
           setIsLogin(true); 
        }
      }
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
    <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
    >
        <View style={styles.content}>
            <View style={styles.header}>
                <Image 
                    source={require('../assets/logo.png')} 
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={[styles.title, { color: Theme.colors.text }]}>{isLogin ? 'Bon retour' : 'Créer un compte'}</Text>
                <Text style={styles.subtitle}>
                    {isLogin ? 'Entrez vos identifiants pour continuer.' : 'Rejoignez-nous pour gamifier votre vie.'}
                </Text>
            </View>

            <GlassCard style={styles.formCard}>
                <View style={styles.form}>
                    {!isLogin && (
                        <TextInput
                            style={styles.input}
                            placeholder="Nom complet"
                            placeholderTextColor={Theme.colors.textSecondary}
                            value={fullName}
                            onChangeText={setFullName}
                        />
                    )}

                    <TextInput 
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor={Theme.colors.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Mot de passe"
                        placeholderTextColor={Theme.colors.textSecondary}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={styles.mainButton}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.buttonText}>{isLogin ? 'Se connecter' : "S'inscrire"}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
                        <Text style={styles.switchText}>
                            {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
                            <Text style={styles.linkText}>{isLogin ? "S'inscrire" : 'Se connecter'}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </GlassCard>
        </View>
    </KeyboardAvoidingView>
    </PageContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    padding: 24,
  },
  form: {
    gap: 16,
  },
  input: {
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 17,
    color: Theme.colors.text,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  mainButton: {
    height: 56,
    backgroundColor: Theme.colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 15,
    color: Theme.colors.textSecondary,
  },
  linkText: {
    color: Theme.colors.primary,
    fontWeight: '600',
  },
});

export default Auth;
