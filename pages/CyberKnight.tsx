
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, FlatList, ActivityIndicator } from 'react-native';
import { PlayerProfile, UserProfile, Quest, Achievement, ShopItem } from '../types';
import { Shield, Zap, Target, Star, Coins, RefreshCw, CheckCircle2, Trophy, Flame, Swords, Crown, Lock, ShoppingBag, Infinity as InfinityIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getXpForNextLevel, getRankName, ACHIEVEMENTS_LIST } from '../services/gamification';
import { supabase } from '../services/supabase';
import AvatarGenerator from '../components/AvatarGenerator';
import { generateQuests } from '../services/ai';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// --- DATA MOCKS FOR SHOP (To be moved to DB if needed) ---
const SHOP_ITEMS: ShopItem[] = [
    { id: 'boost_xp_24h', title: 'Boost XP x2', description: 'Double XP pendant 24h.', price: 150, category: 'boost', rarity: 'rare', icon: 'Zap', color: '#FACC15' },
    { id: 'shield_3d', title: 'Méga Bouclier', description: 'Protège vos streaks 3 jours.', price: 300, category: 'protection', rarity: 'epic', icon: 'Shield', color: '#60A5FA' },
    { id: 'ai_pack_10', title: 'Pack IA +10', description: '10 Crédits IA supplémentaires.', price: 100, category: 'boost', rarity: 'common', icon: 'Brain', color: '#C4B5FD' },
    { id: 'chest_gold', title: 'Coffre Doré', description: 'Contient des cosmétiques rares.', price: 500, category: 'box', rarity: 'legendary', icon: 'Box', color: '#F59E0B' },
];

interface CyberKnightProps {
  player: PlayerProfile;
  user: UserProfile;
  quests: Quest[];
  openMenu: () => void;
  openProfile: () => void;
  isDarkMode?: boolean;
  noPadding?: boolean;
}

