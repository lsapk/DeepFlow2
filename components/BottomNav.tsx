
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { LayoutDashboard, CalendarRange, BookOpen, TrendingUp, Zap, Shield } from 'lucide-react-native';
import { ViewState } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, withTiming, FadeIn } from 'react-native-reanimated';

interface BottomNavProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isDarkMode?: boolean;
  isAdmin?: boolean;
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
                    fill={isActive ? `${color}20` : 'transparent'}
                />
            </Animated.View>
            {isActive && (
                <Animated.Text entering={FadeIn.duration(200)} style={[styles.label, { color }]}>
                    {label}
                </Animated.Text>
            )}
        </View>
    );
};

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView, isDarkMode = true, isAdmin = false }) => {
  const insets = useSafeAreaInsets();
  
  const navItems = [
    { view: ViewState.TODAY, icon: LayoutDashboard, label: 'Home' },
    { view: ViewState.PLANNING, icon: CalendarRange, label: 'Plan' },
    { view: ViewState.FOCUS_MODE, icon: Zap, label: 'Focus', isSpecial: true },
    { view: ViewState.INTROSPECTION, icon: BookOpen, label: 'Journal' },
    { view: isAdmin ? ViewState.ADMIN : ViewState.EVOLUTION, icon: isAdmin ? Shield : TrendingUp, label: isAdmin ? 'Admin' : 'Évo' },
  ];

  const handlePress = (view: ViewState) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setView(view);
  };

  const activeColor = isDarkMode ? '#FFFFFF' : '#000000';
  const inactiveColor = isDarkMode ? '#666666' : '#999999';

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]} pointerEvents="box-none">
        {/* Container principal pour la barre de verre */}
        <View style={styles.barContainer} pointerEvents="box-none">
            <BlurView 
                intensity={Platform.OS === 'ios' ? 80 : 90} 
                tint={isDarkMode ? 'dark' : 'light'} 
                style={[styles.blurContainer, isDarkMode ? styles.darkBorder : styles.lightBorder]}
            >
                {navItems.map((item, index) => {
                    if (item.isSpecial) {
                        return <View key={index} style={styles.spacer} pointerEvents="none" />;
                    }

                    const Icon = item.icon;
                    const isActive = currentView === item.view;

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

            {/* Bouton Flottant (Sorti du BlurView pour éviter le clipping) */}
            <TouchableOpacity
                onPress={() => handlePress(ViewState.FOCUS_MODE)}
                style={styles.floatingBtnContainer}
                activeOpacity={0.9}
                hitSlop={{top: 15, bottom: 15, left: 15, right: 15}} // Zone tactile agrandie
            >
                <View style={styles.floatingBtn}>
                    <Zap size={28} color="#FFFFFF" fill="#FFFFFF" />
                </View>
            </TouchableOpacity>
        </View>
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
    zIndex: 50, // Z-index géré pour ne pas couvrir les Modals plein écran (qui sont souvent > 100)
  },
  barContainer: {
      width: '100%',
      maxWidth: 400,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'flex-end',
  },
  blurContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 70,
    width: '100%',
    borderRadius: 35,
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
      backgroundColor: 'rgba(255,255,255,0.85)',
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
      bottom: -14,
  },
  spacer: {
      flex: 1, 
  },
  floatingBtnContainer: {
      position: 'absolute',
      bottom: 25, 
      alignSelf: 'center',
      zIndex: 51,
  },
  floatingBtn: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#007AFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#007AFF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 10,
      borderWidth: 4,
      borderColor: 'rgba(255,255,255,0.1)', 
  },
});

export default BottomNav;
