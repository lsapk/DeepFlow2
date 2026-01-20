import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { PlayerProfile, UserProfile, Task } from '../types';
import { Shield, Zap, Target, Menu, Gamepad2, Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CyberKnightProps {
  player: PlayerProfile;
  user: UserProfile;
  tasks: Task[];
  openMenu: () => void;
  openProfile: () => void;
}

const CyberKnight: React.FC<CyberKnightProps> = ({ player, user, tasks, openMenu, openProfile }) => {
  const insets = useSafeAreaInsets();
  const xpProgress = (player.experience_points % 1000) / 10;
  
  // Use real tasks as quests
  const quests = tasks.slice(0, 3);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* UNIFORM HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={openMenu}>
            <Menu size={24} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Cyber Knight</Text>

        <TouchableOpacity onPress={openProfile}>
            <Image 
                source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} 
                style={styles.avatar} 
            />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* AVATAR HERO SECTION */}
        <View style={styles.heroSection}>
            <View style={styles.avatarGlow}>
                <View style={styles.avatarContainer}>
                     <Gamepad2 size={60} color="#000" />
                </View>
            </View>
            <Text style={styles.heroRank}>{player.avatar_type.toUpperCase().replace('_', ' ')}</Text>
            <View style={styles.heroLevelBadge}>
                <Text style={styles.heroLevelText}>NIVEAU {player.level}</Text>
            </View>
        </View>

        {/* STATS GRID */}
        <View style={styles.statsGrid}>
             <View style={styles.statBox}>
                 <Text style={styles.statLabel}>XP TOTAL</Text>
                 <Text style={[styles.statValue, { color: '#C4B5FD' }]}>{player.experience_points}</Text>
             </View>
             <View style={styles.statBox}>
                 <Text style={styles.statLabel}>CRÉDITS</Text>
                 <Text style={[styles.statValue, { color: '#FACC15' }]}>{player.credits}</Text>
             </View>
             <View style={styles.statBox}>
                 <Text style={styles.statLabel}>QUÊTES</Text>
                 <Text style={[styles.statValue, { color: '#4ADE80' }]}>{player.total_quests_completed || 0}</Text>
             </View>
        </View>

        {/* PROGRESSION BAR */}
        <View style={styles.progressCard}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                <Text style={styles.progressLabel}>Progression vers Niv. {player.level + 1}</Text>
                <Text style={styles.progressPercent}>{Math.round(xpProgress)}%</Text>
            </View>
            <View style={styles.xpBarBg}>
                <View style={[styles.xpBarFill, { width: `${xpProgress}%` }]} />
            </View>
            <Text style={styles.progressSub}>{1000 - (player.experience_points % 1000)} XP requis</Text>
        </View>

        <Text style={styles.sectionLabel}>Quêtes Actives</Text>
        
        {quests.length === 0 ? (
             <Text style={styles.emptyText}>Aucune quête en cours.</Text>
        ) : (
            quests.map(task => (
                <View key={task.id} style={styles.questCard}>
                    <View style={styles.questIcon}>
                        <Target size={20} color="#FFF" />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.questTitle}>{task.title}</Text>
                        <Text style={styles.questReward}>+50 XP</Text>
                    </View>
                    {task.completed ? (
                         <Shield size={20} color="#4ADE80" />
                    ) : (
                         <View style={styles.pendingDot} />
                    )}
                </View>
            ))
        )}

        <Text style={styles.sectionLabel}>Arsenal (Bientôt)</Text>
        <View style={styles.lockedCard}>
            <Lock size={24} color="#666" />
            <Text style={styles.lockedText}>La boutique d'équipement est verrouillée.</Text>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12, 
    marginBottom: 10,
  },
  iconBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
  },
  headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFF',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#171717',
  },
  scrollContent: {
      paddingBottom: 120,
      paddingHorizontal: 20,
  },
  
  // HERO
  heroSection: {
      alignItems: 'center',
      marginBottom: 30,
      marginTop: 10,
  },
  avatarGlow: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(196, 181, 253, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(196, 181, 253, 0.3)',
  },
  avatarContainer: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: '#C4B5FD',
      alignItems: 'center',
      justifyContent: 'center',
  },
  heroRank: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFF',
      marginBottom: 8,
      letterSpacing: 1,
  },
  heroLevelBadge: {
      backgroundColor: '#333',
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
  },
  heroLevelText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: 12,
  },

  // STATS
  statsGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
  },
  statBox: {
      flex: 1,
      backgroundColor: '#171717',
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#262626',
  },
  statLabel: {
      color: '#666',
      fontSize: 10,
      fontWeight: '700',
      marginBottom: 4,
  },
  statValue: {
      fontSize: 18,
      fontWeight: '700',
  },

  // PROGRESS
  progressCard: {
      backgroundColor: '#171717',
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#262626',
      marginBottom: 30,
  },
  progressLabel: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 14,
  },
  progressPercent: {
      color: '#888',
  },
  xpBarBg: {
      height: 10,
      backgroundColor: '#333',
      borderRadius: 5,
      overflow: 'hidden',
      marginBottom: 8,
  },
  xpBarFill: {
      height: '100%',
      backgroundColor: '#C4B5FD',
  },
  progressSub: {
      color: '#666',
      fontSize: 12,
      textAlign: 'right',
  },

  sectionLabel: {
      color: '#666',
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 12,
      textTransform: 'uppercase',
  },

  // QUESTS
  questCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#171717',
      padding: 16,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#262626',
  },
  questIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#333',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
  },
  questTitle: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '600',
  },
  questReward: {
      color: '#FACC15',
      fontSize: 12,
      marginTop: 2,
  },
  pendingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#333',
      borderWidth: 1,
      borderColor: '#666',
  },
  emptyText: {
      color: '#666',
      fontStyle: 'italic',
  },

  lockedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: '#111',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#222',
      gap: 12,
      borderStyle: 'dashed',
  },
  lockedText: {
      color: '#666',
  }
});

export default CyberKnight;