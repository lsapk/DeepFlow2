
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { PlayerProfile, UserProfile, Quest } from '../types';
import { Shield, Zap, Target, Star, Coins, RefreshCw, CheckCircle2, Trophy, Flame } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getXpForNextLevel, getRankName } from '../services/gamification';
import { supabase } from '../services/supabase';
import AvatarGenerator from '../components/AvatarGenerator';
import { generateQuests } from '../services/ai';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

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
  const [activeQuests, setActiveQuests] = useState<Quest[]>(initialQuests || []);
  const [generating, setGenerating] = useState(false);
  
  useEffect(() => {
      setActiveQuests(initialQuests || []);
  }, [initialQuests]);

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
      success: '#4ADE80',
      gold: '#FACC15'
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
      } catch (e) {
          Alert.alert("Erreur", "Problème de synchronisation");
      }
  };

  const handleGenerateQuests = async () => {
      setGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
          const newQuestsData = await generateQuests(player.level, "Utilisateur actif, aime le code et le sport");
          
          if (newQuestsData.length > 0) {
              const questsToInsert = newQuestsData.map(q => ({
                  user_id: user.id,
                  title: q.title,
                  description: q.description,
                  reward_xp: q.reward_xp,
                  reward_credits: q.reward_credits,
                  target_value: q.target_value,
                  current_progress: 0,
                  completed: false,
                  quest_type: 'daily'
              }));

              const { data, error } = await supabase.from('quests').insert(questsToInsert).select();
              if (data) setActiveQuests([...activeQuests, ...data]);
          }
      } catch (e) {
          Alert.alert("Erreur IA", "Impossible de générer des quêtes.");
      } finally {
          setGenerating(false);
      }
  };

  const completedCount = activeQuests.filter(q => q.completed).length;

  return (
    <View style={[styles.container, { paddingTop: noPadding ? 0 : insets.top, backgroundColor: colors.bg }]}>
      
      {/* HEADER IMMERSIF MOBILE */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerTopRow}>
              <View>
                  <Text style={[styles.screenTitle, {color: colors.text}]}>Cyber Arena</Text>
                  <View style={styles.rankBadge}>
                      <Shield size={12} color="#FACC15" fill="#FACC15" />
                      <Text style={styles.rankText}>{rankName}</Text>
                  </View>
              </View>
              <View style={[styles.creditsBox, {backgroundColor: '#333'}]}>
                  <Coins size={16} color="#FACC15" fill="#FACC15" />
                  <Text style={styles.creditsText}>{player.credits}</Text>
              </View>
          </View>

          <View style={styles.charStatsContainer}>
              <View style={[styles.avatarFrame, {borderColor: colors.border}]}>
                  <AvatarGenerator config={player.avatar_customization} size={70} showGlow={false} />
              </View>
              <View style={styles.xpSection}>
                  <View style={styles.xpInfoRow}>
                      <Text style={[styles.levelBig, {color: colors.text}]}>Niv. {player.level}</Text>
                      <Text style={styles.xpLabel}>{xpInCurrentLevel} / {xpNeededForLevel} XP</Text>
                  </View>
                  <View style={[styles.xpTrack, {backgroundColor: '#333'}]}>
                      <LinearGradient
                          colors={['#06b6d4', '#3b82f6']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.xpFill, { width: `${progressPercent}%` }]} 
                      />
                  </View>
              </View>
          </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* STATS - SCROLL HORIZONTAL (Meilleur pour mobile) */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll} style={{flexGrow: 0}}>
              <View style={[styles.statCardMobile, {backgroundColor: '#1E293B', borderColor: '#334155'}]}>
                  <View style={styles.statIconCircle}><Target size={20} color="#60A5FA" /></View>
                  <View>
                      <Text style={[styles.statValue, {color: '#FFF'}]}>{activeQuests.length - completedCount}</Text>
                      <Text style={styles.statName}>Actives</Text>
                  </View>
              </View>
              
              <View style={[styles.statCardMobile, {backgroundColor: '#2D1B0E', borderColor: '#451a03'}]}>
                  <View style={styles.statIconCircle}><Trophy size={20} color="#F97316" /></View>
                  <View>
                      <Text style={[styles.statValue, {color: '#FFF'}]}>{completedCount}</Text>
                      <Text style={styles.statName}>Terminées</Text>
                  </View>
              </View>

              <View style={[styles.statCardMobile, {backgroundColor: '#0F291E', borderColor: '#064e3b'}]}>
                  <View style={styles.statIconCircle}><Zap size={20} color="#34D399" /></View>
                  <View>
                      <Text style={[styles.statValue, {color: '#FFF'}]}>+{completedCount * 50}</Text>
                      <Text style={styles.statName}>XP Gagnés</Text>
                  </View>
              </View>
          </ScrollView>

          {/* QUÊTES SECTION */}
          <View style={styles.questsHeader}>
              <Text style={[styles.sectionTitle, {color: colors.text}]}>Tableau des Quêtes</Text>
              <TouchableOpacity 
                  style={[styles.generateBtn, {borderColor: colors.border}]} 
                  onPress={handleGenerateQuests} 
                  disabled={generating}
              >
                  {generating ? <ActivityIndicator size="small" color={colors.text} /> : <RefreshCw size={16} color={colors.text} />}
                  <Text style={[styles.generateText, {color: colors.text}]}>Générer</Text>
              </TouchableOpacity>
          </View>

          <View style={styles.questsContainer}>
              {activeQuests.length === 0 && (
                  <View style={[styles.emptyState, {borderColor: colors.border}]}>
                      <RefreshCw size={32} color={colors.textSub} style={{opacity: 0.5}} />
                      <Text style={[styles.emptyText, {color: colors.textSub}]}>Zone vide.</Text>
                      <Text style={{color: colors.textSub, fontSize: 12}}>Générez de nouvelles quêtes pour gagner de l'XP.</Text>
                  </View>
              )}
              {activeQuests.map((quest) => (
                  <TouchableOpacity 
                      key={quest.id} 
                      style={[styles.questCard, {backgroundColor: colors.cardBg, borderColor: colors.border}]}
                      activeOpacity={0.9}
                      onPress={() => !quest.completed && handleClaimQuest(quest)}
                  >
                      <View style={styles.questContent}>
                          <View style={styles.questHeaderRow}>
                              <View style={styles.tagRow}>
                                  <View style={[styles.dailyTag, {backgroundColor: 'rgba(59, 130, 246, 0.15)'}]}>
                                      <Text style={[styles.dailyTagText, {color: '#60A5FA'}]}>QUOTIDIENNE</Text>
                                  </View>
                                  <View style={styles.starsRow}>
                                      {[1,2,3].map(i => <Star key={i} size={10} color="#FACC15" fill="#FACC15" />)}
                                  </View>
                              </View>
                          </View>
                          
                          <Text style={[styles.questTitle, {color: colors.text}, quest.completed && {textDecorationLine: 'line-through', opacity: 0.6}]}>
                              {quest.title}
                          </Text>
                          
                          <View style={styles.rewardsRow}>
                              <View style={styles.rewardPill}>
                                  <Zap size={12} color="#C4B5FD" fill="#C4B5FD" />
                                  <Text style={[styles.rewardText, {color: '#C4B5FD'}]}>+{quest.reward_xp} XP</Text>
                              </View>
                              <View style={styles.rewardPill}>
                                  <Coins size={12} color="#FACC15" fill="#FACC15" />
                                  <Text style={[styles.rewardText, {color: '#FACC15'}]}>+{quest.reward_credits}</Text>
                              </View>
                          </View>
                      </View>
                      
                      <View style={styles.questActionCol}>
                          {quest.completed ? (
                              <View style={styles.doneCircle}>
                                  <CheckCircle2 size={24} color="#4ADE80" />
                              </View>
                          ) : (
                              <View style={styles.claimBtn}>
                                  <Text style={styles.claimText}>GO</Text>
                              </View>
                          )}
                      </View>
                  </TouchableOpacity>
              ))}
          </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 24, backgroundColor: '#111', borderBottomWidth: 1 },
  
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  screenTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: 'rgba(250, 204, 21, 0.15)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  rankText: { color: '#FACC15', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  
  creditsBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  creditsText: { color: '#FACC15', fontWeight: '700', fontSize: 16 },

  charStatsContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarFrame: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  
  xpSection: { flex: 1, justifyContent: 'center' },
  xpInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  levelBig: { fontSize: 20, fontWeight: '700' },
  xpLabel: { color: '#888', fontSize: 12, fontWeight: '600' },
  xpTrack: { height: 10, borderRadius: 5, width: '100%', overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 5 },

  scrollContent: { paddingBottom: 100 },
  
  // STATS SCROLL
  statsScroll: { paddingHorizontal: 20, paddingVertical: 20, gap: 12 },
  statCardMobile: { width: 140, height: 80, borderRadius: 16, padding: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 12 },
  statIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statName: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },

  // QUESTS
  questsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  generateText: { fontSize: 12, fontWeight: '600' },

  questsContainer: { paddingHorizontal: 20, gap: 12 },
  
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderRadius: 16, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '600' },

  questCard: { flexDirection: 'row', padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  questContent: { flex: 1, paddingRight: 16 },
  questHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dailyTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dailyTagText: { fontSize: 10, fontWeight: '800' },
  starsRow: { flexDirection: 'row', gap: 2 },
  
  questTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, lineHeight: 22 },
  
  rewardsRow: { flexDirection: 'row', gap: 8 },
  rewardPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rewardText: { fontSize: 11, fontWeight: '700' },

  questActionCol: { justifyContent: 'center', alignItems: 'center' },
  claimBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', shadowColor: "#007AFF", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  claimText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  doneCircle: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

export default CyberKnight;
