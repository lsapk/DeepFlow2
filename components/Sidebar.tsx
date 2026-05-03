
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import { UserProfile, ViewState } from '../types';
import { LayoutDashboard, TrendingUp, Target, CheckSquare, RefreshCw, Book, Zap, X, BrainCircuit, Shield, Brain } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  user: UserProfile | null;
  isAdmin?: boolean;
  setView: (view: ViewState) => void;
  currentView: ViewState;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ visible, onClose, user, isAdmin = false, setView, currentView }) => {
  const insets = useSafeAreaInsets();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: ViewState.TODAY },
    { icon: CheckSquare, label: 'Tâches', view: ViewState.TASKS },
    { icon: RefreshCw, label: 'Habitudes', view: ViewState.HABITS },
    { icon: Target, label: 'Objectifs', view: ViewState.GOALS },
    { icon: Zap, label: 'Mode Focus', view: ViewState.FOCUS_MODE },
    { icon: Book, label: 'Journal', view: ViewState.JOURNAL },
    { icon: BrainCircuit, label: 'Réflexion', view: ViewState.REFLECTION },
    { icon: Brain, label: 'DeepFlow AI', view: ViewState.AI },
  ];

  if (isAdmin) {
    menuItems.push({ icon: Shield, label: 'Administration', view: ViewState.ADMIN });
  }

  const handleNavigate = (view: ViewState) => {
      setView(view);
      onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
            <View style={[styles.drawer, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
                
                <View style={styles.header}>
                     {user && (
                        <View style={styles.userInfo}>
                             <Image 
                                source={{ uri: user.photo_url || "https://via.placeholder.com/100" }} 
                                style={styles.avatar} 
                             />
                             <View style={styles.userText}>
                                 <Text style={styles.userName} numberOfLines={1}>{user.display_name}</Text>
                                 <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                             </View>
                        </View>
                     )}
                     <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                         <X size={24} color="#888" />
                     </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.menuContainer}>
                        {menuItems.map((item, index) => {
                            const Icon = item.icon;
                            const isActive = currentView === item.view;
                            return (
                                <TouchableOpacity 
                                    key={index} 
                                    style={[styles.menuItem, isActive && styles.menuItemActive]} 
                                    onPress={() => handleNavigate(item.view)}
                                >
                                    <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
                                        <Icon size={20} color={isActive ? "#000" : "#CCC"} />
                                    </View>
                                    <Text style={[styles.menuText, isActive && styles.menuTextActive]}>{item.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
                
                <View style={styles.footerInfo}>
                    <Text style={styles.versionText}>DeepFlow v1.0.3</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
      flex: 1,
      flexDirection: 'row',
  },
  backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawer: {
      width: '80%', 
      maxWidth: 300,
      backgroundColor: '#090909',
      height: '100%',
      borderRightWidth: 1,
      borderRightColor: '#262626',
      display: 'flex',
      flexDirection: 'column',
  },
  header: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  closeBtn: {
      padding: 4,
  },
  userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
  },
  avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: '#333',
  },
  userText: {
      flex: 1,
  },
  userName: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 16,
      marginBottom: 2,
  },
  userEmail: {
      color: '#666',
      fontSize: 11,
  },
  divider: {
      height: 1,
      backgroundColor: '#1C1C1E',
      width: '100%',
  },
  menuScroll: {
      flex: 1,
  },
  menuContainer: {
      padding: 16,
      gap: 6,
  },
  menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      gap: 12,
  },
  menuItemActive: {
      backgroundColor: '#FFF',
  },
  iconBox: {
      width: 24,
      alignItems: 'center',
      justifyContent: 'center',
  },
  iconBoxActive: {
  },
  menuText: {
      color: '#999',
      fontSize: 15,
      fontWeight: '500',
  },
  menuTextActive: {
      color: '#000',
      fontWeight: '700',
  },
  footerInfo: {
      padding: 20,
      alignItems: 'center',
  },
  versionText: {
      color: '#333',
      fontSize: 10,
  }
});

export default Sidebar;
