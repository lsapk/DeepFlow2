import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { LayoutDashboard, CalendarRange, BookOpen, TrendingUp, Zap } from 'lucide-react-native';
import { ViewState } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface BottomNavProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
  const insets = useSafeAreaInsets();
  
  const navItems = [
    { view: ViewState.TODAY, icon: LayoutDashboard, label: 'Aujourd\'hui' },
    { view: ViewState.PLANNING, icon: CalendarRange, label: 'Planifier' },
    { view: ViewState.FOCUS_MODE, icon: Zap, label: 'Focus', isSpecial: true },
    { view: ViewState.INTROSPECTION, icon: BookOpen, label: 'Journal' },
    { view: ViewState.EVOLUTION, icon: TrendingUp, label: 'Évolution' },
  ];

  const handlePress = (view: ViewState) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setView(view);
  };

  return (
    <View style={[
        styles.container, 
        { 
            paddingBottom: Math.max(insets.bottom, 20),
            height: 80 + Math.max(insets.bottom, 0) 
        }
    ]}>
      {navItems.map((item) => {
        const Icon = item.icon;
        
        // La logique "isActive" doit prendre en compte les sous-vues si nécessaire, 
        // mais ici on se base sur les vues principales.
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
                        <Icon size={28} color="#FFFFFF" fill="#FFFFFF" />
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
            <Icon 
                size={24} 
                color={isActive ? '#007AFF' : '#8E8E93'} 
                strokeWidth={isActive ? 2.5 : 2}
            />
            <Text style={[styles.label, { color: isActive ? '#007AFF' : '#8E8E93' }]}>
                {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)', // Glassmorphism light default
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 10,
    paddingTop: 10,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    // Shadow for elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 50,
  },
  label: {
      fontSize: 10,
      marginTop: 4,
      fontWeight: '500',
  },
  specialTabWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginTop: -20, // Lift it up
  },
  specialTab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#007AFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#007AFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
  },
});

export default BottomNav;