const CyberKnight: React.FC<CyberKnightProps> = ({ player, user, quests: initialQuests, openMenu, openProfile, isDarkMode = true, noPadding = false }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'ARENA' | 'SHOP' | 'ACHIEVEMENTS' | 'STATS'>('ARENA');
  
  const [activeQuests, setActiveQuests] = useState<Quest[]>(initialQuests || []);
  const [activePowerups, setActivePowerups] = useState<any[]>([]); // Mock active powerups
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
      setActiveQuests(initialQuests || []);
      fetchUserData();
  }, [initialQuests]);

  const fetchUserData = async () => {
      // Fetch unlocked achievements
      const { data: achievements } = await supabase.from('unlocked_achievements').select('achievement_id').eq('user_id', user.id);
      if (achievements) {
          setUnlockedAchievements(new Set(achievements.map(a => a.achievement_id)));
      }
      
      // Fetch active powerups (mocked if table empty or non-existent in this context, assuming logic exists)
      const { data: powerups } = await supabase.from('active_powerups').select('*').eq('user_id', user.id);
      if (powerups) setActivePowerups(powerups);
  };

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
      gold: '#FACC15',
      tabActive: isDarkMode ? '#333' : '#E5E5EA'
  };

  const handleClaimQuest = async (quest: Quest) => {
      if (quest.completed) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const updatedQuests = activeQuests.map(q => q.id === quest.id ? { ...q, completed: true } : q);
      setActiveQuests(updatedQuests);
      try {
          await Promise.all([
              supabase.from('quests').update({ completed: true }).eq('id', quest.id),
              supabase.from('player_profiles').update({ 
                  experience_points: player.experience_points + quest.reward_xp,
                  credits: player.credits + quest.reward_credits
              }).eq('user_id', user.id)
          ]);
      } catch (e) { Alert.alert("Erreur Sync"); }
  };

  const handleGenerateQuests = async () => {
      setGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
          const newQuestsData = await generateQuests(player.level, "Utilisateur actif");
          if (newQuestsData.length > 0) {
              const questsToInsert = newQuestsData.map(q => ({
                  user_id: user.id, title: q.title, description: q.description, reward_xp: q.reward_xp,
                  reward_credits: q.reward_credits, target_value: 1, current_progress: 0, completed: false, quest_type: 'daily'
              }));
              const { data } = await supabase.from('quests').insert(questsToInsert).select();
              if (data) setActiveQuests([...activeQuests, ...data]);
          }
      } catch (e) { Alert.alert("Erreur IA"); } finally { setGenerating(false); }
  };

  const buyItem = async (item: ShopItem) => {
      if (player.credits < item.price) {
          Alert.alert("Fonds insuffisants", "Complétez plus de quêtes !");
          return;
      }
      Alert.alert("Achat réussi", `Vous avez obtenu : ${item.title}`);
      // Deduction logic would go here
  };

  // --- RENDERERS ---

  const renderArena = () => (
      <View>
          <View style={styles.questsHeader}>
              <Text style={[styles.sectionTitle, {color: colors.text}]}>DÉFIS DU JOUR</Text>
              <TouchableOpacity style={[styles.generateBtn, {borderColor: colors.border}]} onPress={handleGenerateQuests} disabled={generating}>
                  {generating ? <ActivityIndicator size="small" color={colors.text} /> : <RefreshCw size={14} color={colors.text} />}
                  <Text style={[styles.generateText, {color: colors.text}]}>IA Refresh</Text>
              </TouchableOpacity>
          </View>

          {activeQuests.length === 0 && (
              <View style={[styles.emptyState, {borderColor: colors.border}]}>
                  <Swords size={32} color={colors.textSub} style={{opacity: 0.5}} />
                  <Text style={[styles.emptyText, {color: colors.textSub}]}>Arène vide.</Text>
                  <Text style={{color: colors.textSub, fontSize: 12}}>Générez des quêtes pour combattre.</Text>
              </View>
          )}

          {activeQuests.map((quest) => (
              <TouchableOpacity 
                  key={quest.id} 
                  style={[styles.questCard, {backgroundColor: colors.cardBg, borderColor: quest.completed ? colors.border : colors.accent}]}
                  activeOpacity={0.9}
                  onPress={() => !quest.completed && handleClaimQuest(quest)}
              >
                  <View style={styles.questContent}>
                      <View style={styles.questHeaderRow}>
                          <View style={[styles.tag, {backgroundColor: 'rgba(196, 181, 253, 0.15)'}]}>
                              <Text style={[styles.tagText, {color: colors.accent}]}>QUÊTE</Text>
                          </View>
                          <View style={styles.starsRow}>{[1,2].map(i => <Star key={i} size={10} color="#FACC15" fill="#FACC15" />)}</View>
                      </View>
                      <Text style={[styles.questTitle, {color: colors.text}, quest.completed && {textDecorationLine: 'line-through', opacity: 0.5}]}>{quest.title}</Text>
                      <View style={styles.rewardsRow}>
                          <Text style={[styles.rewardText, {color: colors.accent}]}>+{quest.reward_xp} XP</Text>
                          <Text style={[styles.rewardText, {color: '#FACC15'}]}> • +{quest.reward_credits} Or</Text>
                      </View>
                  </View>
                  <View style={styles.questActionCol}>
                      {quest.completed ? <CheckCircle2 size={28} color="#4ADE80" /> : (
                          <View style={styles.claimBtn}><Text style={styles.claimText}>GO</Text></View>
                      )}
                  </View>
              </TouchableOpacity>
          ))}
          
          <View style={styles.powerupSection}>
              <Text style={[styles.sectionTitle, {color: colors.text, marginBottom: 12}]}>POWER-UPS ACTIFS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12}}>
                  <View style={[styles.powerupCard, {backgroundColor: '#1E293B', borderColor: '#334155'}]}>
                      <Shield size={20} color="#60A5FA" />
                      <View>
                          <Text style={styles.powerupTitle}>Protection</Text>
                          <Text style={styles.powerupTime}>2j restants</Text>
                      </View>
                  </View>
                  <View style={[styles.powerupCard, {backgroundColor: '#2D1B0E', borderColor: '#451a03'}]}>
                      <Zap size={20} color="#FACC15" />
                      <View>
                          <Text style={[styles.powerupTitle, {color: '#FACC15'}]}>Double XP</Text>
                          <Text style={styles.powerupTime}>12h restants</Text>
                      </View>
                  </View>
              </ScrollView>
          </View>
      </View>
  );

  const renderShop = () => (
      <View style={styles.shopGrid}>
          {SHOP_ITEMS.map((item) => (
              <TouchableOpacity key={item.id} style={[styles.shopCard, {backgroundColor: colors.cardBg, borderColor: colors.border}]} onPress={() => buyItem(item)}>
                  <View style={[styles.itemIcon, {backgroundColor: `${item.color}20`}]}>
                      {item.icon === 'Zap' && <Zap size={24} color={item.color} />}
                      {item.icon === 'Shield' && <Shield size={24} color={item.color} />}
                      {item.icon === 'Brain' && <Trophy size={24} color={item.color} />}
                      {item.icon === 'Box' && <ShoppingBag size={24} color={item.color} />}
                  </View>
                  <Text style={[styles.shopItemTitle, {color: colors.text}]}>{item.title}</Text>
                  <Text style={styles.shopItemDesc} numberOfLines={2}>{item.description}</Text>
                  <View style={styles.priceTag}>
                      <Coins size={12} color="#FACC15" fill="#FACC15" />
                      <Text style={styles.priceText}>{item.price}</Text>
                  </View>
              </TouchableOpacity>
          ))}
      </View>
  );

  const renderAchievements = () => (
      <View style={{gap: 12}}>
          {ACHIEVEMENTS_LIST.map((ach) => {
              const unlocked = unlockedAchievements.has(ach.achievement_id);
              return (
                  <View key={ach.id} style={[styles.achCard, {backgroundColor: colors.cardBg, borderColor: unlocked ? '#FACC15' : colors.border, opacity: unlocked ? 1 : 0.6}]}>
                      <View style={[styles.achIcon, {backgroundColor: unlocked ? 'rgba(250, 204, 21, 0.2)' : '#333'}]}>
                          {unlocked ? <Trophy size={24} color="#FACC15" /> : <Lock size={24} color={colors.textSub} />}
                      </View>
                      <View style={{flex: 1}}>
                          <Text style={[styles.achTitle, {color: colors.text}]}>{ach.title}</Text>
                          <Text style={styles.achDesc}>{ach.description}</Text>
                          <View style={styles.achProgressBg}>
                              <View style={[styles.achProgressFill, {width: unlocked ? '100%' : '30%', backgroundColor: unlocked ? '#FACC15' : '#555'}]} />
                          </View>
                      </View>
                  </View>
              )
          })}
      </View>
  );

  return (
    <View style={[styles.container, { paddingTop: noPadding ? 0 : insets.top, backgroundColor: colors.bg }]}>
      
      {/* IMMERSIVE HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerTop}>
              <View style={styles.rankContainer}>
                  <Text style={[styles.screenTitle, {color: colors.text}]}>Cyber Arena</Text>
                  <View style={styles.rankBadge}>
                      <Crown size={12} color="#FACC15" fill="#FACC15" />
                      <Text style={styles.rankText}>{rankName}</Text>
                  </View>
              </View>
              <View style={styles.wallet}>
                  <Coins size={16} color="#FACC15" fill="#FACC15" />
                  <Text style={styles.walletText}>{player.credits}</Text>
              </View>
          </View>

          <View style={styles.profileStats}>
              <View style={styles.avatarWrapper}>
                  <AvatarGenerator config={player.avatar_customization} size={80} showGlow={true} />
                  <View style={styles.levelCircle}><Text style={styles.levelNum}>{player.level}</Text></View>
              </View>
              <View style={{flex: 1, justifyContent: 'center'}}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
                      <Text style={[styles.statLabel, {color: colors.text}]}>Progression XP</Text>
                      <Text style={[styles.statLabel, {color: colors.accent}]}>{xpInCurrentLevel} / {xpNeededForLevel}</Text>
                  </View>
                  <View style={styles.xpTrack}>
                      <LinearGradient colors={['#C4B5FD', '#8B5CF6']} start={{x:0, y:0}} end={{x:1, y:0}} style={[styles.xpFill, {width: `${progressPercent}%`}]} />
                  </View>
                  <View style={styles.infinityRow}>
                      <InfinityIcon size={14} color={colors.textSub} />
                      <Text style={{color: colors.textSub, fontSize: 10, marginLeft: 4}}>Potentiel Infini</Text>
                  </View>
              </View>
          </View>
      </View>

      {/* TABS */}
      <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20, gap: 10}}>
              {['ARENA', 'SHOP', 'ACHIEVEMENTS', 'STATS'].map((tab: any) => (
                  <TouchableOpacity 
                      key={tab} 
                      onPress={() => setActiveTab(tab)} 
                      style={[styles.tab, activeTab === tab && {backgroundColor: colors.text, borderColor: colors.text}, {borderColor: colors.border}]}
                  >
                      <Text style={[styles.tabText, {color: activeTab === tab ? (isDarkMode ? '#000' : '#FFF') : colors.textSub}]}>{tab}</Text>
                  </TouchableOpacity>
              ))}
          </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'ARENA' && renderArena()}
          {activeTab === 'SHOP' && renderShop()}
          {activeTab === 'ACHIEVEMENTS' && renderAchievements()}
          {activeTab === 'STATS' && (
              <View style={{padding: 40, alignItems: 'center'}}>
                  <Text style={{color: colors.textSub}}>Statistiques détaillées bientôt.</Text>
              </View>
          )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 24, backgroundColor: '#111', borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  screenTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  rankContainer: { justifyContent: 'center' },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: 'rgba(250, 204, 21, 0.15)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  rankText: { color: '#FACC15', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  walletText: { color: '#FACC15', fontWeight: '700', fontSize: 16 },
  
  profileStats: { flexDirection: 'row', gap: 20 },
  avatarWrapper: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  levelCircle: { position: 'absolute', bottom: -5, right: -5, width: 28, height: 28, borderRadius: 14, backgroundColor: '#C4B5FD', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  levelNum: { fontSize: 12, fontWeight: '800', color: '#000' },
  statLabel: { fontSize: 12, fontWeight: '600' },
  xpTrack: { height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  xpFill: { height: '100%' },
  infinityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },

  tabsContainer: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222', backgroundColor: '#000' },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  tabText: { fontSize: 12, fontWeight: '700' },

  scrollContent: { padding: 20, paddingBottom: 100 },

  // ARENA
  questsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  generateText: { fontSize: 11, fontWeight: '600' },
  questCard: { flexDirection: 'row', padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 12 },
  questContent: { flex: 1, paddingRight: 16 },
  questHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 9, fontWeight: '800' },
  starsRow: { flexDirection: 'row', gap: 2 },
  questTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  rewardsRow: { flexDirection: 'row' },
  rewardText: { fontSize: 11, fontWeight: '700' },
  questActionCol: { justifyContent: 'center', alignItems: 'center' },
  claimBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center' },
  claimText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderRadius: 16, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },

  powerupSection: { marginTop: 24 },
  powerupCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, minWidth: 140 },
  powerupTitle: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  powerupTime: { color: '#AAA', fontSize: 11 },

  // SHOP
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  shopCard: { width: (width - 52) / 2, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  itemIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  shopItemTitle: { fontWeight: '700', fontSize: 14, marginBottom: 4, textAlign: 'center' },
  shopItemDesc: { color: '#888', fontSize: 11, textAlign: 'center', marginBottom: 12, height: 32 },
  priceTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#222', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priceText: { color: '#FACC15', fontWeight: '700', fontSize: 12 },

  // ACHIEVEMENTS
  achCard: { flexDirection: 'row', padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 16 },
  achIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  achTitle: { fontWeight: '700', fontSize: 15, marginBottom: 2 },
  achDesc: { color: '#888', fontSize: 12, marginBottom: 8 },
  achProgressBg: { height: 4, backgroundColor: '#333', borderRadius: 2, width: '100%' },
  achProgressFill: { height: '100%', borderRadius: 2 },
});

export default CyberKnight;
