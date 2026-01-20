import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { PlayerProfile, UserProfile, Quest, UnlockedAchievement } from '../types';
import { Shield, Zap, Target, Menu, Gamepad2, ShoppingBag, Trophy, Gift, CheckCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getXpForNextLevel } from '../services/gamification';
import { supabase } from '../services/supabase';

interface CyberKnightProps {
  player: PlayerProfile;
  user: UserProfile;
  quests: Quest[];
  openMenu: () => void;
  openProfile: () => void;
}

// Config Boutique (Items statiques pour l'instant, transaction réelle)
const SHOP_ITEMS = [
    { id: 'boost_xp', title: 'Boost XP x2', desc: 'Double XP pendant 1h', price: 200, icon: Zap, color: '#F472B6' },
    { id: 'streak_shield', title: 'Protection Streak', desc: 'Sauve une série', price: 500, icon: Shield, color: '#60A5FA' },
    { id: 'mystery_box', title: 'Coffre Mystère', desc: 'Récompense aléatoire', price: 1000, icon: Gift, color: '#FACC15' }
];

// Config Achievements (Définitions statiques, déblocage réel)
const ACHIEVEMENTS_DEF = [
    { id: 'novice', title: 'Novice', desc: 'Atteignez le niveau 2.', icon: Trophy },
    { id: 'quest_master', title: 'Mercenaire', desc: 'Complétez 10 quêtes.', icon: Shield },
    { id: 'rich', title: 'Riche', desc: 'Cumulez 500 crédits.', icon: ShoppingBag },
];

