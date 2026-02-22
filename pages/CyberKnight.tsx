import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { PlayerProfile, UserProfile, Quest, ShopItem, Achievement } from '../types';
import { Shield, Zap, Star, Coins, RefreshCw, CheckCircle2, Trophy, Crown, ShoppingBag, Gift, Flame, Brain, Sparkles } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getXpForNextLevel, getRankName, ACHIEVEMENTS_LIST } from '../services/gamification';
import { supabase } from '../services/supabase';
import AvatarGenerator from '../components/AvatarGenerator';
import { generateQuests } from '../services/ai';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

type TabId = 'QUESTS' | 'ACHIEVEMENTS' | 'SHOP';

type ShopCategory = 'boost' | 'protection' | 'box' | 'cosmetic';

const SHOP_ITEMS: ShopItem[] = [
  { id: 'ai_pack_basic', title: 'Pack IA Basic', description: 'Recevez 25 crédits IA', price: 50, category: 'boost', rarity: 'common', icon: 'Brain', color: '#3B82F6', metadata: { ai_credits: 25 } },
  { id: 'ai_pack_mega', title: 'Pack IA Mega', description: 'Recevez 100 crédits IA', price: 150, category: 'boost', rarity: 'rare', icon: 'Brain', color: '#8B5CF6', metadata: { ai_credits: 100 } },
  { id: 'xp_boost_x2', title: 'XP Boost x2', description: 'Double XP pendant 24h', price: 100, category: 'boost', rarity: 'rare', icon: 'Zap', color: '#F59E0B', metadata: { powerup_type: 'xp_x2', multiplier: 2 } },
  { id: 'xp_boost_x3', title: 'XP Boost x3', description: 'Triple XP pendant 24h', price: 200, category: 'boost', rarity: 'epic', icon: 'Flame', color: '#EF4444', metadata: { powerup_type: 'xp_x3', multiplier: 3 } },
  { id: 'shield_3d', title: 'Bouclier de Streak', description: 'Protège 3 jours', price: 75, category: 'protection', rarity: 'common', icon: 'Shield', color: '#22C55E', metadata: { powerup_type: 'streak_shield', days: 3 } },
  { id: 'shield_7d', title: 'Méga Bouclier', description: 'Protège 7 jours', price: 150, category: 'protection', rarity: 'rare', icon: 'Shield', color: '#06B6D4', metadata: { powerup_type: 'streak_shield_plus', days: 7 } },
  { id: 'mystery_box', title: 'Boîte Mystère', description: 'Récompense aléatoire', price: 30, category: 'box', rarity: 'epic', icon: 'Gift', color: '#D946EF' },
  { id: 'legendary_chest', title: 'Coffre Légendaire', description: 'Récompense rare garantie', price: 250, category: 'box', rarity: 'legendary', icon: 'Crown', color: '#FACC15' },
  { id: 'cos_visor', title: 'Visière Cyber', description: 'Accessoire Visière', price: 80, category: 'cosmetic', rarity: 'rare', icon: 'Sparkles', color: '#0EA5E9', metadata: { unlockable_type: 'helmet', unlockable_id: 'visor' } },
  { id: 'cos_crown', title: 'Couronne Néon', description: 'Accessoire Couronne', price: 120, category: 'cosmetic', rarity: 'epic', icon: 'Crown', color: '#A855F7', metadata: { unlockable_type: 'helmet', unlockable_id: 'crown' } },
  { id: 'cos_energy_armor', title: 'Armure Énergie', description: 'Armure améliorée', price: 140, category: 'cosmetic', rarity: 'epic', icon: 'Zap', color: '#7C3AED', metadata: { unlockable_type: 'armor', unlockable_id: 'energy' } },
];

