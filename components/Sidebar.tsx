import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import { UserProfile, ViewState } from '../types';
import { LayoutDashboard, TrendingUp, Target, CheckSquare, RefreshCw, Book, Zap, X, LogOut, BrainCircuit, Calendar } from 'lucide-react-native';
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

  // Ordre demandé : taches, habitudes, objectifs, focus, journal, reflexion, calendrier, croissance et IA
  const menuItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: ViewState.TODAY },
    { icon: CheckSquare, label: 'Tâches', view: ViewState.TASKS },
    { icon: RefreshCw, label: 'Habitudes', view: ViewState.HABITS },
    { icon: Target, label: 'Objectifs', view: ViewState.GOALS },
    { icon: Zap, label: 'Mode Focus', view: ViewState.FOCUS_MODE },
    { icon: Book, label: 'Journal', view: ViewState.JOURNAL },
    { icon: BrainCircuit, label: 'Réflexion', view: ViewState.REFLECTION },
    { icon: Calendar, label: 'Calendrier', view: ViewState.CALENDAR },
    { icon: TrendingUp, label: 'Croissance & IA', view: ViewState.GROWTH },
  ];

  const handleNavigate = (view: ViewState) => {
      setView(view);
      onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.overlay}>
            {/* Backdrop clickable */}
            <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
            
            {/* Drawer (Right Side Animation implied by layout, but standard is left. 
                Keeping structure but user asked for Menu Button on Top Right, usually implies Right Drawer or just button location.
                Keeping Drawer on Left for standard UX, but button triggers it.) 
            */}
            <View style={[styles.drawer, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
                
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                         <X size={26} color="#FFF" />
                     </TouchableOpacity>
                     
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

                <View style={styles.divider} />

                <View style={styles.footer}>
                     <TouchableOpacity style={styles.footerItem} onPress={onLogout}>
                         <LogOut size={20} color="#EF4444" />
                         <Text style={[styles.menuText, { color: '#EF4444' }]}>Déconnexion</Text>
                     </TouchableOpacity>
                </View>
            </View>
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
      maxWidth: 320,
      backgroundColor: '#111',
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
  },
  closeBtn: {
      alignSelf: 'flex-end',
      padding: 8,
      marginBottom: 10,
      backgroundColor: '#222',
      borderRadius: 20,
  },
  userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
  },
  avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: '#333',
  },
  userText: {
      flex: 1,
  },
  userName: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 18,
      marginBottom: 2,
  },
  userEmail: {
      color: '#888',
      fontSize: 12,
  },
  divider: {
      height: 1,
      backgroundColor: '#262626',
      width: '100%',
  },
  menuScroll: {
      flex: 1,
  },
  menuContainer: {
      padding: 16,
      gap: 4,
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
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
  },
  iconBoxActive: {
  },
  menuText: {
      color: '#CCC',
      fontSize: 15,
      fontWeight: '500',
  },
  menuTextActive: {
      color: '#000',
      fontWeight: '700',
  },
  footer: {
      padding: 16,
      backgroundColor: '#000',
  },
  footerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
      backgroundColor: '#1A0505',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#331111',
  }
});

export default Sidebar;