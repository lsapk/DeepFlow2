import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Home, Bot, Shield, User } from 'lucide-react-native';
import { ViewState } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomNavProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
  const insets = useSafeAreaInsets();
  
  const navItems = [
    { view: ViewState.DASHBOARD, icon: Home, label: 'Accueil' },
    { view: ViewState.IA, icon: Bot, label: 'IA' },
    { view: ViewState.CYBER_KNIGHT, icon: Shield, label: 'Cyber Knight' }, // Gamification Hub
    { view: ViewState.PROFILE, icon: User, label: 'Profil' },
  ];

  return (
    <View style={[
        styles.container, 
        { 
            paddingBottom: Math.max(insets.bottom, 12),
            height: 65 + Math.max(insets.bottom, 12) 
        }
    ]}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.view;
        // Check if active is one of the sub-pages of Dashboard (Tasks, Habits, etc) -> Keep Home active visually? 
        // For now, simple strict equality.
        const isActuallyActive = isActive || (item.view === ViewState.DASHBOARD && [ViewState.TASKS, ViewState.HABITS, ViewState.GOALS, ViewState.FOCUS, ViewState.JOURNAL].includes(currentView));

        return (
          <TouchableOpacity
            key={item.view}
            onPress={() => setView(item.view)}
            style={styles.tab}
            activeOpacity={0.5}
          >
            <Icon 
                size={26} 
                color={isActuallyActive ? '#007AFF' : '#999999'} 
                strokeWidth={isActuallyActive ? 2.5 : 2}
            />
            <Text style={[styles.label, { color: isActuallyActive ? '#007AFF' : '#999999' }]}>
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 0.5,
    borderTopColor: '#C6C6C8',
    paddingHorizontal: 8,
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
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default BottomNav;