const EXTRA_ACHIEVEMENTS: Achievement[] = [
  { id: 'quest_hunter', achievement_id: 'quest_hunter', title: 'Chasseur de Quêtes', description: 'Complétez 5 quêtes', icon: 'Target', category: 'quest', target_value: 5 },
  { id: 'quest_legend', achievement_id: 'quest_legend', title: 'Légende des Quêtes', description: 'Complétez 100 quêtes', icon: 'Crown', category: 'quest', target_value: 100 },
  { id: 'focus_warrior', achievement_id: 'focus_warrior', title: 'Guerrier du Focus', description: 'Terminez 10 sessions de focus', icon: 'Zap', category: 'focus', target_value: 10 },
  { id: 'habit_builder', achievement_id: 'habit_builder', title: 'Bâtisseur d’Habitudes', description: 'Maintenez 1 habitude 7 jours', icon: 'Flame', category: 'habit', target_value: 7 },
  { id: 'level_25', achievement_id: 'level_25', title: 'Niveau 25 Atteint', description: 'Atteignez le niveau 25', icon: 'Star', category: 'level', target_value: 25 },
  { id: 'task_slayer', achievement_id: 'task_slayer', title: 'Tueur de Tâches', description: 'Complétez 50 tâches', icon: 'Zap', category: 'task', target_value: 50 },
  { id: 'ai_friend', achievement_id: 'ai_friend', title: 'Ami de l’IA', description: 'Utilisez 50 crédits IA', icon: 'Brain', category: 'journal', target_value: 50 },
  { id: 'collector', achievement_id: 'collector', title: 'Collectionneur', description: 'Achetez 10 items boutique', icon: 'ShoppingBag', category: 'quest', target_value: 10 },
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

const CyberKnight: React.FC<CyberKnightProps> = ({ player, user, quests: initialQuests, openProfile, isDarkMode = true, noPadding = false }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabId>('QUESTS');
  const [shopCategory, setShopCategory] = useState<ShopCategory>('boost');
  const [activeQuests, setActiveQuests] = useState<Quest[]>(initialQuests || []);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [processingPurchaseId, setProcessingPurchaseId] = useState<string | null>(null);

  useEffect(() => {
    setActiveQuests(initialQuests || []);
    fetchUserData();
  }, [initialQuests]);

  const achievementCatalog = useMemo(() => {
    const map = new Map<string, Achievement>();
    [...ACHIEVEMENTS_LIST, ...EXTRA_ACHIEVEMENTS].forEach((a) => map.set(a.achievement_id, a));
    return Array.from(map.values());
  }, []);

  const fetchUserData = async () => {
    const [unlockedRes, achievementsRes] = await Promise.all([
      supabase.from('unlocked_achievements').select('achievement_id').eq('user_id', user.id),
      supabase.from('achievements').select('achievement_id').eq('user_id', user.id),
    ]);

    const ids = [
      ...(unlockedRes.data || []).map((a: any) => a.achievement_id),
      ...(achievementsRes.data || []).map((a: any) => a.achievement_id),
    ];
    setUnlockedAchievements(new Set(ids));
  };

  const xpRequired = getXpForNextLevel(player.level);
  const prevLevelXp = getXpForNextLevel(player.level - 1);
  const xpInCurrentLevel = player.experience_points - prevLevelXp;
  const xpNeededForLevel = xpRequired - prevLevelXp;
  const progressPercent = Math.min(100, (xpInCurrentLevel / Math.max(1, xpNeededForLevel)) * 100);
  const rankName = getRankName(player.level);

  const colors = {
    bg: isDarkMode ? '#000000' : '#F2F2F7',
    cardBg: isDarkMode ? '#1C1C1E' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    textSub: isDarkMode ? '#8E8E93' : '#8E8E93',
    border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
    accent: '#60A5FA',
    gold: '#FACC15',
    tabActive: isDarkMode ? '#333' : '#E5E5EA'
  };

  const handleClaimQuest = async (quest: Quest) => {
    if (quest.completed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const nextXp = player.experience_points + quest.reward_xp;
    let nextLevel = player.level;
    while (nextXp >= getXpForNextLevel(nextLevel)) {
      nextLevel += 1;
    }

    // Cohérence avec le reste de l'app: une quête validée disparaît des quêtes actives.
    setActiveQuests((prev) => prev.filter((q) => q.id !== quest.id));

    try {
      await Promise.all([
        supabase.from('quests').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', quest.id),
        supabase.from('player_profiles').update({
          experience_points: nextXp,
          level: nextLevel,
          credits: player.credits + quest.reward_credits,
          total_quests_completed: (player.total_quests_completed || 0) + 1,
        }).eq('user_id', user.id),
      ]);
    } catch {
      Alert.alert('Erreur', 'Impossible de valider la quête pour le moment.');
    }
  };

  const handleGenerateQuests = async () => {
    setGenerating(true);
    try {
      if (activeQuests.length >= 12) {
        Alert.alert('Limite atteinte', 'Complète quelques quêtes avant d’en générer de nouvelles.');
        return;
      }

      const generated = await generateQuests(player.level, 'Utilisateur mobile actif');
      if (!generated.length) return;

      const knownTitles = new Set(activeQuests.map((q) => q.title.trim().toLowerCase()));
      const questsToInsert = generated
        .filter((q: any) => q?.title && !knownTitles.has(String(q.title).trim().toLowerCase()))
        .map((q: any) => ({
        user_id: user.id,
        title: q.title,
        description: q.description,
        reward_xp: q.reward_xp || 50,
        reward_credits: q.reward_credits || 20,
        target_value: q.target_value || 1,
        current_progress: 0,
        completed: false,
        quest_type: q.quest_type || 'daily',
        category: q.category || 'rpg',
      }));

      if (!questsToInsert.length) {
        Alert.alert('Info', 'Les nouvelles quêtes proposées existent déjà.');
        return;
      }

      const { data } = await supabase.from('quests').insert(questsToInsert).select();
      if (data) setActiveQuests((prev) => [...prev, ...data as any]);
    } catch {
      Alert.alert('Erreur', 'Génération impossible pour le moment.');
    } finally {
      setGenerating(false);
    }
  };

  const buyItem = async (item: ShopItem) => {
    if (processingPurchaseId) return;
    if (player.credits < item.price) {
      Alert.alert('Crédits insuffisants', 'Complète des quêtes pour gagner plus de crédits.');
      return;
    }

    setProcessingPurchaseId(item.id);
    try {
      await supabase.from('player_profiles').update({ credits: player.credits - item.price }).eq('user_id', user.id);

      if (item.metadata?.ai_credits) {
        await supabase.from('ai_credits').upsert({ user_id: user.id, credits: item.metadata.ai_credits, last_updated: new Date().toISOString() }, { onConflict: 'user_id' as any });
      }

      if (item.metadata?.powerup_type) {
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('active_powerups').insert({ user_id: user.id, powerup_type: item.metadata.powerup_type, multiplier: item.metadata.multiplier || 1.0, expires_at: expires });
      }

      if (item.metadata?.unlockable_type) {
        await supabase.from('unlockables').insert({ user_id: user.id, unlockable_type: item.metadata.unlockable_type, unlockable_id: item.metadata.unlockable_id });
      }

      Alert.alert('Achat réussi', `${item.title} ajouté à votre inventaire.`);
    } catch {
      Alert.alert('Achat local', `${item.title} enregistré localement, resynchronisation ultérieure.`);
    } finally {
      setProcessingPurchaseId(null);
    }
  };

  const renderQuestTab = () => (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>QUÊTES</Text>
        <TouchableOpacity style={[styles.generateBtn, { borderColor: colors.border }]} onPress={handleGenerateQuests} disabled={generating}>
          {generating ? <ActivityIndicator size="small" color={colors.text} /> : <RefreshCw size={14} color={colors.text} />}
          <Text style={[styles.generateText, { color: colors.text }]}>Rafraîchir</Text>
        </TouchableOpacity>
      </View>

      {activeQuests.map((quest) => (
        <TouchableOpacity key={quest.id} style={[styles.questCard, { backgroundColor: colors.cardBg, borderColor: quest.completed ? colors.border : '#3B82F6' }]} onPress={() => handleClaimQuest(quest)}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.questTitle, { color: colors.text }, quest.completed && { textDecorationLine: 'line-through', color: colors.textSub }]}>{quest.title}</Text>
            <Text style={{ color: colors.textSub, marginBottom: 8 }}>{quest.description}</Text>
            <Text style={{ color: '#93C5FD', fontWeight: '700' }}>+{quest.reward_xp} XP • +{quest.reward_credits} crédits</Text>
          </View>
          {quest.completed ? <CheckCircle2 size={24} color="#22C55E" /> : <Star size={20} color="#FACC15" fill="#FACC15" />}
        </TouchableOpacity>
      ))}

      {!activeQuests.length && (
        <View style={[styles.emptyState, { borderColor: colors.border }]}> 
          <Text style={{ color: colors.textSub }}>Aucune quête active.</Text>
        </View>
      )}
    </View>
  );

  const renderAchievements = () => {
    const unlockedCount = achievementCatalog.filter(a => unlockedAchievements.has(a.achievement_id)).length;
    const pct = Math.round((unlockedCount / Math.max(1, achievementCatalog.length)) * 100);
    return (
      <View style={{ gap: 12 }}>
        <View style={[styles.progressWrap, { backgroundColor: colors.cardBg, borderColor: colors.border }]}> 
          <Text style={[styles.progressTitle, { color: colors.text }]}>Achievements</Text>
          <Text style={{ color: colors.textSub }}>{unlockedCount} / {achievementCatalog.length} débloqués • {pct}%</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
        </View>
        {achievementCatalog.map((ach) => {
          const unlocked = unlockedAchievements.has(ach.achievement_id);
          return (
            <View key={ach.achievement_id} style={[styles.achievementCard, { backgroundColor: colors.cardBg, borderColor: unlocked ? '#3B82F6' : colors.border, opacity: unlocked ? 1 : 0.6 }]}>
              <Trophy size={20} color={unlocked ? '#FACC15' : colors.textSub} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.achTitle, { color: unlocked ? '#3B82F6' : colors.text }]}>{ach.title}</Text>
                <Text style={{ color: colors.textSub }}>{ach.description}</Text>
              </View>
              {unlocked && <CheckCircle2 size={18} color="#22C55E" />}
            </View>
          );
        })}
      </View>
    );
  };

  const filteredShop = SHOP_ITEMS.filter(i => i.category === shopCategory);

  const renderShop = () => (
    <View>
      <View style={styles.shopCategoryRow}>
        {[
          { id: 'boost', label: '⚡ Boosts' },
          { id: 'protection', label: '🛡️ Protection' },
          { id: 'box', label: '🎁 Coffres' },
          { id: 'cosmetic', label: '✨ Cosm.' },
        ].map((cat) => (
          <TouchableOpacity key={cat.id} style={[styles.shopCategoryBtn, shopCategory === cat.id && { backgroundColor: '#2A2A2A' }]} onPress={() => setShopCategory(cat.id as ShopCategory)}>
            <Text style={{ color: shopCategory === cat.id ? '#FFF' : '#AAA' }}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.shopGrid}>
        {filteredShop.map((item) => (
          <TouchableOpacity key={item.id} style={[styles.shopCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]} onPress={() => buyItem(item)}>
            <Text style={[styles.shopItemTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.shopItemDesc, { color: colors.textSub }]}>{item.description}</Text>
            <View style={styles.priceTag}><Coins size={12} color="#FACC15" fill="#FACC15" /><Text style={styles.priceText}>{item.price}</Text></View>
            <Text style={[styles.buyLabel, { color: '#FFF' }]}>{processingPurchaseId === item.id ? 'Achat...' : 'Acheter'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: noPadding ? 0 : insets.top }]}> 
      <View style={styles.header}>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center' }}>
          <View style={styles.rankBadge}><Crown size={14} color="#FFF" fill="#FFF" /><Text style={styles.rankTextHeader}>{rankName}</Text></View>
        </View>
        <TouchableOpacity onPress={openProfile}><View style={styles.headerAvatar}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>{user.display_name?.charAt(0) || 'U'}</Text></View></TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <AvatarGenerator config={player.avatar_customization} size={130} showGlow={true} />
        <Text style={[styles.levelTitle, { color: colors.text }]}>Niveau {player.level}</Text>
        <View style={styles.xpBarContainer}><View style={[styles.xpBarFill, { width: `${progressPercent}%`, backgroundColor: colors.accent }]} /></View>
        <Text style={styles.xpText}>{Math.floor(xpInCurrentLevel)} / {xpNeededForLevel} XP</Text>
      </View>

      <View style={styles.tabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
          {[{ id: 'QUESTS', label: 'Quêtes' }, { id: 'ACHIEVEMENTS', label: 'Succès' }, { id: 'SHOP', label: 'Boutique' }].map((tab) => (
            <TouchableOpacity key={tab.id} style={[styles.tabItem, activeTab === tab.id && { backgroundColor: colors.tabActive, borderColor: colors.text }]} onPress={() => setActiveTab(tab.id as TabId)}>
              <Text style={[styles.tabText, { color: activeTab === tab.id ? colors.text : colors.textSub }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'QUESTS' && renderQuestTab()}
        {activeTab === 'ACHIEVEMENTS' && renderAchievements()}
        {activeTab === 'SHOP' && renderShop()}
        <View style={{ height: 110 }} />
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
  levelTitle: { fontSize: 22, fontWeight: '800', marginVertical: 10 },
  xpBarContainer: { width: width * 0.6, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  xpBarFill: { height: '100%' },
  xpText: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
  tabs: { marginBottom: 20 },
  tabItem: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  generateText: { fontSize: 11, fontWeight: '700' },
  questCard: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  questTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptyState: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 20, alignItems: 'center' },
  progressWrap: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  progressTitle: { fontSize: 20, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#2A2A2A', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0EA5E9' },
  achievementCard: { flexDirection: 'row', gap: 10, alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12 },
  achTitle: { fontSize: 15, fontWeight: '700' },
  shopCategoryRow: { flexDirection: 'row', backgroundColor: '#1F1F1F', borderRadius: 12, padding: 4, marginBottom: 12 },
  shopCategoryBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shopCard: { width: '48%', borderRadius: 14, borderWidth: 1, padding: 12 },
  shopItemTitle: { fontWeight: '800', fontSize: 15, marginBottom: 6 },
  shopItemDesc: { fontSize: 12, marginBottom: 8 },
  priceTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  priceText: { color: '#FACC15', fontWeight: '800' },
  buyLabel: { backgroundColor: '#2563EB', textAlign: 'center', paddingVertical: 8, borderRadius: 10, fontWeight: '700' },
});

export default CyberKnight;
