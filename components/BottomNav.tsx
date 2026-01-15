import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Home, CheckCircle2, Zap, Trophy, User, BookOpen } from 'lucide-react-native';
import { ViewState } from '../types';

interface BottomNavProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
  const navItems = [
    { view: ViewState.DASHBOARD, icon: Home, label: 'Summary' },
    { view: ViewState.TASKS, icon: CheckCircle2, label: 'Tasks' },
    { view: ViewState.FOCUS, icon: Zap, label: 'Focus' },
    { view: ViewState.HABITS, icon: Trophy, label: 'Habits' },
    { view: ViewState.JOURNAL, icon: BookOpen, label: 'Journal' },
    { view: ViewState.PROFILE, icon: User, label: 'Profile' },
  ];

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.view;
        return (
          <TouchableOpacity
            key={item.view}
            onPress={() => setView(item.view)}
            style={styles.tab}
            activeOpacity={0.5}
          >
            <Icon 
                size={24} 
                color={isActive ? '#007AFF' : '#999999'} 
                strokeWidth={isActive ? 2.5 : 2}
            />
            <Text style={[styles.label, { color: isActive ? '#007AFF' : '#999999' }]}>
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
    backgroundColor: 'rgba(255,255,255,0.95)', // Glass effect simulation
    borderTopWidth: 0.5,
    borderTopColor: '#C6C6C8', // iOS separator color
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8, // Safe area manual
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 50,
  },
  label: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default BottomNav;