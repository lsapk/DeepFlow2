import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Dimensions } from 'react-native';
import { UserProfile, ViewState } from '../types';
import { LayoutDashboard, TrendingUp, Compass, CheckSquare, RefreshCw, Book, Zap, X, LogOut } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  user: UserProfile | null;
  setView: (view: ViewState) => void;
  currentView: ViewState;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ visible, onClose, user, setView, currentView, onLogout }) => {
  const insets = useSafeAreaInsets();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: ViewState.TODAY },
    { icon: CheckSquare, label: 'Tâches', view: ViewState.TASKS },
    { icon: RefreshCw, label: 'Habitudes', view: ViewState.HABITS },
    { icon: TrendingUp, label: 'Croissance & IA', view: ViewState.GROWTH }, // Renamed and repurposed
    { icon: Book, label: 'Journal', view: ViewState.JOURNAL },
    { icon: Zap, label: 'Focus Mode', view: ViewState.FOCUS_MODE },
  ];

  const handleNavigate = (view: ViewState) => {
      setView(view);
      onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
            {/* Drawer à Gauche (First Child) */}
            <View style={[styles.drawer, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.header}>
                     {user && (
                        <View style={styles.userInfo}>
                             <Image 
                                source={{ uri: user.photo_url || "https://via.placeholder.com/100" }} 
                                style={styles.avatar} 
                             />
                             <View style={styles.userText}>
                                 <Text style={styles.userName}>{user.display_name}</Text>
                                 <Text style={styles.userEmail}>{user.email}</Text>
                             </View>
                        </View>
                     )}
                     <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                         <X size={24} color="#FFF" />
                     </TouchableOpacity>
                </View>

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
                                <Icon size={22} color={isActive ? "#000" : "#FFF"} />
                                <Text style={[styles.menuText, isActive && styles.menuTextActive]}>{item.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.footer}>
                     <TouchableOpacity style={styles.footerItem} onPress={onLogout}>
                         <LogOut size={20} color="#EF4444" />
                         <Text style={[styles.menuText, { color: '#EF4444' }]}>Déconnexion</Text>
                     </TouchableOpacity>
                </View>
            </View>

            {/* Backdrop à Droite (Second Child) */}
            <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
      flex: 1,
      flexDirection: 'row', // Align items horizontally
  },
  backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
      width: '80%',
      backgroundColor: '#171717',
      height: '100%',
      paddingHorizontal: 20,
      borderRightWidth: 1,
      borderRightColor: '#333',
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 40,
      marginTop: 20,
  },
  userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
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
  },
  userEmail: {
      color: '#888',
      fontSize: 12,
  },
  closeBtn: {
      padding: 8,
  },
  menuContainer: {
      gap: 8,
      flex: 1,
  },
  menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      gap: 16,
  },
  menuItemActive: {
      backgroundColor: '#FFF',
  },
  menuText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
  },
  menuTextActive: {
      color: '#000',
  },
  footer: {
      borderTopWidth: 1,
      borderTopColor: '#333',
      paddingTop: 20,
  },
  footerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 16,
  }
});

export default Sidebar;