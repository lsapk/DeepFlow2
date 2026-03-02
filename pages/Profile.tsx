
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Switch, Alert, ActivityIndicator, LayoutAnimation, TextInput, Platform, BackHandler, Linking, Modal } from 'react-native';
import { UserProfile, PlayerProfile, UserSettings, AiPermissions, AvatarConfig, AvatarClass, AvatarHelmet, AvatarArmor, AvatarColor } from '../types';
import { LogOut, Bell, Sun, Moon, Volume2, Shield, CreditCard, ChevronRight, X, User, BarChart2, Star, Zap, Crown, Check, Edit2, Brain, FileText, Lock, MessageSquare, Trash2, Heart, CheckCircle, Clock, Mail, HelpCircle, Scale, RefreshCw, Target, Palette, Award, Zap as ZapIcon, LayoutGrid, Sparkles } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import PenguinAvatar from '../components/PenguinAvatar';
import { getPenguinProfile } from '../services/penguin';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInDown, SlideOutDown, FadeIn } from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';

interface ProfileProps {
  user: UserProfile;
  player: PlayerProfile;
  logout: () => void;
  visible: boolean;
  onClose: () => void;
  onThemeChange?: (isDark: boolean) => void;
  onPlayerUpdate?: (player: PlayerProfile) => void;
  onUserUpdate?: (user: UserProfile) => void;
  isAdmin?: boolean;
  setView?: (view: any) => void;
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
    FAQ: `# FAQ DeepFlow (50 questions)

**Q1. Comment réinitialiser mon mot de passe ?**\nR: Utilisez l'écran de connexion, option mot de passe oublié, puis suivez le lien reçu par email.
**Q2. Mes données sont-elles privées ?**\nR: Oui, elles sont stockées via Supabase avec RLS et accès limité à votre compte.
**Q3. Puis-je exporter mes données ?**\nR: Oui, contactez le support ou utilisez la future option d’export en JSON/CSV.
**Q4. Puis-je supprimer mon compte ?**\nR: Oui, depuis Zone de danger, suppression définitive et irréversible.
**Q5. Pourquoi mon niveau n’augmente pas ?**\nR: Le niveau dépend de l’XP totale. Vérifiez que vos actions sont bien synchronisées.
**Q6. Comment gagner des crédits ?**\nR: Complétez des quêtes, tâches et habitudes pour gagner des crédits.
**Q7. À quoi servent les crédits IA ?**\nR: Ils permettent d’utiliser certaines fonctionnalités d’assistance IA.
**Q8. L’IA lit-elle tout mon journal ?**\nR: Uniquement selon vos permissions IA dans les réglages.
**Q9. Comment désactiver l’IA ?**\nR: Dans Réglages > Permissions IA, désactivez chaque module.
**Q10. Pourquoi je vois un mode hors ligne ?**\nR: L’app est offline-first. Les actions sont mises en file puis synchronisées.
**Q11. Comment forcer la synchronisation ?**\nR: Mettez l’app au premier plan avec internet actif ; la sync repart automatiquement.
**Q12. Que faire si une tâche disparaît ?**\nR: Vérifiez filtres, date, puis relancez l’app. Contactez support si besoin.
**Q13. Puis-je partager un objectif ?**\nR: Pas encore publiquement, cette option est en préparation.
**Q14. Comment fonctionne la streak d’habitudes ?**\nR: Elle augmente à chaque jour/occurrence validée selon la fréquence.
**Q15. Pourquoi ma streak a baissé ?**\nR: Une journée manquée ou une timezone incorrecte peut casser la chaîne.
**Q16. Comment changer la langue ?**\nR: Réglages > Langue. Certaines sections restent en français pour le moment.
**Q17. Puis-je utiliser l’app sans compte ?**\nR: Non, un compte est nécessaire pour la synchronisation multi-appareils.
**Q18. Comment marche le focus mode ?**\nR: Lancez une session, terminez-la pour enregistrer durée et progression.
**Q19. Puis-je lier des tâches à des objectifs ?**\nR: Oui lors de la création/édition des tâches.
**Q20. Comment fonctionnent les quêtes ?**\nR: Des objectifs gamifiés donnant XP et crédits.
**Q21. Les quêtes expirent-elles ?**\nR: Certaines oui, selon leur type et date d’expiration.
**Q22. Comment débloquer des cosmétiques pour mon pingouin ?**\nR: Via la boutique, les succès ou les récompenses d'expéditions.
**Q23. Le thème clair existe-t-il ?**\nR: Oui, activable depuis Réglages > Apparence.
**Q24. Puis-je changer d’avatar à tout moment ?**\nR: L'avatar de votre pingouin évolue avec votre progression.
**Q25. Pourquoi le bouton Enregistrer n’apparaissait pas ?**\nR: Correctif appliqué : bouton désormais fixe en bas du modal.
**Q26. Google Calendar est-il obligatoire ?**\nR: Non, vous pouvez créer des événements locaux sans Google.
**Q27. Comment connecter Google Calendar ?**\nR: Ajoutez les Client IDs, relancez Expo, puis connectez depuis Calendrier.
**Q28. Pourquoi Google refuse la connexion ?**\nR: Client ID, SHA, bundle id ou compte testeur OAuth incorrect.
**Q29. Puis-je ajouter des événements manuellement ?**\nR: Oui, via le bouton + dans Calendrier.
**Q30. Puis-je modifier/supprimer un événement local ?**\nR: Oui, appui long sur l’événement local dans l’agenda.
**Q31. Les événements locaux sont synchronisés ?**\nR: Oui en local immédiat et tentative de sync Supabase si disponible.
**Q32. Comment contacter le support ?**\nR: Par email depuis Réglages > Contacter le support.
**Q33. Quel est le délai de réponse support ?**\nR: Généralement 24 à 72h ouvrées.
**Q34. L’app est-elle conforme RGPD ?**\nR: Oui, avec droits d’accès/suppression/rectification.
**Q35. Comment voir mes statistiques ?**\nR: Onglet Stats dans le profil et modules d’évolution.
**Q36. Puis-je restaurer un compte supprimé ?**\nR: Non, suppression définitive selon la politique en vigueur.
**Q37. Les notifications sont personnalisables ?**\nR: Oui, vous pouvez activer/désactiver selon vos préférences.
**Q38. Pourquoi je n’ai pas de notifications ?**\nR: Vérifiez permissions système et réglage notifications activé.
**Q39. Comment changer mon pseudo ?**\nR: Profil > Modifier, puis sauvegarder.
**Q40. Mon email peut-il être changé ?**\nR: Cela dépend du provider d’authentification et des règles Supabase.
**Q41. Comment signaler un bug ?**\nR: Envoyez version app, appareil, capture et étapes de reproduction.
**Q42. L’app consomme beaucoup de batterie ?**\nR: Le mode focus et sync sont optimisés, mais dépend de votre usage.
**Q43. Mes données sont-elles chiffrées ?**\nR: Transport chiffré (TLS) et stockage sécurisé côté backend.
**Q44. Y a-t-il des achats intégrés ?**\nR: Des mécaniques de crédits existent, selon votre environnement de test.
**Q45. Puis-je utiliser plusieurs appareils ?**\nR: Oui avec le même compte, les données se synchronisent.
**Q46. Comment vider le cache Expo ?**\nR: Lancez la commande npx expo start -c puis relance complète de l’app.
**Q47. Pourquoi certaines vues sont vides ?**\nR: Aucune donnée disponible ou filtrage actif.
**Q48. Puis-je désactiver les sons ?**\nR: Oui dans Réglages > Son.
**Q49. Qu’est-ce que les power-ups ?**\nR: Bonus temporaires (XP, protection streak, etc.) appliqués au profil.
**Q50. Comment débloquer des succès ?**\nR: En atteignant des paliers quêtes/focus/habitudes/niveau/tâches.
**Q51. Puis-je proposer une fonctionnalité ?**\nR: Oui, envoyez vos idées via support, section feedback.`,
    PRIVACY: `# Politique de Confidentialité

## 1) Responsable du traitement
DeepFlow traite vos données pour fournir l'application, la synchronisation, la gamification et l'assistance IA.

## 2) Données collectées
- Données de compte (email, identifiant, pseudo).
- Données d'usage (tâches, habitudes, objectifs, sessions focus, quêtes, succès, calendrier local).
- Données techniques minimales (logs applicatifs, erreurs).

## 3) Finalités
- Fournir les fonctionnalités principales.
- Synchroniser vos données multi-appareils.
- Personnaliser recommandations IA selon vos permissions.
- Assurer sécurité, prévention fraude et qualité de service.

## 4) Bases légales
- Exécution du service demandé.
- Consentement pour certains traitements (IA, communications).
- Intérêt légitime (stabilité, sécurité, analytics techniques minimaux).

## 5) IA et consentement
Les modules IA respectent les permissions activées dans l'application. Vous pouvez retirer ce consentement à tout moment sans bloquer les fonctions cœur.

## 6) Durées de conservation
Les données sont conservées tant que votre compte est actif, puis supprimées selon les délais techniques et obligations légales minimales.

## 7) Sous-traitants
- Supabase (base de données/auth/sync).
- Google (OAuth Calendar/IA selon usage).

## 8) Sécurité
- Chiffrement TLS en transit.
- Règles RLS côté base.
- Principe du moindre privilège.

## 9) Vos droits
Accès, rectification, effacement, opposition, limitation, portabilité, retrait du consentement.

## 10) Exercice des droits
Contact : **deepflow.ia@gmail.com** avec objet “RGPD - DeepFlow”.

## 11) Mineurs
Le service n'est pas destiné aux enfants sans supervision parentale selon les lois locales.

## 12) Cookies / traceurs
Sur mobile natif, pas de cookies web classiques ; sur web, des traceurs techniques peuvent être utilisés pour session et sécurité.

## 13) Mises à jour
Cette politique peut évoluer. La date de mise à jour est affichée dans l'application.`,
    TERMS: `# Conditions Générales d'Utilisation (CGU)

## 1) Objet
DeepFlow est une application de productivité et gamification personnelle.

## 2) Acceptation
L'utilisation du service implique l'acceptation pleine et entière des présentes CGU.

## 3) Compte utilisateur
Vous êtes responsable de la confidentialité de vos identifiants et de l'activité de votre compte.

## 4) Usage autorisé
Usage personnel, licite, sans tentative d'abus, rétro-ingénierie, fraude ou détournement.

## 5) IA et recommandations
Les suggestions IA sont informatives et ne remplacent pas un avis professionnel (médical, psychologique, juridique, etc.).

## 6) Disponibilité
Le service vise une haute disponibilité sans garantie d'absence totale d'interruption.

## 7) Données et sauvegarde
DeepFlow applique une stratégie offline-first, mais l'utilisateur reste responsable de vérifier ses données critiques.

## 8) Propriété intellectuelle
Le code, design, contenus, marque et univers visuel appartiennent à DeepFlow ou ses ayants droit.

## 9) Contenus utilisateur
Vous conservez vos contenus, accordez une licence technique nécessaire à l'hébergement/synchronisation.

## 10) Comportements interdits
Spam, usurpation, exploitation abusive des API, contournement sécurité, atteinte aux droits de tiers.

## 11) Limitation de responsabilité
Responsabilité limitée aux dommages directs prouvés, dans les limites autorisées par la loi.

## 12) Suspension / résiliation
Compte suspendu ou résilié en cas de violation grave des CGU.

## 13) Modifications
Les CGU peuvent évoluer ; l'usage continu vaut acceptation de la version en vigueur.

## 14) Droit applicable
Droit applicable selon juridiction indiquée dans les mentions légales et la législation de protection des consommateurs.`,
    LEGAL: `# Mentions Légales

## Éditeur
**DeepFlow**
Contact : **deepflow.ia@gmail.com**

## Hébergement
- Supabase Inc.
- Google Cloud Platform

## Directeur de publication
L'équipe produit DeepFlow.

## Support
Assistance fonctionnelle et technique par email.

## Propriété intellectuelle
L'ensemble des éléments (marques, interfaces, textes, illustrations, code) est protégé. Toute reproduction non autorisée est interdite.

## Responsabilité
DeepFlow met en œuvre les moyens raisonnables pour assurer exactitude et disponibilité, sans garantie absolue.

## Signalement
Pour tout abus, contenu illicite, faille de sécurité : **deepflow.ia@gmail.com**

## Crédits
Icônes et bibliothèques open source utilisées selon leurs licences respectives.

## Version légale
Dernière mise à jour : 2026-02-22.`
};


