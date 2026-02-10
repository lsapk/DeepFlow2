
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { LayoutDashboard, CalendarRange, BookOpen, TrendingUp, Zap } from 'lucide-react-native';
import { ViewState } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, withTiming } from 'react-native-reanimated';

interface BottomNavProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isDarkMode?: boolean;
}

const TabIcon = ({ Icon, isActive, color, label }: any) => {
    const scale = useSharedValue(1);

    React.useEffect(() => {
        scale.value = withSpring(isActive ? 1.2 : 1, { damping: 12 });
    }, [isActive]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <View style={styles.tabContent}>
            <Animated.View style={animatedStyle}>
                <Icon 
                    size={24} 
                    color={color} 
                    strokeWidth={isActive ? 2.5 : 2}
                    fill={isActive ? `${color}20` : 'transparent'} // Subtil fill
                />
            </Animated.View>
            {isActive && (
                <Animated.Text entering={withTiming(1)} style={[styles.label, { color }]}>
                    {label}
                </Animated.Text>
            )}
        </View>
    );
};

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView, isDarkMode = true }) => {
  const insets = useSafeAreaInsets();
  
  const navItems = [
    { view: ViewState.TODAY, icon: LayoutDashboard, label: 'Home' },
    { view: ViewState.PLANNING, icon: CalendarRange, label: 'Plan' },
    { view: ViewState.FOCUS_MODE, icon: Zap, label: 'Focus', isSpecial: true },
    { view: ViewState.INTROSPECTION, icon: BookOpen, label: 'Journal' },
    { view: ViewState.EVOLUTION, icon: TrendingUp, label: 'Évo' },
  ];

  const handlePress = (view: ViewState) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setView(view);
  };

  const activeColor = isDarkMode ? '#FFFFFF' : '#000000';
  const inactiveColor = isDarkMode ? '#666666' : '#999999';

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
        <BlurView 
            intensity={Platform.OS === 'ios' ? 80 : 50} 
            tint={isDarkMode ? 'dark' : 'light'} 
            style={[styles.container, isDarkMode ? styles.darkBorder : styles.lightBorder]}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.view;

            if (item.isSpecial) {
                return (
                    <TouchableOpacity
                        key={item.view}
                        onPress={() => handlePress(item.view)}
                        style={styles.specialTabWrapper}
                        activeOpacity={0.8}
                    >
                        <View style={styles.specialTab}>
                            <Icon size={24} color="#FFFFFF" fill="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                );
            }

            return (
              <TouchableOpacity
                key={item.view}
                onPress={() => handlePress(item.view)}
                style={styles.tab}
                activeOpacity={0.7}
              >
                <TabIcon 
                    Icon={Icon} 
                    isActive={isActive} 
                    color={isActive ? activeColor : inactiveColor}
                    label={item.label}
                />
              </TouchableOpacity>
            );
          })}
        </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
    paddingHorizontal: 16,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 70, // Plus compact
    width: '100%',
    maxWidth: 400, // Limite la largeur sur tablette
    borderRadius: 35, // Pilule
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  darkBorder: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      backgroundColor: 'rgba(0,0,0,0.5)',
  },
  lightBorder: {
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.05)',
      backgroundColor: 'rgba(255,255,255,0.8)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
  },
  label: {
      fontSize: 10,
      fontWeight: '700',
      position: 'absolute',
      bottom: -16, // Cache le texte ou le montre subtilement
  },
  specialTabWrapper: {
      top: -15, // Floating effect
      paddingHorizontal: 8,
  },
  specialTab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#007AFF', // Deep Blue
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#007AFF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 10,
      borderWidth: 4,
      borderColor: 'rgba(0,0,0,0.2)', // Bordure subtile pour le contraste
  },
});

export default BottomNav;
