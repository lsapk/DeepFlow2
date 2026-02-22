
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Switch, Alert, ActivityIndicator, LayoutAnimation, TextInput, Platform, BackHandler, Linking, Modal } from 'react-native';
import { UserProfile, PlayerProfile, UserSettings, AiPermissions, AvatarConfig, AvatarClass, AvatarHelmet, AvatarArmor, AvatarColor } from '../types';
import { LogOut, Bell, Sun, Moon, Volume2, Shield, CreditCard, ChevronRight, X, User, BarChart2, Star, Zap, Crown, Check, Edit2, Brain, FileText, Lock, MessageSquare, Trash2, Heart, CheckCircle, Clock, Mail, HelpCircle, Scale, RefreshCw, Target, Palette } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import AvatarGenerator from '../components/AvatarGenerator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInDown, SlideOutDown, FadeIn } from 'react-native-reanimated';

interface ProfileProps {
  user: UserProfile;
  player: PlayerProfile;
  logout: () => void;
  visible: boolean;
  onClose: () => void;
  onThemeChange?: (isDark: boolean) => void;
  onPlayerUpdate?: (player: PlayerProfile) => void;
}

const DEFAULT_AI_PERMISSIONS: AiPermissions = {
    tasks: true,
    habits: true,
    goals: true,
    journal: false,
    focus: true,
    profile: true
};

const APP_VERSION = "1.0.2 (Build 2024.1)";

const LEGAL_CONTENT = {
    FAQ: `
**Q: Mes données sont-elles privées ?**
R: Oui. Vos données sont stockées de manière sécurisée. L'IA n'analyse que ce que vous autorisez explicitement dans les réglages.

**Q: Comment fonctionne le système de niveau ?**
R: Vous gagnez de l'XP en complétant des tâches, des habitudes et des sessions de focus.

**Q: Puis-je utiliser l'application hors ligne ?**
R: Oui, DeepFlow fonctionne en "Offline First". Vos données se synchroniseront dès que vous retrouverez une connexion.

**Q: L'application est-elle gratuite ?**
R: Les fonctionnalités de base sont gratuites. Certaines fonctionnalités IA avancées peuvent nécessiter des crédits.
    `,
    PRIVACY: `
**Politique de Confidentialité**

1. **Collecte des données**
Nous collectons uniquement les données nécessaires au fonctionnement de l'application (email, tâches, habitudes).

2. **Utilisation de l'IA**
Les données envoyées à l'IA (Google Gemini) sont anonymisées autant que possible et ne sont utilisées que pour vous fournir des conseils personnalisés. Vous pouvez révoquer ces accès à tout moment.

3. **Sécurité**
Vos données sont chiffrées et stockées via Supabase (PostgreSQL) avec des règles de sécurité strictes (RLS).

4. **Vos droits (RGPD)**
Vous avez le droit d'accès, de rectification et de suppression de vos données. Utilisez le bouton "Supprimer mon compte" dans la zone de danger pour effacer toutes vos traces.
    `,
    TERMS: `
**Conditions Générales d'Utilisation (CGU)**

L'utilisation de DeepFlow implique l'acceptation pleine et entière des présentes conditions.

1. **Usage personnel**
L'application est destinée à un usage personnel pour la productivité et le développement personnel.

2. **Responsabilité**
DeepFlow fournit des conseils via une IA. Ces conseils ne remplacent en aucun cas un avis médical ou psychologique professionnel.

3. **Propriété intellectuelle**
Le design, le code et les éléments graphiques "Cyber Knight" sont la propriété exclusive de DeepFlow.
    `,
    LEGAL: `
**Mentions Légales**

**Éditeur :**
DeepFlow Inc. (Développement Personnel)
Contact : deepflow.ia@gmail.com

**Hébergement :**
Supabase Inc. / Google Cloud Platform

**Directeur de la publication :**
L'équipe DeepFlow.
    `
};

const AVATAR_CLASSES: AvatarClass[] = ['cyber_knight', 'neon_hacker', 'quantum_warrior', 'shadow_ninja', 'cosmic_sage'];
const AVATAR_HELMETS: AvatarHelmet[] = ['standard', 'visor', 'crown', 'halo'];
const AVATAR_ARMORS: AvatarArmor[] = ['standard', 'heavy', 'stealth', 'energy'];
const AVATAR_COLORS: AvatarColor[] = ['#C4B5FD', '#34D399', '#F472B6', '#60A5FA', '#FACC15', '#F87171', '#A78BFA'];

