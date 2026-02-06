import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Switch, Modal, Alert, ActivityIndicator, LayoutAnimation, TextInput, Linking, Platform } from 'react-native';
import { UserProfile, PlayerProfile, UserSettings, AiPermissions } from '../types';
import { LogOut, Bell, Sun, Moon, Volume2, Shield, CreditCard, ChevronRight, X, User, BarChart2, Star, Zap, Crown, Check, Edit2, Brain, FileText, Lock, MessageSquare, Trash2, Heart } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface ProfileProps {
  user: UserProfile;
  player: PlayerProfile;
  logout: () => void;
  visible: boolean;
  onClose: () => void;
  onThemeChange?: (isDark: boolean) => void;
}

const DEFAULT_AI_PERMISSIONS: AiPermissions = {
    tasks: true,
    habits: true,
    goals: true,
    journal: false,
    focus: true,
    profile: true
};

// Contenu légal générique (à adapter si besoin)
const LEGAL_DOCS = {
    TERMS: `CONDITIONS GÉNÉRALES D'UTILISATION (CGU)

1. OBJET
Les présentes CGU régissent l'utilisation de l'application DeepFlow. En utilisant l'app, vous acceptez ces conditions sans réserve.

2. COMPTE UTILISATEUR
L'accès nécessite la création d'un compte. Vous êtes responsable de la confidentialité de vos identifiants.

3. PROPRIÉTÉ INTELLECTUELLE
Tous les éléments (code, design, gamification) sont la propriété exclusive de DeepFlow. Toute reproduction est interdite.

4. RESPONSABILITÉ
DeepFlow est un outil de productivité. Nous ne garantissons pas l'atteinte de vos objectifs personnels et ne sommes pas responsables en cas de perte de données, bien que nous fassions tout pour les sécuriser.

5. MODIFICATIONS
Nous nous réservons le droit de modifier ces termes à tout moment. L'utilisation continue de l'application vaut acceptation.`,
    
    PRIVACY: `POLITIQUE DE CONFIDENTIALITÉ

1. DONNÉES COLLECTÉES
Nous collectons : Email, Nom d'affichage, Photo (via OAuth), et les données que vous saisissez (Tâches, Habitudes, Journal).

2. UTILISATION DES DONNÉES
Ces données servent uniquement au fonctionnement de l'application, à la synchronisation sur vos appareils et aux fonctionnalités d'IA (si activées).

3. INTELLIGENCE ARTIFICIELLE
Si vous activez les fonctions IA, certaines données (texte des tâches, journal) sont traitées par l'API Gemini de Google de manière anonymisée pour générer des conseils.

4. SÉCURITÉ
Vos données sont stockées sur des serveurs sécurisés (Supabase).

5. SUPPRESSION
Vous pouvez supprimer votre compte et toutes vos données définitivement via la "Zone de Danger" dans les paramètres de cette application.`
};

