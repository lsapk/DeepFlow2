import React from 'react';
import { StyleSheet, View, ViewProps, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../theme';

interface PageContainerProps extends ViewProps {
  children: React.ReactNode;
  gradientColors?: string[];
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, style, gradientColors, ...props }) => {
  const colors = gradientColors || Theme.colors.backgroundGradient;

  return (
    <View style={[styles.container, style]} {...props}>
      <LinearGradient
        colors={colors as any}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
});