const AVATAR_CLASSES: AvatarClass[] = ['cyber_knight', 'neon_hacker', 'quantum_warrior', 'shadow_ninja', 'cosmic_sage'];
const AVATAR_HELMETS: AvatarHelmet[] = ['standard', 'visor', 'crown', 'halo'];
const AVATAR_ARMORS: AvatarArmor[] = ['standard', 'heavy', 'stealth', 'energy'];
const AVATAR_COLORS: AvatarColor[] = ['#C4B5FD', '#34D399', '#F472B6', '#60A5FA', '#FACC15', '#F87171', '#A78BFA'];

const Profile: React.FC<ProfileProps> = ({ user, player, logout, visible, onClose, onThemeChange, onPlayerUpdate, isAdmin, setView }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SETTINGS' | 'STATS'>('PROFILE');
  const [penguin, setPenguin] = useState<any>(null);
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
          fetchPenguin();
      }
  }, [visible]);

  const fetchPenguin = async () => {
      const profile = await getPenguinProfile(user.id);
      if (profile) setPenguin(profile);
  };



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

      if (error) {
          Alert.alert("Erreur", "Impossible de mettre à jour le profil.");
      } else {
          // Success
          const updatedUser = { ...user, display_name: editName, bio: editBio };
          if (onUserUpdate) onUserUpdate(updatedUser);
          setIsEditing(false);
          Alert.alert("Succès", "Profil mis à jour !");
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
                  <PenguinAvatar stage={penguin?.stage || 'egg'} size={140} />
                  <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>{player.level}</Text>
                  </View>
              </View>
              {isEditing ? (
                  <View style={{width: '100%', alignItems: 'center', marginBottom: 10}}>
                      <TextInput style={[styles.editInput, {fontSize: 20, fontWeight: '700', textAlign: 'center'}]} value={editName} onChangeText={setEditName} placeholder="Nom" placeholderTextColor="#666" />
                      <TextInput style={[styles.editInput, {fontSize: 14, textAlign: 'center', marginTop: 8, minWidth: 200}]} value={editBio} onChangeText={setEditBio} placeholder="Bio..." placeholderTextColor="#666" />
                      <View style={{flexDirection: 'row', gap: 10, marginTop: 10, zIndex: 10}}>
                          <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelBtn}><X size={20} color="#FFF" /></TouchableOpacity>
                          <TouchableOpacity onPress={saveProfile} style={styles.confirmBtn}><Check size={20} color="#FFF" /></TouchableOpacity>
                      </View>
                  </View>
              ) : (
                  <>
                    <Text style={styles.name}>{user.display_name}</Text>
                    <Text style={styles.email}>{user.email}</Text>
                    {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
                    <View style={styles.badgeRow}>
                        <View style={styles.rankBadge}>
                            <Award size={12} color="#C4B5FD" />
                            <Text style={styles.rankText}>{penguin?.stage?.toUpperCase() || 'EGG'}</Text>
                        </View>
                    </View>
                  </>
              )}
          </View>

          <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>XP TOTAL</Text>
                  <Text style={styles.infoValue}>{player.experience_points}</Text>
                  <View style={styles.xpBarBgMini}>
                      <View style={[styles.xpBarFill, { width: `${Math.min(100, (player.experience_points / (player.level * 100 * player.level)) * 100)}%` }]} />
                  </View>
              </View>
              <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>CRÉDITS</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                    <Star size={16} color="#FACC15" fill="#FACC15" />
                    <Text style={styles.infoValue}>{player.credits}</Text>
                  </View>
              </View>
          </View>

          {!isEditing && (
              <View style={{gap: 12}}>
                  <TouchableOpacity style={styles.editProfileBtn} onPress={() => setIsEditing(true)}>
                      <Edit2 size={16} color="#8E8E93" style={{marginRight: 8}} />
                      <Text style={[styles.editProfileText, {color: '#8E8E93'}]}>Modifier mon profil</Text>
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

          {isAdmin && (
              <View style={styles.section}>
                  <Text style={styles.sectionHeader}>ADMINISTRATION</Text>
                  <View style={styles.card}>
                      <SettingItem
                          icon={Shield}
                          label="Panneau d'administration"
                          iconColor="#EF4444"
                          onPress={() => {
                              if (setView) {
                                  setView('ADMIN');
                                  onClose();
                              }
                          }}
                      />
                  </View>
              </View>
          )}

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
                <View />
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
                        <Markdown style={{ body: styles.legalText, heading1: { color: '#FFF', fontSize: 24, marginBottom: 16 }, heading2: { color: '#FFF', fontSize: 19, marginTop: 14 }, strong: { color: '#FFF' }, list_item: { color: '#DDD' } }}>
                            {legalBody}
                        </Markdown>
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
  avatarContainer: { marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#1C1C1E' },
  levelBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#007AFF', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#000' },
  levelBadgeText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  name: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  email: { fontSize: 14, color: '#666', marginBottom: 12 },
  bio: { fontSize: 15, color: '#8E8E93', marginBottom: 16, textAlign: 'center', paddingHorizontal: 30, lineHeight: 22 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(196, 181, 253, 0.1)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(196, 181, 253, 0.2)' },
  rankText: { fontSize: 11, fontWeight: '800', color: '#C4B5FD', letterSpacing: 1 },

  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  infoCard: { flex: 1, backgroundColor: '#1C1C1E', padding: 16, borderRadius: 20, justifyContent: 'center' },
  infoLabel: { fontSize: 10, fontWeight: '700', color: '#666', marginBottom: 6, letterSpacing: 0.5 },
  infoValue: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  xpBarBgMini: { height: 4, backgroundColor: '#333', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  
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
  stickySaveBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, backgroundColor: 'rgba(17,17,17,0.98)', borderTopWidth: 1, borderTopColor: '#2A2A2A' },
  saveMainBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 14, alignItems: 'center' },
  saveMainBtnText: { color: '#FFF', fontWeight: '700', fontSize: 17 },
});

export default Profile;