const Profile: React.FC<ProfileProps> = ({ user, player, logout, visible, onClose, onThemeChange }) => {
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
  
  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.display_name || '');
  const [editBio, setEditBio] = useState(user.bio || '');

  // Legal Modal State
  const [legalModal, setLegalModal] = useState<{visible: boolean, title: string, content: string}>({
      visible: false, title: '', content: ''
  });

  // Delete Confirm Modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Stats Data
  const [stats, setStats] = useState({
      tasksCompleted: 0,
      habitsStreak: 0,
      goalsAchieved: 0,
      focusMinutes: 0
  });

  useEffect(() => {
      if (visible) {
          fetchSettings();
          fetchStats();
      }
  }, [visible]);

  const fetchSettings = async () => {
      setLoading(true);
      const { data } = await supabase.from('user_settings').select('*').eq('id', user.id).single();
      if (data) {
          // Merge defaults for new fields if not present
          const permissions = data.unlocked_features?.ai_permissions || DEFAULT_AI_PERMISSIONS;
          setSettings({
              ...data,
              unlocked_features: { ...data.unlocked_features, ai_permissions: permissions }
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
      
      if (key === 'theme' && onThemeChange) {
          onThemeChange(value === 'dark');
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const { error } = await supabase.from('user_settings').update({ [key]: value }).eq('id', user.id);
      if (error) {
          setSettings(settings); // Revert
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

      if (error) {
          Alert.alert("Erreur", "Impossible de mettre à jour le profil.");
      } else {
          user.display_name = editName; 
          user.bio = editBio;
          setIsEditing(false);
      }
      setLoading(false);
  };

  const executeDeleteAccount = async () => {
        if (deleteConfirmationText !== "SUPPRIMER") {
            Alert.alert("Erreur", "Vous devez taper 'SUPPRIMER' en majuscules pour confirmer.");
            return;
        }

        setDeleteModalVisible(false);
        setLoading(true);
        try {
            // Suppression manuelle des données en cascade
            await Promise.all([
                supabase.from('tasks').delete().eq('user_id', user.id),
                supabase.from('habits').delete().eq('user_id', user.id),
                supabase.from('goals').delete().eq('user_id', user.id),
                supabase.from('journal_entries').delete().eq('user_id', user.id),
                supabase.from('daily_reflections').delete().eq('user_id', user.id),
                supabase.from('focus_sessions').delete().eq('user_id', user.id),
                supabase.from('user_settings').delete().eq('id', user.id),
                supabase.from('player_profiles').delete().eq('user_id', user.id),
                supabase.from('user_profiles').delete().eq('id', user.id)
            ]);
            
            // Déconnexion finale
            logout();
        } catch (e) {
            Alert.alert("Erreur", "Une erreur est survenue lors de la suppression. Veuillez contacter le support.");
        } finally {
            setLoading(false);
        }
  };

  const handleRateApp = () => {
      const androidPackageName = 'com.deepflow.app'; 
      const itunesItemId = '0000000000'; 

      if (Platform.OS === 'android') {
          Linking.openURL(`market://details?id=${androidPackageName}`);
      } else {
          Linking.openURL(`https://apps.apple.com/app/id${itunesItemId}?action=write-review`);
      }
  };

  const openLegalDoc = (type: 'TERMS' | 'PRIVACY') => {
      setLegalModal({
          visible: true,
          title: type === 'TERMS' ? "Conditions d'utilisation" : "Politique de Confidentialité",
          content: type === 'TERMS' ? LEGAL_DOCS.TERMS : LEGAL_DOCS.PRIVACY
      });
  };

  const switchTab = (tab: any) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveTab(tab);
  };

  const openUrl = (url: string) => {
      Linking.openURL(url).catch(err => Alert.alert("Erreur", "Impossible d'ouvrir le lien"));
  };

  const renderProfileTab = () => (
      <View style={styles.tabContent}>
          <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                  <Image source={{ uri: user.photo_url || "https://via.placeholder.com/150" }} style={styles.avatar} />
                  <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>{player.level}</Text>
                  </View>
              </View>
              
              {isEditing ? (
                  <View style={{width: '100%', alignItems: 'center', marginBottom: 10}}>
                      <TextInput 
                          style={[styles.editInput, {fontSize: 20, fontWeight: '700', textAlign: 'center'}]}
                          value={editName}
                          onChangeText={setEditName}
                          placeholder="Nom d'affichage"
                          placeholderTextColor="#666"
                      />
                      <TextInput 
                          style={[styles.editInput, {fontSize: 14, textAlign: 'center', marginTop: 8, minWidth: 200}]}
                          value={editBio}
                          onChangeText={setEditBio}
                          placeholder="Votre bio..."
                          placeholderTextColor="#666"
                      />
                      <View style={{flexDirection: 'row', gap: 10, marginTop: 10}}>
                          <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelBtn}>
                              <X size={20} color="#FFF" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={saveProfile} style={styles.confirmBtn}>
                              <Check size={20} color="#FFF" />
                          </TouchableOpacity>
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
              <View style={styles.xpBarBg}>
                  <View style={[styles.xpBarFill, { width: `${(player.experience_points % 1000) / 10}%` }]} />
              </View>
          </View>

          <LinearGradient
              colors={['#4F46E5', '#9333EA']}
              start={{x:0, y:0}} end={{x:1, y:1}}
              style={styles.premiumCard}
          >
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <View>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                          <Crown size={20} color="#FACC15" fill="#FACC15" />
                          <Text style={styles.premiumTitle}>DeepFlow Premium</Text>
                      </View>
                      <Text style={styles.premiumDesc}>IA illimitée & stats avancées</Text>
                  </View>
                  <TouchableOpacity style={styles.upgradeBtn}>
                      <Text style={styles.upgradeText}>UPGRADE</Text>
                  </TouchableOpacity>
              </View>
          </LinearGradient>

          {!isEditing && (
              <TouchableOpacity style={styles.editProfileBtn} onPress={() => setIsEditing(true)}>
                  <Edit2 size={16} color="#FFF" style={{marginRight: 8}} />
                  <Text style={styles.editProfileText}>Modifier le profil</Text>
              </TouchableOpacity>
          )}
      </View>
  );

  const renderSettingsTab = () => {
      const permissions = settings.unlocked_features?.ai_permissions || DEFAULT_AI_PERMISSIONS;
      
      return (
      <View style={styles.tabContent}>
          <View style={styles.section}>
              <Text style={styles.sectionHeader}>INTELLIGENCE ARTIFICIELLE</Text>
              <Text style={styles.sectionSubHeader}>Choisissez quelles données sont partagées avec le coach IA.</Text>
              <View style={styles.card}>
                  <SettingItem icon={Brain} label="Accès au Journal" iconColor="#8B5CF6" isSwitch value={permissions.journal} onToggle={(val: boolean) => updateAiPermission('journal', val)} />
                  <View style={styles.separator} />
                  <SettingItem icon={Zap} label="Accès Historique Focus" iconColor="#F59E0B" isSwitch value={permissions.focus} onToggle={(val: boolean) => updateAiPermission('focus', val)} />
                  <View style={styles.separator} />
                  <SettingItem icon={User} label="Accès Profil" iconColor="#3B82F6" isSwitch value={permissions.profile} onToggle={(val: boolean) => updateAiPermission('profile', val)} />
                  <View style={styles.separator} />
                  <SettingItem icon={Check} label="Accès Tâches & Habitudes" iconColor="#10B981" isSwitch value={permissions.tasks} onToggle={(val: boolean) => { updateAiPermission('tasks', val); updateAiPermission('habits', val); }} />
              </View>
          </View>

          <View style={styles.section}>
              <Text style={styles.sectionHeader}>APPARENCE</Text>
              <View style={styles.card}>
                  <SettingItem icon={settings.theme === 'dark' ? Moon : Sun} label="Mode Sombre" iconColor="#5856D6" isSwitch value={settings.theme === 'dark'} onToggle={(val: boolean) => updateSetting('theme', val ? 'dark' : 'light')} />
              </View>
          </View>

          <View style={styles.section}>
              <Text style={styles.sectionHeader}>NOTIFICATIONS & SONS</Text>
              <View style={styles.card}>
                  <SettingItem icon={Bell} label="Push Notifications" iconColor="#EF4444" isSwitch value={settings.notifications_enabled} onToggle={(val: boolean) => updateSetting('notifications_enabled', val)} />
                  <View style={styles.separator} />
                  <SettingItem icon={Volume2} label="Effets Sonores" iconColor="#F59E0B" isSwitch value={settings.sound_enabled} onToggle={(val: boolean) => updateSetting('sound_enabled', val)} />
              </View>
          </View>

          <View style={styles.section}>
              <Text style={styles.sectionHeader}>SUPPORT & LÉGAL</Text>
              <View style={styles.card}>
                  <SettingItem icon={MessageSquare} label="Contacter le support" iconColor="#007AFF" onPress={() => openUrl('mailto:deepflow.ia@gmail.com')} />
                  <View style={styles.separator} />
                  <SettingItem icon={Heart} label="Noter l'application" iconColor="#FF2D55" onPress={handleRateApp} />
                  <View style={styles.separator} />
                  <SettingItem icon={FileText} label="Conditions d'utilisation" iconColor="#9CA3AF" onPress={() => openLegalDoc('TERMS')} />
                  <View style={styles.separator} />
                  <SettingItem icon={Lock} label="Politique de Confidentialité" iconColor="#9CA3AF" onPress={() => openLegalDoc('PRIVACY')} />
              </View>
          </View>

          <View style={styles.section}>
              <Text style={styles.sectionHeader}>ZONE DE DANGER</Text>
              <View style={styles.card}>
                  <TouchableOpacity style={styles.item} onPress={() => Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [{text: "Annuler"}, {text: "Oui", style: 'destructive', onPress: logout}])}>
                        <View style={styles.itemLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#F59E0B' }]}>
                                <LogOut size={18} color="white" />
                            </View>
                            <Text style={[styles.label, {color: '#F59E0B'}]}>Se déconnecter</Text>
                        </View>
                  </TouchableOpacity>
                  <View style={styles.separator} />
                  <TouchableOpacity style={styles.item} onPress={() => { setDeleteConfirmationText(''); setDeleteModalVisible(true); }}>
                        <View style={styles.itemLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#EF4444' }]}>
                                <Trash2 size={18} color="white" />
                            </View>
                            <Text style={[styles.label, {color: '#EF4444'}]}>Supprimer mon compte</Text>
                        </View>
                  </TouchableOpacity>
              </View>
              <Text style={styles.versionText}>DeepFlow v1.0.2 - Build 2024</Text>
          </View>
      </View>
  )};

  const renderStatsTab = () => (
      <View style={styles.tabContent}>
          <View style={styles.statsGrid}>
              <StatCard label="Tâches Complétées" value={stats.tasksCompleted} icon={CheckCircle} color="#34C759" />
              <StatCard label="Meilleur Streak" value={stats.habitsStreak} icon={Zap} color="#FF9500" />
              <StatCard label="Objectifs Atteints" value={stats.goalsAchieved} icon={Star} color="#FACC15" />
              <StatCard label="Heures Focus" value={Math.round(stats.focusMinutes / 60)} icon={Clock} color="#5856D6" />
          </View>

          <View style={styles.section}>
              <Text style={styles.sectionHeader}>GAMIFICATION</Text>
              <View style={styles.card}>
                  <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Niveau Actuel</Text>
                      <Text style={[styles.statRowValue, {color: '#FFF'}]}>{player.level}</Text>
                  </View>
                  <View style={styles.separator} />
                  <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>XP Total</Text>
                      <Text style={[styles.statRowValue, {color: '#C4B5FD'}]}>{player.experience_points}</Text>
                  </View>
                  <View style={styles.separator} />
                  <View style={styles.statRow}>
                      <Text style={styles.statRowLabel}>Crédits IA</Text>
                      <Text style={[styles.statRowValue, {color: '#FACC15'}]}>{player.credits}</Text>
                  </View>
              </View>
          </View>
      </View>
  );

  return (
    <>
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.container}>
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
        </Modal>

        {/* MODALE DOCUMENTS LÉGAUX */}
        <Modal visible={legalModal.visible} animationType="fade" transparent onRequestClose={() => setLegalModal({...legalModal, visible: false})}>
            <View style={styles.legalModalOverlay}>
                <View style={styles.legalModalContent}>
                    <View style={styles.legalHeader}>
                        <Text style={styles.legalTitle}>{legalModal.title}</Text>
                        <TouchableOpacity onPress={() => setLegalModal({...legalModal, visible: false})}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.legalScroll}>
                        <Text style={styles.legalText}>{legalModal.content}</Text>
                    </ScrollView>
                </View>
            </View>
        </Modal>

        {/* MODALE SUPPRESSION COMPTE */}
        <Modal visible={deleteModalVisible} animationType="fade" transparent onRequestClose={() => setDeleteModalVisible(false)}>
            <View style={styles.legalModalOverlay}>
                <View style={[styles.legalModalContent, {maxHeight: 'auto'}]}>
                    <Text style={[styles.legalTitle, {color: '#FF3B30', textAlign: 'center', marginBottom: 15}]}>DANGER IMMÉDIAT</Text>
                    <Text style={styles.deleteWarning}>Cette action est irréversible. Toutes vos données seront perdues à jamais.</Text>
                    <Text style={styles.deleteInstruction}>Pour confirmer, écrivez "SUPPRIMER" ci-dessous :</Text>
                    
                    <TextInput 
                        style={styles.deleteInput}
                        value={deleteConfirmationText}
                        onChangeText={setDeleteConfirmationText}
                        placeholder="SUPPRIMER"
                        placeholderTextColor="#666"
                        autoCapitalize="characters"
                    />

                    <View style={styles.deleteActions}>
                        <TouchableOpacity style={styles.cancelDeleteBtn} onPress={() => setDeleteModalVisible(false)}>
                            <Text style={styles.btnText}>Annuler</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.confirmDeleteBtn, deleteConfirmationText !== 'SUPPRIMER' && {opacity: 0.5}]}
                            disabled={deleteConfirmationText !== 'SUPPRIMER'}
                            onPress={executeDeleteAccount}
                        >
                            <Text style={styles.btnText}>CONFIRMER</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    </>
  );
};

// Helper Components
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

import { CheckCircle, Clock } from 'lucide-react-native'; 

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
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
  
  editInput: {
      backgroundColor: '#1C1C1E',
      color: '#FFF',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
  },
  cancelBtn: { backgroundColor: '#333', padding: 10, borderRadius: 20 },
  confirmBtn: { backgroundColor: '#34C759', padding: 10, borderRadius: 20 },

  xpCard: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 16 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  xpLabel: { color: '#888', fontSize: 12, fontWeight: '600' },
  xpValue: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  xpBarBg: { height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: '#007AFF' },

  premiumCard: { borderRadius: 16, padding: 20 },
  premiumTitle: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  premiumDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  upgradeBtn: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  upgradeText: { color: '#4F46E5', fontWeight: '700', fontSize: 12 },

  editProfileBtn: { backgroundColor: '#1C1C1E', paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  editProfileText: { color: '#FFF', fontWeight: '600' },

  // Settings Tab
  section: { marginBottom: 10 },
  sectionHeader: { fontSize: 12, color: '#666', marginBottom: 8, marginLeft: 4, fontWeight: '600', textTransform: 'uppercase' },
  sectionSubHeader: { fontSize: 11, color: '#555', marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#1C1C1E', borderRadius: 14, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, minHeight: 56 },
  separator: { height: 1, backgroundColor: '#262626', marginLeft: 56 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, color: '#FFF', fontWeight: '500' },
  versionText: { textAlign: 'center', color: '#444', fontSize: 11, marginTop: 20, marginBottom: 10 },

  // Stats Tab
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '48%', backgroundColor: '#1C1C1E', padding: 16, borderRadius: 16, alignItems: 'center' },
  statCardValue: { color: '#FFF', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statCardLabel: { color: '#888', fontSize: 12, fontWeight: '600' },
  
  statRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  statRowLabel: { color: '#FFF', fontSize: 16 },
  statRowValue: { fontSize: 16, fontWeight: '700' },

  // Legal Modal
  legalModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  legalModalContent: { backgroundColor: '#1C1C1E', borderRadius: 20, maxHeight: '80%', padding: 20 },
  legalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  legalTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  legalScroll: {},
  legalText: { color: '#DDD', fontSize: 14, lineHeight: 22 },

  // Delete Modal
  deleteWarning: { color: '#FFF', textAlign: 'center', marginBottom: 20 },
  deleteInstruction: { color: '#AAA', textAlign: 'center', marginBottom: 10, fontSize: 12 },
  deleteInput: { backgroundColor: '#000', color: '#FFF', padding: 12, borderRadius: 8, textAlign: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  deleteActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cancelDeleteBtn: { flex: 1, backgroundColor: '#333', padding: 12, borderRadius: 8, alignItems: 'center' },
  confirmDeleteBtn: { flex: 1, backgroundColor: '#FF3B30', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '700' }
});

export default Profile;