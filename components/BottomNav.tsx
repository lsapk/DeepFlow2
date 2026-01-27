import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { LayoutDashboard, CalendarRange, BookOpen, TrendingUp, Zap } from 'lucide-react-native';
import { ViewState } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface BottomNavProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isDarkMode?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView, isDarkMode = true }) => {
  const insets = useSafeAreaInsets();
  
  const navItems = [
    { view: ViewState.TODAY, icon: LayoutDashboard, label: 'Aujourd\'hui', hint: 'Aller au tableau de bord' },
    { view: ViewState.PLANNING, icon: CalendarRange, label: 'Planifier', hint: 'Gérer le calendrier et les objectifs' },
    { view: ViewState.FOCUS_MODE, icon: Zap, label: 'Focus', isSpecial: true, hint: 'Démarrer une session de concentration' },
    { view: ViewState.INTROSPECTION, icon: BookOpen, label: 'Journal', hint: 'Accéder au journal et aux réflexions' },
    { view: ViewState.EVOLUTION, icon: TrendingUp, label: 'Évolution', hint: 'Voir les statistiques et le profil gamifié' },
  ];

  const handlePress = (view: ViewState) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setView(view);
  };

  const backgroundColor = isDarkMode ? 'rgba(28, 28, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const borderTopColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const activeColor = '#007AFF';
  const inactiveColor = isDarkMode ? '#8E8E93' : '#999999';

  return (
    <View style={[
        styles.container, 
        { 
            backgroundColor: backgroundColor,
            borderTopColor: borderTopColor,
            paddingBottom: Math.max(insets.bottom, 20),
            height: 80 + Math.max(insets.bottom, 0) 
        }
    ]}>
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
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityHint={item.hint}
                    accessibilityState={{ selected: isActive }}
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
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityHint={item.hint}
            accessibilityState={{ selected: isActive }}
          >
            <Icon 
                size={24} 
                color={isActive ? activeColor : inactiveColor} 
                strokeWidth={isActive ? 2.5 : 2}
            />
            <Text style={[styles.label, { color: isActive ? activeColor : inactiveColor }]}>
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
    borderTopWidth: 0.5,
    paddingHorizontal: 10,
    paddingTop: 10,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
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