const Profile: React.FC<ProfileProps> = ({ user, player, logout, visible, onClose, onThemeChange, onPlayerUpdate }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SETTINGS' | 'STATS'>('PROFILE');
  const [settings, setSettings] = useState<UserSettings>({
      id: user.id,
      theme: 'dark',
      language: 'fr',
      notifications_enabled: true,
      sound_enabled: true,
      focus_mode: false,
      clock_format: '24h',
      unlocked_features: { ai_permissions: DEFAULT_AI_PERMISSIONS }
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.display_name || '');
  const [editBio, setEditBio] = useState(user.bio || '');

  // Avatar Edit State
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(player.avatar_customization || {
      class: 'cyber_knight',
      helmet: 'standard',
      armor: 'standard',
      color: '#C4B5FD'
  });

  // Legal Modal State
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalTitle, setLegalTitle] = useState('');
  const [legalBody, setLegalBody] = useState('');

  const [stats, setStats] = useState({
      tasksCompleted: 0,
      habitsStreak: 0,
      goalsAchieved: 0,
      focusMinutes: 0
  });

  // Handle Android Back Button
  useEffect(() => {
      const backAction = () => {
          if (visible) {
              if (legalModalVisible) {
                  setLegalModalVisible(false);
              } else {
                  onClose();
              }
              return true;
          }
          return false;
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
      return () => backHandler.remove();
  }, [visible, legalModalVisible]);

  useEffect(() => {
      if (visible) {
          fetchSettings();
          fetchStats();
      }
  }, [visible]);


  useEffect(() => {
      if (visible) {
          setAvatarConfig(player.avatar_customization || {
              class: 'cyber_knight',
              helmet: 'standard',
              armor: 'standard',
              color: '#C4B5FD'
          });
      }
  }, [player.avatar_customization, visible]);

  const fetchSettings = async () => {
      setLoading(true);
      const { data } = await supabase.from('user_settings').select('*').eq('id', user.id).single();
      if (data) {
          const permissions = data.unlocked_features?.ai_permissions || DEFAULT_AI_PERMISSIONS;
          // Ensure all keys exist (migration fallback)
          const mergedPermissions = { ...DEFAULT_AI_PERMISSIONS, ...permissions };
          
          setSettings({
              ...data,
              unlocked_features: { ...data.unlocked_features, ai_permissions: mergedPermissions }
          });
      } else {
          const defaultSettings = { 
              id: user.id, 
              theme: 'dark', 
              language: 'fr', 
              notifications_enabled: true,
              sound_enabled: true,
              focus_mode: false,
              clock_format: '24h',
              unlocked_features: { ai_permissions: DEFAULT_AI_PERMISSIONS }
          };
          await supabase.from('user_settings').upsert(defaultSettings);
          setSettings(defaultSettings);
      }
      setLoading(false);
  };

  const saveAvatar = async () => {
      setLoading(true);
      const { data, error } = await supabase
          .from('player_profiles')
          .update({ avatar_customization: avatarConfig })
          .eq('user_id', user.id)
          .select('*')
          .single();

      if (error) {
          Alert.alert("Erreur", "Impossible de sauvegarder l'avatar.");
      } else if (data) {
          onPlayerUpdate?.(data as PlayerProfile);
          setIsEditingAvatar(false);
      }
      setLoading(false);
  };

  const fetchStats = async () => {
      const [tRes, hRes, gRes, fRes] = await Promise.all([
          supabase.from('tasks').select('id', { count: 'exact' }).eq('user_id', user.id).eq('completed', true),
          supabase.from('habits').select('streak').eq('user_id', user.id),
          supabase.from('goals').select('id', { count: 'exact' }).eq('user_id', user.id).eq('completed', true),
          supabase.from('focus_sessions').select('duration').eq('user_id', user.id)
      ]);

      const maxStreak = hRes.data ? Math.max(0, ...hRes.data.map(h => h.streak)) : 0;
      const totalFocus = fRes.data ? fRes.data.reduce((acc, curr) => acc + curr.duration, 0) : 0;

      setStats({
          tasksCompleted: tRes.count || 0,
          habitsStreak: maxStreak,
          goalsAchieved: gRes.count || 0,
          focusMinutes: totalFocus
      });
  };

  const updateSetting = async (key: keyof UserSettings, value: any) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings); 
      if (key === 'theme' && onThemeChange) onThemeChange(value === 'dark');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const { error } = await supabase.from('user_settings').update({ [key]: value }).eq('id', user.id);
      if (error) {
          Alert.alert("Erreur", "Impossible de sauvegarder le réglage.");
      }
  };

  const updateAiPermission = async (key: keyof AiPermissions, value: boolean) => {
      const currentPermissions = settings.unlocked_features?.ai_permissions || DEFAULT_AI_PERMISSIONS;
      const newPermissions = { ...currentPermissions, [key]: value };
      const newFeatures = { ...settings.unlocked_features, ai_permissions: newPermissions };
      setSettings({ ...settings, unlocked_features: newFeatures });
      await supabase.from('user_settings').update({ unlocked_features: newFeatures }).eq('id', user.id);
  };

  const saveProfile = async () => {
      setLoading(true);
      const { error } = await supabase.from('user_profiles').update({
          display_name: editName,
          bio: editBio
      }).eq('id', user.id);

      if (error) Alert.alert("Erreur", "Impossible de mettre à jour le profil.");
      else {
          user.display_name = editName; 
          user.bio = editBio;
          setIsEditing(false);
      }
      setLoading(false);
  };

  const switchTab = (tab: any) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveTab(tab);
  };

  const openLegal = (title: string, body: string) => {
      setLegalTitle(title);
      setLegalBody(body);
      setLegalModalVisible(true);
  };

  const contactSupport = () => {
      Linking.openURL('mailto:deepflow.ia@gmail.com?subject=Support DeepFlow');
  };

  const renderProfileTab = () => (
      <View style={styles.tabContent}>
          <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                  <AvatarGenerator config={player.avatar_customization} size={120} />
                  <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>{player.level}</Text>
                  </View>
              </View>
              {isEditing ? (
                  <View style={{width: '100%', alignItems: 'center', marginBottom: 10}}>
                      <TextInput style={[styles.editInput, {fontSize: 20, fontWeight: '700', textAlign: 'center'}]} value={editName} onChangeText={setEditName} placeholder="Nom" placeholderTextColor="#666" />
                      <TextInput style={[styles.editInput, {fontSize: 14, textAlign: 'center', marginTop: 8, minWidth: 200}]} value={editBio} onChangeText={setEditBio} placeholder="Bio..." placeholderTextColor="#666" />
                      <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                          <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelBtn}><X size={20} color="#FFF" /></TouchableOpacity>
                          <TouchableOpacity onPress={saveProfile} style={styles.confirmBtn}><Check size={20} color="#FFF" /></TouchableOpacity>
                      </View>
                  </View>
              ) : (
                  <>
                    <Text style={styles.name}>{user.display_name}</Text>
                    <Text style={styles.email}>{user.email}</Text>
                    {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
                    <Text style={styles.rankText}>{player.avatar_type.toUpperCase()}</Text>
                  </>
              )}
          </View>
          <View style={styles.xpCard}>
              <View style={styles.xpRow}>
                  <Text style={styles.xpLabel}>Progression XP</Text>
                  <Text style={styles.xpValue}>{player.experience_points} / {player.level * 100 * player.level}</Text>
              </View>
              <View style={styles.xpBarBg}><View style={[styles.xpBarFill, { width: `${(player.experience_points % 1000) / 10}%` }]} /></View>
          </View>
          {!isEditing && (
              <View style={{gap: 12}}>
                  <TouchableOpacity style={styles.editProfileBtn} onPress={() => setIsEditing(true)}>
                      <Edit2 size={16} color="#FFF" style={{marginRight: 8}} />
                      <Text style={styles.editProfileText}>Modifier le profil</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.editProfileBtn, {backgroundColor: '#2D1B0E', borderColor: '#451a03', borderWidth: 1}]} onPress={() => setIsEditingAvatar(true)}>
                      <Palette size={16} color="#FACC15" style={{marginRight: 8}} />
                      <Text style={[styles.editProfileText, {color: '#FACC15'}]}>Personnaliser l'Avatar</Text>
                  </TouchableOpacity>
              </View>
          )}
      </View>
  );

  const renderSettingsTab = () => {
      const permissions = settings.unlocked_features?.ai_permissions || DEFAULT_AI_PERMISSIONS;
      return (
      <View style={styles.tabContent}>
          <View style={styles.section}>
              <Text style={styles.sectionHeader}>INTELLIGENCE ARTIFICIELLE</Text>
              <Text style={styles.sectionSubHeader}>Contrôlez quelles données DeepFlow AI peut analyser pour vous coacher.</Text>
              <View style={styles.card}>
                  <SettingItem icon={Brain} label="Journal & Émotions" iconColor="#8B5CF6" isSwitch value={permissions.journal} onToggle={(val: boolean) => updateAiPermission('journal', val)} />
                  <View style={styles.separator} />
                  <SettingItem icon={Check} label="Tâches & Projets" iconColor="#10B981" isSwitch value={permissions.tasks} onToggle={(val: boolean) => updateAiPermission('tasks', val)} />
                  <View style={styles.separator} />
                  <SettingItem icon={RefreshCw} label="Habitudes & Routines" iconColor="#F59E0B" isSwitch value={permissions.habits} onToggle={(val: boolean) => updateAiPermission('habits', val)} />
                  <View style={styles.separator} />
                  <SettingItem icon={Target} label="Objectifs & Ambitions" iconColor="#EF4444" isSwitch value={permissions.goals} onToggle={(val: boolean) => updateAiPermission('goals', val)} />
                  <View style={styles.separator} />
                  <SettingItem icon={Zap} label="Sessions Focus" iconColor="#3B82F6" isSwitch value={permissions.focus} onToggle={(val: boolean) => updateAiPermission('focus', val)} />
                  <View style={styles.separator} />
                  <SettingItem icon={User} label="Profil & Niveau" iconColor="#6366F1" isSwitch value={permissions.profile} onToggle={(val: boolean) => updateAiPermission('profile', val)} />
              </View>
          </View>

          <View style={styles.section}>
              <Text style={styles.sectionHeader}>APPARENCE</Text>
              <View style={styles.card}>
                  <SettingItem icon={settings.theme === 'dark' ? Moon : Sun} label="Mode Sombre" iconColor="#5856D6" isSwitch value={settings.theme === 'dark'} onToggle={(val: boolean) => updateSetting('theme', val ? 'dark' : 'light')} />
              </View>
          </View>

          <View style={styles.section}>
              <Text style={styles.sectionHeader}>SUPPORT & LÉGAL</Text>
              <View style={styles.card}>
                  <SettingItem icon={Mail} label="Contacter le Support" iconColor="#EC4899" onPress={contactSupport} />
                  <View style={styles.separator} />
                  <SettingItem icon={HelpCircle} label="FAQ" iconColor="#14B8A6" onPress={() => openLegal('Foire Aux Questions', LEGAL_CONTENT.FAQ)} />
                  <View style={styles.separator} />
                  <SettingItem icon={Lock} label="Politique de Confidentialité" iconColor="#64748B" onPress={() => openLegal('Confidentialité', LEGAL_CONTENT.PRIVACY)} />
                  <View style={styles.separator} />
                  <SettingItem icon={FileText} label="Conditions d'Utilisation (CGU)" iconColor="#64748B" onPress={() => openLegal('Conditions Générales', LEGAL_CONTENT.TERMS)} />
                  <View style={styles.separator} />
                  <SettingItem icon={Scale} label="Mentions Légales" iconColor="#64748B" onPress={() => openLegal('Mentions Légales', LEGAL_CONTENT.LEGAL)} />
              </View>
          </View>

          <View style={styles.section}>
              <Text style={styles.sectionHeader}>ZONE DE DANGER</Text>
              <View style={styles.card}>
                  <TouchableOpacity style={styles.item} onPress={() => Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [{text: "Annuler"}, {text: "Oui", style: 'destructive', onPress: logout}])}>
                        <View style={styles.itemLeft}><View style={[styles.iconBox, { backgroundColor: '#F59E0B' }]}><LogOut size={18} color="white" /></View><Text style={[styles.label, {color: '#F59E0B'}]}>Se déconnecter</Text></View>
                  </TouchableOpacity>
                  <View style={styles.separator} />
                  <TouchableOpacity style={styles.item} onPress={() => { Alert.alert("Attention", "Cette action est irréversible. Vos données seront effacées.", [{text: "Annuler"}, {text: "Supprimer", style: 'destructive', onPress: () => Alert.alert("Confirmation", "Contactez le support pour finaliser la suppression.")}]) }}>
                        <View style={styles.itemLeft}><View style={[styles.iconBox, { backgroundColor: '#EF4444' }]}><Trash2 size={18} color="white" /></View><Text style={[styles.label, {color: '#EF4444'}]}>Supprimer mon compte</Text></View>
                  </TouchableOpacity>
              </View>
          </View>
          
          <View style={styles.footer}>
              <Text style={styles.version}>DeepFlow {APP_VERSION}</Text>
              <Text style={styles.copyright}>© 2024 DeepFlow Inc.</Text>
          </View>
      </View>
  )};

  const renderStatsTab = () => (
      <View style={styles.tabContent}>
          <View style={styles.statsGrid}>
              <StatCard label="Tâches" value={stats.tasksCompleted} icon={CheckCircle} color="#34C759" />
              <StatCard label="Streak" value={stats.habitsStreak} icon={Zap} color="#FF9500" />
              <StatCard label="Objectifs" value={stats.goalsAchieved} icon={Star} color="#FACC15" />
              <StatCard label="Focus (h)" value={Math.round(stats.focusMinutes / 60)} icon={Clock} color="#5856D6" />
          </View>
      </View>
  );

  if (!visible) return null;

  return (
    <Animated.View 
        entering={SlideInDown.duration(300)}
        exiting={SlideOutDown.duration(300)}
        style={styles.overlay}
    >
        <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? 20 : insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Mon Espace</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Text style={styles.closeText}>Fermer</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabBar}>
                {(['PROFILE', 'SETTINGS', 'STATS'] as const).map(tab => (
                    <TouchableOpacity 
                        key={tab} 
                        style={[styles.tabItem, activeTab === tab && styles.activeTabItem]} 
                        onPress={() => switchTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab === 'PROFILE' ? 'Profil' : tab === 'SETTINGS' ? 'Réglages' : 'Stats'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFF" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {activeTab === 'PROFILE' && renderProfileTab()}
                    {activeTab === 'SETTINGS' && renderSettingsTab()}
                    {activeTab === 'STATS' && renderStatsTab()}
                </ScrollView>
            )}
        </View>

        {/* AVATAR EDIT MODAL */}
        <Modal visible={isEditingAvatar} transparent animationType="slide">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, {height: '80%', backgroundColor: '#1C1C1E'}]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Personnalisation</Text>
                        <TouchableOpacity onPress={() => setIsEditingAvatar(false)}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={{alignItems: 'center', marginVertical: 20}}>
                            <AvatarGenerator config={avatarConfig} size={150} />
                        </View>

                        <Text style={styles.inputLabel}>CLASSE</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
                            {AVATAR_CLASSES.map(c => (
                                <TouchableOpacity key={c} style={[styles.choiceBtn, avatarConfig.class === c && styles.choiceBtnActive]} onPress={() => setAvatarConfig({...avatarConfig, class: c})}>
                                    <Text style={[styles.choiceText, avatarConfig.class === c && styles.choiceTextActive]}>{c.replace('_', ' ')}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.inputLabel}>CASQUE</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
                            {AVATAR_HELMETS.map(h => (
                                <TouchableOpacity key={h} style={[styles.choiceBtn, avatarConfig.helmet === h && styles.choiceBtnActive]} onPress={() => setAvatarConfig({...avatarConfig, helmet: h})}>
                                    <Text style={[styles.choiceText, avatarConfig.helmet === h && styles.choiceTextActive]}>{h}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.inputLabel}>ARMURE</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
                            {AVATAR_ARMORS.map(a => (
                                <TouchableOpacity key={a} style={[styles.choiceBtn, avatarConfig.armor === a && styles.choiceBtnActive]} onPress={() => setAvatarConfig({...avatarConfig, armor: a})}>
                                    <Text style={[styles.choiceText, avatarConfig.armor === a && styles.choiceTextActive]}>{a}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.inputLabel}>COULEUR D'ÉNERGIE</Text>
                        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30}}>
                            {AVATAR_COLORS.map(c => (
                                <TouchableOpacity key={c} style={[styles.colorCircle, {backgroundColor: c}, avatarConfig.color === c && {borderWidth: 3, borderColor: '#FFF'}]} onPress={() => setAvatarConfig({...avatarConfig, color: c})} />
                            ))}
                        </View>

                        <TouchableOpacity style={styles.saveMainBtn} onPress={saveAvatar} disabled={loading}>
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveMainBtnText}>Enregistrer</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>

        {/* LEGAL MODAL */}
        <Modal visible={legalModalVisible} transparent animationType="slide" onRequestClose={() => setLegalModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, {paddingBottom: insets.bottom + 20}]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{legalTitle}</Text>
                        <TouchableOpacity onPress={() => setLegalModalVisible(false)} style={styles.modalCloseBtn}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{padding: 20}}>
                        <Text style={styles.legalText}>{legalBody}</Text>
                    </ScrollView>
                </View>
            </View>
        </Modal>

    </Animated.View>
  );
};

const SettingItem = ({ icon: Icon, label, isSwitch, value, onToggle, iconColor, onPress }: any) => (
    <TouchableOpacity style={styles.item} activeOpacity={isSwitch ? 1 : 0.7} onPress={onPress} accessibilityRole={isSwitch ? 'switch' : 'button'}>
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

const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <View style={styles.statCard}>
        <Icon size={24} color={color} style={{marginBottom: 8}} />
        <Text style={styles.statCardValue}>{value}</Text>
        <Text style={styles.statCardLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#000', 
  },
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  }, 
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, marginTop: 10 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#FFF' },
  closeBtn: {},
  closeText: { color: '#007AFF', fontSize: 17, fontWeight: '600' },
  
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#262626' },
  tabItem: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabItem: { borderBottomColor: '#FFF' },
  tabText: { color: '#888', fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#FFF' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 60, paddingHorizontal: 20 },
  tabContent: { gap: 24 },

  // Profile Tab
  profileHeader: { alignItems: 'center', marginBottom: 10 },
  avatarContainer: { marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#1C1C1E' },
  levelBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#007AFF', width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  levelBadgeText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  name: { fontSize: 22, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  email: { fontSize: 14, color: '#888', marginBottom: 8 },
  bio: { fontSize: 14, color: '#CCC', marginBottom: 8, textAlign: 'center', paddingHorizontal: 20, fontStyle: 'italic' },
  rankText: { fontSize: 12, fontWeight: '700', color: '#C4B5FD', letterSpacing: 1 },
  
  editInput: { backgroundColor: '#1C1C1E', color: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  cancelBtn: { backgroundColor: '#333', padding: 10, borderRadius: 20 },
  confirmBtn: { backgroundColor: '#34C759', padding: 10, borderRadius: 20 },

  xpCard: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 16 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  xpLabel: { color: '#888', fontSize: 12, fontWeight: '600' },
  xpValue: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  xpBarBg: { height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: '#007AFF' },

  editProfileBtn: { backgroundColor: '#1C1C1E', paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  editProfileText: { color: '#FFF', fontWeight: '600' },

  // Settings Tab
  section: { marginBottom: 10 },
  sectionHeader: { fontSize: 12, color: '#888', marginBottom: 4, marginLeft: 4, fontWeight: '700', textTransform: 'uppercase' },
  sectionSubHeader: { fontSize: 12, color: '#555', marginBottom: 12, marginLeft: 4 },
  card: { backgroundColor: '#1C1C1E', borderRadius: 14, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, minHeight: 56 },
  separator: { height: 1, backgroundColor: '#262626', marginLeft: 56 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, color: '#FFF', fontWeight: '500' },

  footer: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
  version: { color: '#444', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  copyright: { color: '#333', fontSize: 10 },

  // Legal Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%' },
  modalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#222', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  modalCloseBtn: { padding: 4 },
  legalText: { color: '#DDD', fontSize: 15, lineHeight: 24 },

  // Stats Tab
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', backgroundColor: '#1C1C1E', padding: 16, borderRadius: 16, alignItems: 'center' },
  statCardValue: { color: '#FFF', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statCardLabel: { color: '#888', fontSize: 12, fontWeight: '600' },

  inputLabel: { fontSize: 12, color: '#888', fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  choiceBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#333', marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  choiceBtnActive: { backgroundColor: '#007AFF', borderColor: '#FFF' },
  choiceText: { color: '#888', fontWeight: '600', textTransform: 'capitalize' },
  choiceTextActive: { color: '#FFF' },
  colorCircle: { width: 40, height: 40, borderRadius: 20 },
  saveMainBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 40 },
  saveMainBtnText: { color: '#FFF', fontWeight: '700', fontSize: 17 },
});

export default Profile;
