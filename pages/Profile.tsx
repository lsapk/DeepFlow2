import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Switch, Modal, Alert } from 'react-native';
import { UserProfile, PlayerProfile } from '../types';
import { LogOut, Bell, Moon, Volume2, Shield, CreditCard, ChevronRight, X } from 'lucide-react-native';

interface ProfileProps {
  user: UserProfile;
  player: PlayerProfile;
  logout: () => void;
  visible: boolean;
  onClose: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, player, logout, visible, onClose }) => {
  const [darkMode, setDarkMode] = useState(true);
  const [notifs, setNotifs] = useState(true);
  const [sound, setSound] = useState(true);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Compte</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <X size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                <View style={styles.profileHeader}>
                    <Image 
                        source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} 
                        style={styles.avatar} 
                    />
                    <Text style={styles.name}>{user.display_name}</Text>
                    <Text style={styles.email}>{user.email}</Text>
                    <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>Niveau {player.level} • {player.avatar_type}</Text>
                    </View>
                </View>

                {/* Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>PRÉFÉRENCES</Text>
                    <View style={styles.card}>
                        <SettingItem 
                            icon={Moon} label="Mode Sombre" iconColor="#5856D6" 
                            isSwitch value={darkMode} onToggle={() => setDarkMode(!darkMode)} 
                        />
                        <View style={styles.separator} />
                        <SettingItem 
                            icon={Bell} label="Notifications" iconColor="#EF4444" 
                            isSwitch value={notifs} onToggle={() => setNotifs(!notifs)} 
                        />
                        <View style={styles.separator} />
                        <SettingItem 
                            icon={Volume2} label="Sons" iconColor="#F59E0B" 
                            isSwitch value={sound} onToggle={() => setSound(!sound)} 
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>COMPTE</Text>
                    <View style={styles.card}>
                        <SettingItem icon={Shield} label="Sécurité" iconColor="#10B981" onPress={() => Alert.alert("Sécurité", "Authentification à deux facteurs activée.")} />
                        <View style={styles.separator} />
                        <SettingItem icon={CreditCard} label="Abonnement" iconColor="#3B82F6" onPress={() => Alert.alert("Plan", "Vous êtes sur le plan Gratuit.")} />
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <Text style={styles.logoutText}>Déconnexion</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    </Modal>
  );
};

const SettingItem = ({ icon: Icon, label, isSwitch, value, onToggle, iconColor, onPress }: any) => (
    <TouchableOpacity style={styles.item} activeOpacity={isSwitch ? 1 : 0.7} onPress={onPress}>
        <View style={styles.itemLeft}>
            <View style={[styles.iconBox, { backgroundColor: iconColor }]}>
                <Icon size={16} color="white" />
            </View>
            <Text style={styles.label}>{label}</Text>
        </View>
        {isSwitch ? (
            <Switch 
                value={value} 
                onValueChange={onToggle}
                trackColor={{ false: "#333", true: "#10B981" }}
                thumbColor="#FFF"
            />
        ) : (
            <ChevronRight size={16} color="#444" />
        )}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#000',
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: '#FFF',
  },
  closeBtn: {
      position: 'absolute',
      right: 20,
      top: 16,
  },
  scrollContent: {
      paddingBottom: 40,
  },
  profileHeader: {
      alignItems: 'center',
      marginVertical: 24,
  },
  avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginBottom: 12,
  },
  name: {
      fontSize: 22,
      fontWeight: '700',
      color: '#FFF',
      marginBottom: 4,
  },
  email: {
      fontSize: 15,
      color: '#888',
      marginBottom: 12,
  },
  levelBadge: {
      backgroundColor: '#171717',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#333',
  },
  levelText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#C4B5FD',
      textTransform: 'capitalize'
  },
  section: {
      marginBottom: 24,
      paddingHorizontal: 16,
  },
  sectionHeader: {
      fontSize: 12,
      color: '#666',
      marginBottom: 8,
      marginLeft: 16,
      fontWeight: '600',
  },
  card: {
      backgroundColor: '#171717',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#262626',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    height: 52,
  },
  separator: {
    height: 1,
    backgroundColor: '#262626',
    marginLeft: 54, 
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    color: '#FFF',
  },
  logoutBtn: {
      marginHorizontal: 16,
      backgroundColor: '#171717',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#262626',
  },
  logoutText: {
      color: '#EF4444',
      fontSize: 17,
      fontWeight: '600',
  }
});

export default Profile;