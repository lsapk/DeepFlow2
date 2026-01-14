import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { supabase } from '../services/supabase';

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
           Alert.alert("Welcome!", "Please check your email to verify your account.");
           setIsLogin(true); 
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
    >
        <View style={styles.content}>
            <View style={styles.header}>
                <View style={styles.logoPlaceholder}>
                     {/* Replace with actual logo image if available */}
                     <Text style={styles.logoText}>LU</Text>
                </View>
                <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
                <Text style={styles.subtitle}>
                    {isLogin ? 'Enter your details to continue.' : 'Join us to gamify your life.'}
                </Text>
            </View>

            <View style={styles.form}>
                {!isLogin && (
                    <TextInput 
                        style={styles.input}
                        placeholder="Full Name"
                        placeholderTextColor="#C7C7CC"
                        value={fullName}
                        onChangeText={setFullName}
                    />
                )}
                
                <TextInput 
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#C7C7CC"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextInput 
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#C7C7CC"
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
                        <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
                    <Text style={styles.switchText}>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <Text style={styles.linkText}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '900',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    height: 56,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#000000',
  },
  mainButton: {
    height: 56,
    backgroundColor: '#007AFF', // System Blue
    borderRadius: 12,
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
    color: '#8E8E93',
  },
  linkText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default Auth;