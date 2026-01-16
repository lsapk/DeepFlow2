import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LayoutDashboard, TrendingUp, Compass } from 'lucide-react-native';
import { ViewState } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomNavProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
  const insets = useSafeAreaInsets();
  
  const navItems = [
    { view: ViewState.TODAY, icon: LayoutDashboard, label: 'Today' },
    { view: ViewState.GROWTH, icon: TrendingUp, label: 'Growth' },
    { view: ViewState.EXPLORE, icon: Compass, label: 'Explore' },
  ];

  return (
    <View style={[
        styles.container, 
        { 
            paddingBottom: Math.max(insets.bottom, 20),
            height: 65 + Math.max(insets.bottom, 20) 
        }
    ]}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.view;

        return (
          <TouchableOpacity
            key={item.view}
            onPress={() => setView(item.view)}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                <Icon 
                    size={26} 
                    color={isActive ? '#FFFFFF' : '#555555'} 
                    strokeWidth={isActive ? 2.5 : 2}
                />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
    paddingHorizontal: 20,
    paddingTop: 12,
    justifyContent: 'space-around',
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
  iconContainer: {
      padding: 8,
      borderRadius: 12,
  },
  activeIconContainer: {
      // Optional: Add subtle background for active state if desired
      // backgroundColor: '#1C1C1E', 
  },
});

export default BottomNav;