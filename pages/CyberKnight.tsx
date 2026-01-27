import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, LayoutAnimation, Modal, Image } from 'react-native';
import { PlayerProfile, UserProfile, Quest, ShopItem, AvatarConfig, AvatarClass, AvatarColor, AvatarHelmet, AvatarArmor, Achievement } from '../types';
import { Shield, Zap, Target, Gamepad2, ShoppingBag, Trophy, Gift, CheckCircle, Lock, Edit2, X, Play, Clock, Flame, Palette } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getXpForNextLevel, getRankName, ACHIEVEMENTS_LIST, RARITY_COLORS } from '../services/gamification';
import { supabase } from '../services/supabase';
import AvatarGenerator from '../components/AvatarGenerator';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface CyberKnightProps {
  player: PlayerProfile;
  user: UserProfile;
  quests: Quest[];
  openMenu: () => void;
  openProfile: () => void;
  isDarkMode?: boolean;
}

// --- DATA CONSTANTS ---

const AVATAR_CLASSES: {id: AvatarClass, label: string, icon: any}[] = [
    { id: 'cyber_knight', label: 'Cyber Knight', icon: Shield },
    { id: 'neon_hacker', label: 'Neon Hacker', icon: Gamepad2 },
    { id: 'quantum_warrior', label: 'Quantum', icon: Zap },
    { id: 'shadow_ninja', label: 'Shadow', icon: Target },
    { id: 'cosmic_sage', label: 'Cosmic', icon: Trophy } // Placeholder icon
];

const COLORS: AvatarColor[] = ['#C4B5FD', '#34D399', '#F472B6', '#60A5FA', '#FACC15', '#F87171', '#A78BFA'];

const SHOP_ITEMS: ShopItem[] = [
    { id: 'boost_xp_1h', title: 'Boost XP x2', description: 'Double XP pendant 1h', price: 200, category: 'boost', rarity: 'rare', icon: 'Zap', color: '#F472B6' },
    { id: 'streak_freeze', title: 'Gel de Série', description: 'Protège une série brisée', price: 500, category: 'protection', rarity: 'epic', icon: 'Shield', color: '#60A5FA' },
    { id: 'mystery_box_common', title: 'Coffre Commun', description: 'Récompense aléatoire', price: 100, category: 'box', rarity: 'common', icon: 'Gift', color: '#9CA3AF' },
    { id: 'helmet_halo', title: 'Halo Angelique', description: 'Cosmétique Casque', price: 1000, category: 'cosmetic', rarity: 'legendary', icon: 'Crown', color: '#FACC15', metadata: { type: 'helmet', value: 'halo' } },
    { id: 'armor_heavy', title: 'Armure Lourde', description: 'Cosmétique Armure', price: 800, category: 'cosmetic', rarity: 'epic', icon: 'Shield', color: '#C4B5FD', metadata: { type: 'armor', value: 'heavy' } },
];

