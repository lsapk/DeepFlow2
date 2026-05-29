import React from 'react';
import { StyleSheet, ViewProps, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../theme';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  intensity?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, intensity = 40, ...props }) => {
  return (
    <View style={[styles.container, style]} {...props}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={Theme.colors.surfaceGradient as any}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </BlurView>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(28, 28, 30, 0.8)', backdropFilter: 'blur(10px)' } as any]}>
           <LinearGradient
            colors={Theme.colors.surfaceGradient as any}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>
      )}
      <View style={styles.border} pointerEvents="none" />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
});
