import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { PlayerProfile, UserProfile, Quest, ShopItem } from '../types';
import { Shield, Zap, Target, Star, Coins, RefreshCw, CheckCircle2, Trophy, Swords, Crown, ShoppingBag, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getXpForNextLevel, getRankName, ACHIEVEMENTS_LIST } from '../services/gamification';
import { supabase } from '../services/supabase';
import AvatarGenerator from '../components/AvatarGenerator';
import { generateQuests } from '../services/ai';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// --- DATA MOCKS FOR SHOP ---
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
                  user_id: user.id, 
                  title: q.title, 
                  description: q.description, 
                  reward_xp: q.reward_xp,
                  reward_credits: q.reward_credits, 
                  target_value: 1, 
                  current_progress: 0, 
                  completed: false, 
                  quest_type: 'daily',
                  category: 'rpg'
              }));
              
              const { data, error } = await supabase.from('quests').insert(questsToInsert).select();
              
              if (error) {
                  console.error("Quest Insert Error", error);
                  throw error;
              }
              
              if (data) setActiveQuests([...activeQuests, ...data]);
          }
      } catch (e) { 
          Alert.alert("Erreur", "Impossible de générer les quêtes pour le moment."); 
          console.error(e);
      } finally { 
          setGenerating(false); 
      }
  };

  const buyItem = async (item: ShopItem) => {
      if (player.credits < item.price) {
          Alert.alert("Fonds insuffisants", "Complétez plus de quêtes !");
          return;
      }
      Alert.alert("Achat réussi", `Vous avez obtenu : ${item.title}`);
  };

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
                  <View key={ach.id} style={[styles.achievementCard, {backgroundColor: colors.cardBg, borderColor: unlocked ? colors.gold : colors.border, opacity: unlocked ? 1 : 0.6}]}>
                      <View style={[styles.achIcon, {backgroundColor: unlocked ? 'rgba(250, 204, 21, 0.2)' : 'rgba(255,255,255,0.05)'}]}>
                          <Trophy size={24} color={unlocked ? colors.gold : colors.textSub} />
                      </View>
                      <View style={{flex: 1}}>
                          <Text style={[styles.achTitle, {color: colors.text}]}>{ach.title}</Text>
                          <Text style={[styles.achDesc, {color: colors.textSub}]}>{ach.description}</Text>
                      </View>
                      {unlocked && <CheckCircle2 size={20} color={colors.gold} />}
                  </View>
              );
          })}
      </View>
  );

  return (
    <View style={[styles.container, {backgroundColor: colors.bg, paddingTop: noPadding ? 0 : insets.top}]}>
        <View style={styles.header}>
             <TouchableOpacity onPress={openMenu} style={{marginRight: 10}}>
                <Menu size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={{flex: 1, flexDirection: 'row', justifyContent: 'center'}}>
                 <View style={styles.rankBadge}>
                      <Crown size={14} color="#FFF" fill="#FFF" />
                      <Text style={styles.rankTextHeader}>{rankName}</Text>
                 </View>
            </View>
            <TouchableOpacity onPress={openProfile}>
                 <View style={styles.headerAvatar}>
                     <Text style={{color: '#FFF', fontWeight: 'bold'}}>{user.display_name?.charAt(0) || 'U'}</Text>
                 </View>
            </TouchableOpacity>
        </View>

        <View style={styles.avatarSection}>
            <AvatarGenerator config={player.avatar_customization} size={140} showGlow={true} />
            <Text style={[styles.levelTitle, {color: colors.text}]}>Niveau {player.level}</Text>
            
            <View style={styles.xpBarContainer}>
                <View style={[styles.xpBarFill, {width: `${progressPercent}%`, backgroundColor: colors.accent}]} />
            </View>
            <Text style={styles.xpText}>{Math.floor(xpInCurrentLevel)} / {xpNeededForLevel} XP</Text>
        </View>

        <View style={styles.tabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 12, paddingHorizontal: 20}}>
                {[
                    {id: 'ARENA', label: 'Arène', icon: Swords},
                    {id: 'SHOP', label: 'Marché', icon: ShoppingBag},
                    {id: 'ACHIEVEMENTS', label: 'Succès', icon: Trophy},
                    {id: 'STATS', label: 'Stats', icon: Target}
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <TouchableOpacity 
                            key={tab.id} 
                            style={[styles.tabItem, isActive && {backgroundColor: colors.tabActive, borderColor: colors.text}]}
                            onPress={() => setActiveTab(tab.id as any)}
                        >
                            <Icon size={16} color={isActive ? colors.text : colors.textSub} />
                            <Text style={[styles.tabText, {color: isActive ? colors.text : colors.textSub}]}>{tab.label}</Text>
                        </TouchableOpacity>
                    )
                })}
            </ScrollView>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {activeTab === 'ARENA' && renderArena()}
            {activeTab === 'SHOP' && renderShop()}
            {activeTab === 'ACHIEVEMENTS' && renderAchievements()}
            {activeTab === 'STATS' && (
                <View style={styles.emptyState}>
                     <Text style={{color: colors.textSub}}>Statistiques de combat bientôt disponibles.</Text>
                </View>
            )}
            <View style={{height: 100}} />
        </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rankBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FACC15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
    rankTextHeader: { color: '#000', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
    headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
    avatarSection: { alignItems: 'center', marginBottom: 20 },
    levelTitle: { fontSize: 24, fontWeight: '800', marginVertical: 10, fontStyle: 'italic' },
    xpBarContainer: { width: width * 0.6, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
    xpBarFill: { height: '100%' },
    xpText: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
    tabs: { marginBottom: 20 },
    tabItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
    tabText: { fontSize: 13, fontWeight: '700' },
    scrollContent: { paddingHorizontal: 20 },
    questsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 },
    generateText: { fontSize: 11, fontWeight: '600' },
    emptyState: { alignItems: 'center', padding: 30, borderWidth: 1, borderRadius: 20, borderStyle: 'dashed' },
    emptyText: { marginTop: 10, fontSize: 14 },
    questCard: { flexDirection: 'row', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
    questContent: { flex: 1, marginRight: 12 },
    questHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    tagText: { fontSize: 10, fontWeight: '700' },
    starsRow: { flexDirection: 'row', gap: 2 },
    questTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
    rewardsRow: { flexDirection: 'row' },
    rewardText: { fontSize: 12, fontWeight: '600' },
    questActionCol: { justifyContent: 'center' },
    claimBtn: { backgroundColor: '#4ADE80', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    claimText: { color: '#000', fontWeight: '800', fontSize: 12 },
    powerupSection: { marginTop: 20 },
    powerupCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10, minWidth: 140 },
    powerupTitle: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    powerupTime: { color: '#94A3B8', fontSize: 11 },
    shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    shopCard: { width: (width - 52) / 2, borderRadius: 16, padding: 16, borderWidth: 1 },
    itemIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    shopItemTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    shopItemDesc: { fontSize: 11, color: '#8E8E93', marginBottom: 12, height: 28 },
    priceTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    priceText: { color: '#FACC15', fontWeight: '700' },
    achievementCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
    achIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    achTitle: { fontWeight: '700', fontSize: 15 },
    achDesc: { fontSize: 12 }
});

export default CyberKnight;