
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { PlayerProfile, UserProfile, Quest, AvatarConfig } from '../types';
import { Shield, Zap, Target, Star, Coins, RefreshCw, CheckCircle2, Trophy, Edit2, Sword, ChevronLeft, ChevronRight, Save } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getXpForNextLevel, getRankName } from '../services/gamification';
import { supabase } from '../services/supabase';
import AvatarGenerator from '../components/AvatarGenerator';
import { generateQuests } from '../services/ai';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Données de customisation (Similaires au Web)
const HELMETS = ['standard', 'visor', 'crown', 'halo'];
const ARMORS = ['standard', 'heavy', 'stealth', 'energy'];
const COLORS = ['#C4B5FD', '#34D399', '#F472B6', '#60A5FA', '#FACC15', '#F87171', '#A78BFA'];

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
  
  // Customization State
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState<AvatarConfig>(player.avatar_customization || { helmet: 'standard', armor: 'standard', color: '#C4B5FD', class: 'cyber_knight' });
  
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

  const saveCustomization = async () => {
      const { error } = await supabase.from('player_profiles').update({ avatar_customization: config }).eq('user_id', user.id);
      if (!error) {
          player.avatar_customization = config; // Optimistic update
          setIsEditing(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
          Alert.alert("Erreur", "Impossible de sauvegarder le skin.");
      }
  };

  const cycleOption = (type: 'helmet' | 'armor' | 'color', direction: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (type === 'helmet') {
          const idx = HELMETS.indexOf(config.helmet);
          const nextIdx = (idx + direction + HELMETS.length) % HELMETS.length;
          setConfig({ ...config, helmet: HELMETS[nextIdx] as any });
      } else if (type === 'armor') {
          const idx = ARMORS.indexOf(config.armor);
          const nextIdx = (idx + direction + ARMORS.length) % ARMORS.length;
          setConfig({ ...config, armor: ARMORS[nextIdx] as any });
      } else if (type === 'color') {
          const idx = COLORS.indexOf(config.color);
          const nextIdx = (idx + direction + COLORS.length) % COLORS.length;
          setConfig({ ...config, color: COLORS[nextIdx] as any });
      }
  };

  const completedCount = activeQuests.filter(q => q.completed).length;

  return (
    <View style={[styles.container, { paddingTop: noPadding ? 0 : insets.top, backgroundColor: colors.bg }]}>
      
      {/* HEADER CHARACTER SHEET */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
          
          <View style={styles.topRow}>
              <View>
                  <Text style={[styles.screenTitle, {color: colors.text}]}>Cyber Knight</Text>
                  <View style={styles.rankBadge}>
                      <Shield size={12} color="#FACC15" fill="#FACC15" />
                      <Text style={styles.rankText}>{rankName} • Niv {player.level}</Text>
                  </View>
              </View>
              <TouchableOpacity style={styles.creditsBox} activeOpacity={0.8}>
                  <Coins size={16} color="#FACC15" fill="#FACC15" />
                  <Text style={styles.creditsText}>{player.credits}</Text>
              </TouchableOpacity>
          </View>

          {/* AVATAR & CUSTOMIZATION ZONE */}
          <View style={styles.avatarSection}>
              <View style={styles.avatarDisplay}>
                  <AvatarGenerator config={isEditing ? config : player.avatar_customization} size={140} showGlow={true} />
              </View>

              {isEditing ? (
                  <View style={styles.controlsContainer}>
                      <ControlRow label="Casque" value={config.helmet} onPrev={() => cycleOption('helmet', -1)} onNext={() => cycleOption('helmet', 1)} />
                      <ControlRow label="Armure" value={config.armor} onPrev={() => cycleOption('armor', -1)} onNext={() => cycleOption('armor', 1)} />
                      <ControlRow label="Aura" value="Couleur" color={config.color} onPrev={() => cycleOption('color', -1)} onNext={() => cycleOption('color', 1)} />
                      
                      <TouchableOpacity style={[styles.saveBtn, {backgroundColor: colors.success}]} onPress={saveCustomization}>
                          <Save size={18} color="#000" />
                          <Text style={styles.saveText}>Sauvegarder</Text>
                      </TouchableOpacity>
                  </View>
              ) : (
                  <View style={styles.equipmentGrid}>
                      <EquipSlot icon={Shield} label="Casque" value={player.avatar_customization?.helmet || 'Standard'} color={colors.border} />
                      <EquipSlot icon={Shield} label="Armure" value={player.avatar_customization?.armor || 'Standard'} color={colors.border} />
                      <EquipSlot icon={Sword} label="Arme" value="Katana" color={colors.border} />
                      <TouchableOpacity style={[styles.editBtn, {borderColor: colors.accent}]} onPress={() => setIsEditing(true)}>
                          <Edit2 size={16} color={colors.accent} />
                          <Text style={[styles.editBtnText, {color: colors.accent}]}>Modifier</Text>
                      </TouchableOpacity>
                  </View>
              )}
          </View>

          {/* XP BAR */}
          <View style={styles.xpContainer}>
              <View style={styles.xpInfo}>
                  <Text style={{color: colors.textSub, fontSize: 10, fontWeight: '700'}}>PROGRESSION</Text>
                  <Text style={{color: colors.textSub, fontSize: 10}}>{xpInCurrentLevel} / {xpNeededForLevel} XP</Text>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* STATS */}
          <View style={styles.statsRow}>
              <StatItem icon={Target} value={activeQuests.length - completedCount} label="Quêtes" color="#60A5FA" bg="#1E293B" border="#334155" />
              <StatItem icon={Trophy} value={completedCount} label="Terminées" color="#F97316" bg="#2D1B0E" border="#451a03" />
              <StatItem icon={Zap} value={`+${completedCount * 50}`} label="XP Gagné" color="#34D399" bg="#0F291E" border="#064e3b" />
          </View>

          {/* QUÊTES */}
          <View style={styles.questsHeader}>
              <Text style={[styles.sectionTitle, {color: colors.text}]}>Journal de Quêtes</Text>
              <TouchableOpacity 
                  style={[styles.generateBtn, {borderColor: colors.border}]} 
                  onPress={handleGenerateQuests} 
                  disabled={generating}
              >
                  {generating ? <ActivityIndicator size="small" color={colors.text} /> : <RefreshCw size={14} color={colors.text} />}
                  <Text style={[styles.generateText, {color: colors.text}]}>Générer IA</Text>
              </TouchableOpacity>
          </View>

          <View style={styles.questsContainer}>
              {activeQuests.length === 0 && (
                  <View style={[styles.emptyState, {borderColor: colors.border}]}>
                      <RefreshCw size={32} color={colors.textSub} style={{opacity: 0.5}} />
                      <Text style={[styles.emptyText, {color: colors.textSub}]}>Zone vide.</Text>
                      <Text style={{color: colors.textSub, fontSize: 12}}>Générez de nouvelles quêtes.</Text>
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
                              <View style={[styles.dailyTag, {backgroundColor: 'rgba(59, 130, 246, 0.15)'}]}>
                                  <Text style={[styles.dailyTagText, {color: '#60A5FA'}]}>QUOTIDIENNE</Text>
                              </View>
                              <View style={styles.starsRow}>{[1,2].map(i => <Star key={i} size={10} color="#FACC15" fill="#FACC15" />)}</View>
                          </View>
                          
                          <Text style={[styles.questTitle, {color: colors.text}, quest.completed && {textDecorationLine: 'line-through', opacity: 0.6}]}>
                              {quest.title}
                          </Text>
                          
                          <View style={styles.rewardsRow}>
                              <Text style={[styles.rewardText, {color: '#C4B5FD'}]}>+{quest.reward_xp} XP</Text>
                              <Text style={[styles.rewardText, {color: '#FACC15'}]}> • +{quest.reward_credits} Crédits</Text>
                          </View>
                      </View>
                      
                      <View style={styles.questActionCol}>
                          {quest.completed ? (
                              <CheckCircle2 size={28} color="#4ADE80" />
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

// Helper Components
const EquipSlot = ({ icon: Icon, label, value, color }: any) => (
    <View style={[styles.equipSlot, {borderColor: color}]}>
        <Text style={styles.slotLabel}>{label}</Text>
        <Text style={styles.slotValue}>{value.toUpperCase()}</Text>
    </View>
);

const ControlRow = ({ label, value, onPrev, onNext, color }: any) => (
    <View style={styles.controlRow}>
        <TouchableOpacity onPress={onPrev} style={styles.arrowBtn}><ChevronLeft size={20} color="#FFF" /></TouchableOpacity>
        <View style={{alignItems: 'center', width: 100}}>
            <Text style={styles.controlLabel}>{label}</Text>
            {color ? (
                <View style={{width: 20, height: 20, borderRadius: 10, backgroundColor: color, marginTop: 4}} />
            ) : (
                <Text style={styles.controlValue}>{value}</Text>
            )}
        </View>
        <TouchableOpacity onPress={onNext} style={styles.arrowBtn}><ChevronRight size={20} color="#FFF" /></TouchableOpacity>
    </View>
);

const StatItem = ({ icon: Icon, value, label, color, bg, border }: any) => (
    <View style={[styles.statBox, {backgroundColor: bg, borderColor: border}]}>
        <Icon size={20} color={color} />
        <Text style={[styles.statValue, {color: '#FFF'}]}>{value}</Text>
        <Text style={styles.statName}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 20, backgroundColor: '#111', borderBottomWidth: 1 },
  
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  screenTitle: { fontSize: 24, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: 'rgba(250, 204, 21, 0.15)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  rankText: { color: '#FACC15', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  creditsBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  creditsText: { color: '#FACC15', fontWeight: '700', fontSize: 14 },

  avatarSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarDisplay: { width: 140, alignItems: 'center', justifyContent: 'center' },
  
  equipmentGrid: { flex: 1, gap: 8, paddingLeft: 20 },
  equipSlot: { padding: 10, borderRadius: 8, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  slotLabel: { color: '#666', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  slotValue: { color: '#FFF', fontSize: 12, fontWeight: '700', marginTop: 2 },
  
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8, borderWidth: 1, marginTop: 4, gap: 6 },
  editBtnText: { fontSize: 12, fontWeight: '700' },

  controlsContainer: { flex: 1, paddingLeft: 20, gap: 8 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 4, backgroundColor: '#222', borderRadius: 8 },
  arrowBtn: { padding: 8 },
  controlLabel: { color: '#888', fontSize: 10, fontWeight: '600' },
  controlValue: { color: '#FFF', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, marginTop: 8, gap: 6 },
  saveText: { fontWeight: '700', fontSize: 12, color: '#000' },

  xpContainer: { marginTop: 0 },
  xpInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpTrack: { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3 },

  scrollContent: { padding: 20, paddingBottom: 100 },
  
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statBox: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', marginTop: 6 },
  statName: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },

  questsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', textTransform: 'uppercase' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  generateText: { fontSize: 11, fontWeight: '600' },

  questsContainer: { gap: 12 },
  questCard: { flexDirection: 'row', padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  questContent: { flex: 1, paddingRight: 16 },
  questHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  dailyTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dailyTagText: { fontSize: 9, fontWeight: '800' },
  starsRow: { flexDirection: 'row', gap: 2 },
  questTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  rewardsRow: { flexDirection: 'row' },
  rewardText: { fontSize: 11, fontWeight: '700' },
  
  questActionCol: { justifyContent: 'center', alignItems: 'center' },
  claimBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', shadowColor: "#007AFF", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  claimText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderRadius: 16, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },
});

export default CyberKnight;
