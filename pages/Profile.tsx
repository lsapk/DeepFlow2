import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Switch, Modal, Alert, ActivityIndicator } from 'react-native';
import { UserProfile, PlayerProfile, UserSettings } from '../types';
import { LogOut, Bell, Sun, Moon, Volume2, Shield, CreditCard, ChevronRight, X, Clock, Settings, User } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { BlurView } from 'expo-blur';

interface ProfileProps {
  user: UserProfile;
  player: PlayerProfile;
  logout: () => void;
  visible: boolean;
  onClose: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, player, logout, visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
      id: user.id,
      theme: 'dark',
      language: 'fr',
      notifications_enabled: true,
      sound_enabled: true,
      focus_mode: false,
      clock_format: '24h'
  });

  useEffect(() => {
      if (visible) fetchSettings();
  }, [visible]);

  const fetchSettings = async () => {
      setLoading(true);
      const { data } = await supabase.from('user_settings').select('*').eq('id', user.id).single();
      if (data) {
          setSettings(data);
      } else {
          // Init settings if missing
          const defaultSettings = { 
              id: user.id, 
              theme: 'dark', 
              language: 'fr', 
              notifications_enabled: true,
              sound_enabled: true,
              focus_mode: false,
              clock_format: '24h'
          };
          await supabase.from('user_settings').upsert(defaultSettings);
          setSettings(defaultSettings);
      }
      setLoading(false);
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings); 
      const { error } = await supabase.from('user_settings').update({ [key]: value }).eq('id', user.id);
      if (error) setSettings(settings); // Revert
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <BlurView intensity={30} tint="dark" style={styles.blurContainer}>
            <View style={styles.modalContent}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Mon Profil</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <ActivityIndicator size="large" color="#FFF" />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* User Card */}
                        <View style={styles.profileHeader}>
                            <View style={styles.avatarContainer}>
                                <Image source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} style={styles.avatar} />
                                <View style={styles.editBadge}><Settings size={12} color="#000" /></View>
                            </View>
                            <Text style={styles.name}>{user.display_name}</Text>
                            <Text style={styles.email}>{user.email}</Text>
                            
                            <View style={styles.levelTag}>
                                <Text style={styles.levelText}>Niveau {player.level} • {player.avatar_type.replace('_', ' ')}</Text>
                            </View>
                        </View>

                        {/* Preferences */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>PARAMÈTRES</Text>
                            <View style={styles.card}>
                                <SettingItem icon={settings.theme === 'dark' ? Moon : Sun} label="Mode Sombre" iconColor="#5856D6" isSwitch value={settings.theme === 'dark'} onToggle={(val: boolean) => updateSetting('theme', val ? 'dark' : 'light')} />
                                <View style={styles.separator} />
                                <SettingItem icon={Bell} label="Notifications" iconColor="#EF4444" isSwitch value={settings.notifications_enabled} onToggle={(val: boolean) => updateSetting('notifications_enabled', val)} />
                                <View style={styles.separator} />
                                <SettingItem icon={Volume2} label="Sons & Effets" iconColor="#F59E0B" isSwitch value={settings.sound_enabled} onToggle={(val: boolean) => updateSetting('sound_enabled', val)} />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                            <LogOut size={20} color="#EF4444" style={{marginRight: 10}} />
                            <Text style={styles.logoutText}>Se déconnecter</Text>
                        </TouchableOpacity>
                        
                    </ScrollView>
                )}
            </View>
        </BlurView>
    </Modal>
  );
};

const SettingItem = ({ icon: Icon, label, isSwitch, value, onToggle, iconColor, onPress }: any) => (
    <TouchableOpacity style={styles.item} activeOpacity={isSwitch ? 1 : 0.7} onPress={onPress}>
        <View style={styles.itemLeft}>
            <View style={[styles.iconBox, { backgroundColor: iconColor }]}>
                <Icon size={18} color="white" />
            </View>
            <Text style={styles.label}>{label}</Text>
        </View>
        {isSwitch ? (
            <Switch value={value} onValueChange={onToggle} trackColor={{ false: "#333", true: "#34C759" }} thumbColor="#FFF" />
        ) : (
            <ChevronRight size={18} color="#444" />
        )}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
  blurContainer: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
      backgroundColor: '#090909',
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      height: '90%',
      paddingTop: 20,
      overflow: 'hidden'
  },
  header: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#FFF' },
  closeBtn: { position: 'absolute', right: 20, top: 0 },
  scrollContent: { paddingBottom: 60 },
  profileHeader: { alignItems: 'center', marginVertical: 30 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#222' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFF', padding: 6, borderRadius: 15 },
  name: { fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  email: { fontSize: 15, color: '#888', marginBottom: 16 },
  levelTag: { backgroundColor: 'rgba(196, 181, 253, 0.1)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(196, 181, 253, 0.3)' },
  levelText: { fontSize: 13, fontWeight: '600', color: '#C4B5FD', textTransform: 'capitalize' },
  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionHeader: { fontSize: 13, color: '#666', marginBottom: 8, marginLeft: 8, fontWeight: '600', textTransform: 'uppercase' },
  card: { backgroundColor: '#171717', borderRadius: 14, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, minHeight: 56 },
  separator: { height: 1, backgroundColor: '#262626', marginLeft: 56 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, color: '#FFF', fontWeight: '500' },
  logoutBtn: { marginHorizontal: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 16, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  logoutText: { color: '#EF4444', fontSize: 17, fontWeight: '600' }
});

export default Profile;