const CyberKnight: React.FC<CyberKnightProps> = ({ player, user, quests, openMenu, openProfile }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'STATUS' | 'SHOP' | 'ACHIEVEMENTS'>('STATUS');
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  
  // Formula: 100 * level^2
  const xpRequired = getXpForNextLevel(player.level);
  const xpProgress = (player.experience_points / xpRequired) * 100;
  
  useEffect(() => {
      fetchUnlockedAchievements();
  }, [user.id]);

  const fetchUnlockedAchievements = async () => {
      const { data } = await supabase.from('unlocked_achievements').select('achievement_id').eq('user_id', user.id);
      if (data) {
          setUnlockedAchievements(new Set(data.map(d => d.achievement_id)));
      }
  };

  const handleBuy = async (item: typeof SHOP_ITEMS[0]) => {
      if (player.credits < item.price) {
          Alert.alert("Fonds insuffisants", "Complétez des quêtes pour gagner plus de crédits !");
          return;
      }

      Alert.alert("Confirmer", `Acheter ${item.title} pour ${item.price} crédits ?`, [
          { text: "Annuler", style: "cancel" },
          { text: "Acheter", onPress: async () => {
              // 1. Deduct credits
              const { error } = await supabase.from('player_profiles')
                .update({ credits: player.credits - item.price })
                .eq('user_id', user.id);
              
              if (!error) {
                  // 2. Add item to active_powerups table
                  await supabase.from('active_powerups').insert({
                      user_id: user.id,
                      powerup_type: item.id,
                      multiplier: item.id === 'boost_xp' ? 2.0 : 1.0,
                      expires_at: new Date(Date.now() + 3600000).toISOString() // 1h expiry default
                  });
                  Alert.alert("Succès", "Objet acheté et activé !");
              }
          }}
      ]);
  };

  const renderStatus = () => (
      <>
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
                <Text style={styles.progressLabel}>Vers Niv. {player.level + 1}</Text>
                <Text style={styles.progressPercent}>{Math.min(100, Math.round(xpProgress))}%</Text>
            </View>
            <View style={styles.xpBarBg}>
                <View style={[styles.xpBarFill, { width: `${Math.min(100, xpProgress)}%` }]} />
            </View>
            <Text style={styles.progressSub}>{Math.max(0, xpRequired - player.experience_points)} XP requis</Text>
        </View>

        <Text style={styles.sectionLabel}>Quêtes Disponibles</Text>
        {quests.length === 0 ? (
             <View style={styles.emptyContainer}>
                 <Text style={styles.emptyText}>Aucune quête disponible. Revenez demain !</Text>
             </View>
        ) : (
            quests.map(quest => (
                <View key={quest.id} style={styles.questCard}>
                    <View style={styles.questIcon}>
                        <Target size={20} color="#FFF" />
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={styles.questTitle}>{quest.title}</Text>
                        <Text style={styles.questDesc} numberOfLines={1}>{quest.description}</Text>
                        <View style={{flexDirection: 'row', gap: 10, marginTop: 4}}>
                            <Text style={styles.questReward}>+{quest.reward_xp} XP</Text>
                            <Text style={[styles.questReward, { color: '#FACC15' }]}>+{quest.reward_credits} Crédits</Text>
                        </View>
                    </View>
                    <View style={styles.pendingDot} />
                </View>
            ))
        )}
      </>
  );

  const renderShop = () => (
      <View style={{ gap: 16 }}>
          {SHOP_ITEMS.map((item) => (
              <View key={item.id} style={styles.shopItem}>
                <View style={[styles.shopIcon, { backgroundColor: `${item.color}33` }]}>
                    <item.icon size={24} color={item.color} />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.shopTitle}>{item.title}</Text>
                    <Text style={styles.shopDesc}>{item.desc}</Text>
                </View>
                <TouchableOpacity style={styles.buyBtn} onPress={() => handleBuy(item)}>
                    <Text style={styles.buyText}>{item.price} 🪙</Text>
                </TouchableOpacity>
            </View>
          ))}
      </View>
  );

  const renderAchievements = () => (
      <View style={{ gap: 12 }}>
          {ACHIEVEMENTS_DEF.map((ach) => {
              const isUnlocked = unlockedAchievements.has(ach.id);
              return (
                <View key={ach.id} style={[styles.achieveCard, !isUnlocked && styles.achieveLocked]}>
                    <ach.icon size={24} color={isUnlocked ? "#FACC15" : "#666"} />
                    <View style={{flex: 1}}>
                        <Text style={[styles.achieveTitle, !isUnlocked && { color: '#888' }]}>{ach.title}</Text>
                        <Text style={styles.achieveDesc}>{ach.desc}</Text>
                    </View>
                    {isUnlocked && <CheckCircle size={20} color="#4ADE80" />}
                </View>
              );
          })}
      </View>
  );

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
      
      {/* TABS */}
      <View style={styles.tabContainer}>
          {(['STATUS', 'SHOP', 'ACHIEVEMENTS'] as const).map(tab => (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                      {tab === 'STATUS' ? 'QG' : tab === 'SHOP' ? 'BOUTIQUE' : 'SUCCÈS'}
                  </Text>
              </TouchableOpacity>
          ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'STATUS' && renderStatus()}
        {activeTab === 'SHOP' && renderShop()}
        {activeTab === 'ACHIEVEMENTS' && renderAchievements()}
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
  tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#262626',
  },
  tab: {
      paddingVertical: 12,
      marginRight: 24,
  },
  activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: '#C4B5FD',
  },
  tabText: {
      color: '#666',
      fontWeight: '700',
      fontSize: 12,
  },
  activeTabText: {
      color: '#FFF',
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
  questDesc: {
      color: '#888',
      fontSize: 12,
  },
  questReward: {
      color: '#C4B5FD',
      fontSize: 11,
      fontWeight: '700',
  },
  pendingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#333',
      borderWidth: 1,
      borderColor: '#666',
  },
  emptyContainer: {
      padding: 20,
      alignItems: 'center',
      backgroundColor: '#171717',
      borderRadius: 12,
  },
  emptyText: {
      color: '#666',
      fontStyle: 'italic',
  },

  // SHOP
  shopItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#171717',
      padding: 16,
      borderRadius: 16,
      gap: 16,
      borderWidth: 1,
      borderColor: '#262626',
  },
  shopIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
  },
  shopTitle: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 16,
  },
  shopDesc: {
      color: '#888',
      fontSize: 12,
      marginTop: 4,
  },
  buyBtn: {
      backgroundColor: '#333',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
  },
  buyText: {
      color: '#FACC15',
      fontWeight: '700',
  },

  // ACHIEVEMENTS
  achieveCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      backgroundColor: '#171717',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#262626',
  },
  achieveLocked: {
      opacity: 0.5,
      borderColor: '#333',
  },
  achieveTitle: {
      color: '#FFF',
      fontWeight: '600',
  },
  achieveDesc: {
      color: '#666',
      fontSize: 12,
  }
});

export default CyberKnight;