const CyberKnight: React.FC<CyberKnightProps> = ({ player, user, quests, openMenu, openProfile, isDarkMode = true }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'HQ' | 'QUESTS' | 'SHOP' | 'BADGES'>('HQ');
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [unlockedCosmetics, setUnlockedCosmetics] = useState<Set<string>>(new Set(['standard'])); // Default unlocked
  
  // Customization State
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [tempAvatar, setTempAvatar] = useState<AvatarConfig>(player.avatar_customization || {
      class: 'cyber_knight', helmet: 'standard', armor: 'standard', color: '#C4B5FD'
  });

  // Calculate Progress
  // Formule: Next Level at 100 * level^2. Current Progress is XP relative to prev level threshold.
  // Actually simpler: XP is cumulative. 
  // XP for Next Level = 100 * (level)^2.
  const xpRequired = getXpForNextLevel(player.level);
  const prevLevelXp = getXpForNextLevel(player.level - 1);
  const xpInCurrentLevel = player.experience_points - prevLevelXp;
  const xpNeededForLevel = xpRequired - prevLevelXp;
  const progressPercent = Math.min(100, (xpInCurrentLevel / xpNeededForLevel) * 100);
  
  const rankName = getRankName(player.level);
  
  const colors = {
      bg: isDarkMode ? '#000000' : '#F2F2F7',
      cardBg: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      text: isDarkMode ? '#FFFFFF' : '#000000',
      textSub: isDarkMode ? '#8E8E93' : '#8E8E93',
      border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
      accent: '#C4B5FD',
      button: '#007AFF'
  };

  useEffect(() => {
      fetchUnlocks();
  }, [user.id]);

  useEffect(() => {
      if(player.avatar_customization) setTempAvatar(player.avatar_customization);
  }, [player]);

  const fetchUnlocks = async () => {
      const [achData, cosData] = await Promise.all([
          supabase.from('unlocked_achievements').select('achievement_id').eq('user_id', user.id),
          supabase.from('unlockables').select('unlockable_id').eq('user_id', user.id)
      ]);
      
      if (achData.data) setUnlockedAchievements(new Set(achData.data.map(d => d.achievement_id)));
      if (cosData.data) setUnlockedCosmetics(new Set([...cosData.data.map(d => d.unlockable_id), 'standard', 'visor', 'stealth'])); // Basic ones
  };

  const switchTab = (tab: any) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveTab(tab);
  };

  const saveAvatar = async () => {
      const { error } = await supabase.from('player_profiles').update({ avatar_customization: tempAvatar }).eq('user_id', user.id);
      if (!error) {
          setIsEditingAvatar(false);
          Alert.alert("Succès", "Avatar mis à jour !");
      } else {
          Alert.alert("Erreur", "Impossible de sauvegarder.");
      }
  };

  const handleBuy = async (item: ShopItem) => {
      if (player.credits < item.price) {
          Alert.alert("Fonds insuffisants", "Complétez des quêtes pour gagner plus de crédits !");
          return;
      }

      const confirmTitle = item.category === 'cosmetic' ? "Débloquer" : "Acheter";

      Alert.alert("Boutique", `${confirmTitle} ${item.title} pour ${item.price} crédits ?`, [
          { text: "Annuler", style: "cancel" },
          { text: "Confirmer", onPress: async () => {
              // 1. Deduct Credits
              const { error } = await supabase.from('player_profiles')
                .update({ credits: player.credits - item.price })
                .eq('user_id', user.id);
              
              if (error) return Alert.alert("Erreur", "Transaction échouée.");

              // 2. Grant Item
              if (item.category === 'cosmetic') {
                  await supabase.from('unlockables').insert({
                      user_id: user.id,
                      unlockable_type: item.metadata.type,
                      unlockable_id: item.metadata.value
                  });
                  setUnlockedCosmetics(prev => new Set(prev).add(item.metadata.value));
              } else {
                  // Boost logic (simplified)
                  Alert.alert("Activé", "Boost activé pour 1h !");
              }
          }}
      ]);
  };

  const claimQuest = async (quest: Quest) => {
      // Simulation of claim (Normally backend would verify completion)
      if (quest.current_progress >= quest.target_value) {
          // Grant Reward via API or assume auto-granted. 
          // For UX, we animate removal or marking as claimed.
          Alert.alert("Récompense", `Vous avez gagné ${quest.reward_xp} XP et ${quest.reward_credits} Crédits !`);
      } else {
          Alert.alert("En cours", `Progression : ${quest.current_progress}/${quest.target_value}`);
      }
  };

  // --- RENDERERS ---

  const renderHQ = () => (
      <View style={{ gap: 20 }}>
          {/* AVATAR DISPLAY */}
          <View style={styles.avatarSection}>
              <AvatarGenerator config={player.avatar_customization || tempAvatar} size={180} />
              
              <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{rankName.toUpperCase()}</Text>
              </View>
              
              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditingAvatar(true)}>
                  <Edit2 size={16} color="#000" />
                  <Text style={styles.editBtnText}>Personnaliser</Text>
              </TouchableOpacity>
          </View>

          {/* MAIN STATS */}
          <View style={styles.statsRow}>
              <View style={[styles.statCard, {backgroundColor: colors.cardBg}]}>
                  <Text style={[styles.statLabel, {color: colors.textSub}]}>NIVEAU</Text>
                  <Text style={[styles.statBig, {color: colors.text}]}>{player.level}</Text>
              </View>
              <View style={[styles.statCard, {backgroundColor: colors.cardBg}]}>
                  <Text style={[styles.statLabel, {color: colors.textSub}]}>XP TOTAL</Text>
                  <Text style={[styles.statBig, {color: colors.accent}]}>{player.experience_points}</Text>
              </View>
              <View style={[styles.statCard, {backgroundColor: colors.cardBg}]}>
                  <Text style={[styles.statLabel, {color: colors.textSub}]}>CRÉDITS</Text>
                  <Text style={[styles.statBig, {color: '#FACC15'}]}>{player.credits}</Text>
              </View>
          </View>

          {/* PROGRESS BAR */}
          <View style={[styles.progressBox, {backgroundColor: colors.cardBg}]}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8}}>
                  <Text style={[styles.progLabel, {color: colors.textSub}]}>Progression vers Niv. {player.level + 1}</Text>
                  <Text style={[styles.progVal, {color: colors.text}]}>{Math.floor(progressPercent)}%</Text>
              </View>
              <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${progressPercent}%`, backgroundColor: colors.accent }]} />
              </View>
              <Text style={{color: colors.textSub, fontSize: 11, marginTop: 6, textAlign: 'right'}}>
                  {Math.floor(xpInCurrentLevel)} / {xpNeededForLevel} XP requis
              </Text>
          </View>
      </View>
  );

  const renderQuests = () => {
      const daily = quests.filter(q => q.quest_type === 'daily');
      const weekly = quests.filter(q => q.quest_type === 'weekly');

      const QuestItem: React.FC<{ q: Quest }> = ({ q }) => {
          const isComplete = q.current_progress >= q.target_value;
          const progress = Math.min(1, q.current_progress / q.target_value);
          
          return (
            <TouchableOpacity onPress={() => claimQuest(q)} style={[styles.questItem, {backgroundColor: colors.cardBg, borderColor: isComplete ? '#4ADE80' : colors.border}]}>
                <View style={styles.questLeft}>
                    <View style={[styles.questIconBox, {backgroundColor: isComplete ? 'rgba(74, 222, 128, 0.2)' : (isDarkMode ? '#333' : '#F2F2F7')}]}>
                        {isComplete ? <CheckCircle2 size={20} color="#4ADE80" /> : <Target size={20} color={colors.text} />}
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={[styles.questTitle, {color: colors.text}]}>{q.title}</Text>
                        <Text style={[styles.questDesc, {color: colors.textSub}]}>{q.description}</Text>
                        
                        {/* Progress Bar */}
                        <View style={styles.miniBarBg}>
                            <View style={[styles.miniBarFill, {width: `${progress*100}%`, backgroundColor: isComplete ? '#4ADE80' : colors.accent}]} />
                        </View>
                    </View>
                </View>
                <View style={styles.questRewards}>
                    <Text style={styles.rewardText}>+{q.reward_xp} XP</Text>
                    <Text style={[styles.rewardText, {color: '#FACC15'}]}>+{q.reward_credits} 🪙</Text>
                </View>
            </TouchableOpacity>
          );
      };

      return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
              <Text style={styles.sectionHeader}>QUOTIDIENNES 🌅</Text>
              {daily.length > 0 ? daily.map(q => <QuestItem key={q.id} q={q} />) : <Text style={styles.emptyText}>Aucune quête quotidienne.</Text>}
              
              <Text style={[styles.sectionHeader, {marginTop: 24}]}>HEBDOMADAIRES 📅</Text>
              {weekly.length > 0 ? weekly.map(q => <QuestItem key={q.id} q={q} />) : <Text style={styles.emptyText}>Aucune quête hebdomadaire.</Text>}
          </ScrollView>
      );
  };

  const renderShop = () => (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{gap: 16, paddingBottom: 40}}>
          {SHOP_ITEMS.map((item, index) => {
              const Icon = (item.icon === 'Zap' ? Zap : item.icon === 'Shield' ? Shield : item.icon === 'Gift' ? Gift : Trophy) as any;
              const isOwned = item.category === 'cosmetic' && unlockedCosmetics.has(item.metadata?.value);

              return (
                  <View key={index} style={[styles.shopItem, {backgroundColor: colors.cardBg, borderColor: RARITY_COLORS[item.rarity]}]}>
                      <View style={[styles.shopIconBox, {backgroundColor: `${item.color}20`}]}>
                          <Icon size={28} color={item.color} />
                      </View>
                      <View style={{flex: 1}}>
                          <Text style={[styles.shopTitle, {color: colors.text}]}>{item.title}</Text>
                          <Text style={[styles.shopRarity, {color: RARITY_COLORS[item.rarity]}]}>{item.rarity.toUpperCase()}</Text>
                          <Text style={[styles.shopDesc, {color: colors.textSub}]}>{item.description}</Text>
                      </View>
                      
                      {isOwned ? (
                          <View style={styles.ownedBadge}>
                              <CheckCircle size={16} color="#4ADE80" style={{marginRight: 4}} />
                              <Text style={{color: '#4ADE80', fontSize: 12, fontWeight: '700'}}>POSSÉDÉ</Text>
                          </View>
                      ) : (
                          <TouchableOpacity style={[styles.buyBtn, {backgroundColor: isDarkMode ? '#333' : '#F2F2F7'}]} onPress={() => handleBuy(item)}>
                              <Text style={[styles.buyText, {color: colors.text}]}>{item.price} 🪙</Text>
                          </TouchableOpacity>
                      )}
                  </View>
              );
          })}
      </ScrollView>
  );

  const renderBadges = () => (
      <View style={styles.badgeGrid}>
          {ACHIEVEMENTS_LIST.map((ach) => {
              const isUnlocked = unlockedAchievements.has(ach.achievement_id);
              return (
                  <TouchableOpacity key={ach.id} style={[styles.badgeCard, {backgroundColor: colors.cardBg, opacity: isUnlocked ? 1 : 0.5}]} onPress={() => Alert.alert(ach.title, ach.description)}>
                      <View style={[styles.badgeIcon, {backgroundColor: isUnlocked ? '#FACC1520' : '#333'}]}>
                          {isUnlocked ? <Trophy size={24} color="#FACC15" /> : <Lock size={24} color="#666" />}
                      </View>
                      <Text style={[styles.badgeTitle, {color: colors.text}]} numberOfLines={1}>{ach.title}</Text>
                  </TouchableOpacity>
              )
          })}
      </View>
  );

  // --- EDITOR MODAL ---
  const renderAvatarEditor = () => (
      <Modal visible={isEditingAvatar} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsEditingAvatar(false)}>
          <View style={[styles.editorContainer, {backgroundColor: colors.bg}]}>
              <View style={styles.editorHeader}>
                  <Text style={[styles.editorTitle, {color: colors.text}]}>Armurerie</Text>
                  <TouchableOpacity onPress={() => setIsEditingAvatar(false)}><X size={24} color={colors.text} /></TouchableOpacity>
              </View>

              <View style={styles.previewContainer}>
                  <AvatarGenerator config={tempAvatar} size={200} />
              </View>

              <ScrollView style={styles.configScroll}>
                  <Text style={styles.configLabel}>CLASSE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsRow}>
                      {AVATAR_CLASSES.map(cls => (
                          <TouchableOpacity key={cls.id} style={[styles.optionBtn, tempAvatar.class === cls.id && {borderColor: colors.accent, borderWidth: 2}]} onPress={() => setTempAvatar({...tempAvatar, class: cls.id})}>
                              <cls.icon size={20} color={tempAvatar.class === cls.id ? colors.accent : '#666'} />
                              <Text style={[styles.optionText, tempAvatar.class === cls.id && {color: colors.accent}]}>{cls.label}</Text>
                          </TouchableOpacity>
                      ))}
                  </ScrollView>

                  <Text style={styles.configLabel}>COULEUR NÉON</Text>
                  <View style={[styles.optionsRow, {flexWrap: 'wrap'}]}>
                      {COLORS.map(c => (
                          <TouchableOpacity key={c} style={[styles.colorDot, {backgroundColor: c}, tempAvatar.color === c && {borderWidth: 2, borderColor: '#FFF'}]} onPress={() => setTempAvatar({...tempAvatar, color: c})} />
                      ))}
                  </View>

                  <Text style={styles.configLabel}>CASQUE</Text>
                  <View style={styles.optionsRow}>
                      {['standard', 'visor', 'crown', 'halo'].map(h => (
                          <TouchableOpacity key={h} style={[styles.optionBtn, tempAvatar.helmet === h && {borderColor: colors.accent, borderWidth: 2}]} onPress={() => setTempAvatar({...tempAvatar, helmet: h as any})}>
                              <Text style={[styles.optionText, {textTransform: 'capitalize'}]}>{h}</Text>
                          </TouchableOpacity>
                      ))}
                  </View>

                  <Text style={styles.configLabel}>ARMURE</Text>
                  <View style={styles.optionsRow}>
                      {['standard', 'heavy', 'stealth', 'energy'].map(a => (
                          <TouchableOpacity key={a} style={[styles.optionBtn, tempAvatar.armor === a && {borderColor: colors.accent, borderWidth: 2}]} onPress={() => setTempAvatar({...tempAvatar, armor: a as any})}>
                              <Text style={[styles.optionText, {textTransform: 'capitalize'}]}>{a}</Text>
                          </TouchableOpacity>
                      ))}
                  </View>
                  
                  <View style={{height: 40}} />
              </ScrollView>

              <TouchableOpacity style={[styles.saveAvatarBtn, {backgroundColor: colors.button}]} onPress={saveAvatar}>
                  <Text style={styles.saveAvatarText}>SAUVEGARDER</Text>
              </TouchableOpacity>
          </View>
      </Modal>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.bg }]}>
      
      <View style={styles.header}>
            <View style={{width: 40}} /> 
            <Text style={[styles.headerTitle, {color: colors.text}]}>Cyber Arena</Text>
            <TouchableOpacity onPress={openProfile} style={styles.iconBtn}>
                <Image source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} style={styles.avatar} />
            </TouchableOpacity>
      </View>
      
      <View style={[styles.tabBar, {borderColor: colors.border}]}>
          {[
              {id: 'HQ', label: 'QG'},
              {id: 'QUESTS', label: 'QUÊTES'},
              {id: 'SHOP', label: 'MARCHÉ'},
              {id: 'BADGES', label: 'BADGES'}
          ].map(tab => (
              <TouchableOpacity 
                key={tab.id} 
                onPress={() => switchTab(tab.id)} 
                style={[styles.tabItem, activeTab === tab.id && {borderBottomColor: colors.accent, borderBottomWidth: 2}]}
              >
                  <Text style={[styles.tabText, activeTab === tab.id && {color: colors.text}]}>{tab.label}</Text>
              </TouchableOpacity>
          ))}
      </View>

      <View style={styles.contentArea}>
          {activeTab === 'HQ' && renderHQ()}
          {activeTab === 'QUESTS' && renderQuests()}
          {activeTab === 'SHOP' && renderShop()}
          {activeTab === 'BADGES' && renderBadges()}
      </View>

      {renderAvatarEditor()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#333' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 10 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { color: '#8E8E93', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  contentArea: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  
  // HQ
  avatarSection: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  rankBadge: { marginTop: -20, backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  rankText: { color: '#C4B5FD', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginTop: 16 },
  editBtnText: { fontWeight: '600', marginLeft: 6, fontSize: 12 },
  
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
  statBig: { fontSize: 18, fontWeight: '800' },

  progressBox: { padding: 16, borderRadius: 16 },
  barBg: { height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%' },
  progLabel: { fontSize: 12, fontWeight: '600' },
  progVal: { fontSize: 12, fontWeight: '700' },

  // QUESTS
  sectionHeader: { fontSize: 12, color: '#8E8E93', fontWeight: '700', marginBottom: 10 },
  questItem: { flexDirection: 'row', padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1, alignItems: 'center' },
  questIconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  questTitle: { fontWeight: '700', fontSize: 14, marginBottom: 2 },
  questDesc: { fontSize: 12, marginBottom: 6 },
  miniBarBg: { height: 4, backgroundColor: '#333', borderRadius: 2, width: '100%' },
  miniBarFill: { height: '100%', borderRadius: 2 },
  questRewards: { alignItems: 'flex-end', marginLeft: 10 },
  rewardText: { fontSize: 11, fontWeight: '600', color: '#C4B5FD', marginBottom: 2 },
  emptyText: { fontStyle: 'italic', color: '#666', textAlign: 'center' },

  // SHOP
  shopItem: { flexDirection: 'row', padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  shopIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  shopTitle: { fontWeight: '700', fontSize: 16 },
  shopRarity: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  shopDesc: { fontSize: 12 },
  buyBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  buyText: { fontWeight: '700' },
  ownedBadge: { flexDirection: 'row', alignItems: 'center' },

  // BADGES
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: { width: '30%', aspectRatio: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 8 },
  badgeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  badgeTitle: { fontSize: 10, fontWeight: '700', textAlign: 'center' },

  // EDITOR
  editorContainer: { flex: 1, paddingTop: 60 },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  editorTitle: { fontSize: 24, fontWeight: '800' },
  previewContainer: { alignItems: 'center', marginBottom: 30 },
  configScroll: { paddingHorizontal: 20 },
  configLabel: { color: '#666', fontSize: 12, fontWeight: '700', marginBottom: 10, marginTop: 10 },
  optionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  optionBtn: { padding: 10, borderRadius: 10, backgroundColor: '#1C1C1E', alignItems: 'center', minWidth: 80 },
  optionText: { color: '#FFF', fontSize: 12, marginTop: 4, fontWeight: '600' },
  colorDot: { width: 40, height: 40, borderRadius: 20, margin: 5 },
  saveAvatarBtn: { margin: 20, padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 40 },
  saveAvatarText: { color: '#FFF', fontWeight: '800', fontSize: 16 }
});

export default CyberKnight;