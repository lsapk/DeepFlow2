import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Switch } from 'react-native';
import { UserProfile, PlayerProfile } from '../types';
import { Settings, LogOut, Bell, Moon, Volume2, Shield, CreditCard, ChevronRight, User } from 'lucide-react-native';

interface ProfileProps {
  user: UserProfile;
  player: PlayerProfile;
  logout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, player, logout }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.largeTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* User Card */}
        <View style={styles.userCardContainer}>
             <View style={styles.avatarContainer}>
                <Image 
                    source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} 
                    style={styles.avatar} 
                />
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.name}>{user.display_name}</Text>
                <Text style={styles.email}>{user.email}</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>Level {player.level}</Text>
                </View>
            </View>
        </View>

        {/* Settings Groups */}
        <View style={styles.groupContainer}>
            <SettingItem icon={Moon} label="Dark Mode" isSwitch iconColor="#5856D6" />
            <View style={styles.separator} />
            <SettingItem icon={Bell} label="Notifications" isSwitch defaultChecked iconColor="#FF3B30" />
            <View style={styles.separator} />
            <SettingItem icon={Volume2} label="Sounds" isSwitch defaultChecked iconColor="#FF9500" />
        </View>

        <View style={styles.groupContainer}>
            <SettingItem icon={Shield} label="Security" iconColor="#34C759" />
            <View style={styles.separator} />
            <SettingItem icon={CreditCard} label="Subscription" iconColor="#007AFF" />
        </View>

        <View style={styles.groupContainer}>
             <TouchableOpacity style={styles.item} onPress={logout}>
                <View style={styles.itemLeft}>
                    <Text style={styles.logoutLabel}>Sign Out</Text>
                </View>
            </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>DeepFlow v1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const SettingItem = ({ icon: Icon, label, isSwitch, defaultChecked, iconColor }: any) => (
    <TouchableOpacity style={styles.item} activeOpacity={isSwitch ? 1 : 0.7}>
        <View style={styles.itemLeft}>
            <View style={[styles.iconBox, { backgroundColor: iconColor }]}>
                <Icon size={16} color="white" />
            </View>
            <Text style={styles.label}>{label}</Text>
        </View>
        {isSwitch ? (
            <Switch 
                value={defaultChecked} 
                trackColor={{ false: "#D1D5DB", true: "#34C759" }}
            />
        ) : (
            <ChevronRight size={16} color="#C7C7CC" />
        )}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', // Grouped Background
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  userCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 24,
    // Note: In standard iOS settings the profile is not "grouped" but separated.
    // For this app, making it a clean top section looks best.
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E5EA',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  email: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 6,
  },
  badge: {
    backgroundColor: '#F2F2F7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  groupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    height: 54, // Standard iOS row height
  },
  separator: {
    height: 0.5,
    backgroundColor: '#C6C6C8',
    marginLeft: 54, // 16 pad + 28 icon + 10 gap
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
    fontSize: 17,
    color: '#000000',
  },
  logoutLabel: {
    fontSize: 17,
    color: '#FF3B30',
  },
  versionText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 13,
    marginBottom: 20,
  },
});

export default Profile;