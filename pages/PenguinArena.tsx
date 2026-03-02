
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { PenguinProfile, PenguinExpedition, PenguinPearl, UserProfile } from '../types';
import { Fish, Zap, Star, ShoppingBag, Gift, Compass, MessageCircle, BarChart3, Radio, Library, Sofa, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPenguinProfile, getExpeditions, getPearls, markPearlAsRead, syncLegacyProgress } from '../services/penguin';
import IcebergView from '../components/IcebergView';
import PenguinAvatar from '../components/PenguinAvatar';
import PenguinStats from '../components/PenguinStats';
import { supabase } from '../services/supabase';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

type TabId = 'EXPEDITIONS' | 'PEARLS' | 'SHOP';

interface PenguinArenaProps {
    user: UserProfile;
    openMenu: () => void;
    openProfile: () => void;
    isDarkMode?: boolean;
    noPadding?: boolean;
    isAdmin?: boolean;
}

const PenguinArena: React.FC<PenguinArenaProps> = ({ user, openProfile, isDarkMode = true, noPadding = false, isAdmin = false }) => {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<TabId>('EXPEDITIONS');
    const [profile, setProfile] = useState<PenguinProfile | null>(null);
    const [expeditions, setExpeditions] = useState<PenguinExpedition[]>([]);
    const [pearls, setPearls] = useState<PenguinPearl[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [prof, exp, pea] = await Promise.all([
            getPenguinProfile(user.id),
            getExpeditions(user.id),
            getPearls(user.id)
        ]);
        setProfile(prof);
        setExpeditions(exp);
        setPearls(pea);
        setLoading(false);
    }, [user.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, [fetchData]);

    const handleSyncProgress = async () => {
        setSyncing(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await syncLegacyProgress(user.id);
            await fetchData();
            Alert.alert("Synchronisation terminée", "Votre progression passée a été convertie en ressources pour votre pingouin !");
        } catch (e) {
            Alert.alert("Erreur", "La synchronisation a échoué.");
        } finally {
            setSyncing(false);
        }
    };

    const colors = {
        bg: isDarkMode ? '#000000' : '#F2F2F7',
        cardBg: isDarkMode ? '#1C1C1E' : '#FFFFFF',
        text: isDarkMode ? '#FFFFFF' : '#000000',
        textSub: isDarkMode ? '#8E8E93' : '#8E8E93',
        border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
        tabActive: isDarkMode ? '#333' : '#E5E5EA'
    };

    const handleClaimExpedition = async (expedition: PenguinExpedition) => {
        if (expedition.completed || expedition.current_progress < expedition.target_value) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            await supabase.from('penguin_expeditions').update({
                completed: true,
                completed_at: new Date().toISOString()
            }).eq('id', expedition.id);

            // Logic to award the reward to profile
            const updates: any = {};
            if (expedition.reward_type === 'shrimp') updates.shrimp_total = (profile?.shrimp_total || 0) + expedition.reward_amount;
            if (expedition.reward_type === 'salmon') updates.salmon_total = (profile?.salmon_total || 0) + expedition.reward_amount;
            if (expedition.reward_type === 'golden_fish') updates.golden_fish_total = (profile?.golden_fish_total || 0) + expedition.reward_amount;

            await supabase.from('penguin_profiles').update(updates).eq('user_id', user.id);

            fetchData();
        } catch {
            Alert.alert('Erreur', 'Impossible de valider l’expédition.');
        }
    };

    const renderExpeditions = () => (
        <View>
            <View style={styles.sectionHeader}>
                <Compass size={16} color={colors.text} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Expéditions</Text>
            </View>
            {expeditions.length === 0 ? (
                <View style={[styles.emptyState, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.textSub }}>Pas d'expéditions pour le moment.</Text>
                </View>
            ) : (
                expeditions.map((exp) => (
                    <TouchableOpacity
                        key={exp.id}
                        style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                        onPress={() => handleClaimExpedition(exp)}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>{exp.title}</Text>
                            <Text style={{ color: colors.textSub, marginBottom: 8 }}>{exp.description}</Text>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${Math.min(100, (exp.current_progress / exp.target_value) * 100)}%` }]} />
                            </View>
                            <Text style={styles.progressText}>{exp.current_progress} / {exp.target_value}</Text>
                        </View>
                        <View style={styles.rewardContainer}>
                            <Fish size={14} color="#EF4444" fill="#EF4444" />
                            <Text style={styles.rewardAmount}>x{exp.reward_amount}</Text>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </View>
    );

    const renderPearls = () => (
        <View>
             <View style={styles.sectionHeader}>
                <MessageCircle size={16} color={colors.text} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Perles de Sagesse</Text>
            </View>
            {pearls.length === 0 ? (
                <View style={[styles.emptyState, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.textSub }}>Aucune perle trouvée.</Text>
                </View>
            ) : (
                pearls.map((pearl) => (
                    <TouchableOpacity
                        key={pearl.id}
                        style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border, opacity: pearl.is_read ? 0.7 : 1 }]}
                        onPress={() => !pearl.is_read && markPearlAsRead(pearl.id).then(fetchData)}
                    >
                        <Star size={20} color="#FACC15" fill={pearl.is_read ? "transparent" : "#FACC15"} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: colors.text }]}>{pearl.pearl_type.toUpperCase()}</Text>
                            <Text style={{ color: colors.text }}>{pearl.message}</Text>
                            <Text style={styles.dateText}>{new Date(pearl.created_at).toLocaleDateString()}</Text>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </View>
    );

    const renderShop = () => (
        <View>
            <View style={styles.sectionHeader}>
                <ShoppingBag size={16} color={colors.text} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Boutique de l'Iceberg</Text>
            </View>
            <View style={styles.shopGrid}>
                {[
                    { id: 'radio', name: 'La Radio', icon: Radio, price: 5, desc: 'Sons d\'ambiance' },
                    { id: 'library', name: 'La Bibliothèque', icon: Library, price: 10, desc: 'Archives Focus' },
                    { id: 'lounge', name: 'La Chaise longue', icon: Sofa, price: 15, desc: 'Valorisation du repos' },
                ].map((item) => (
                    <TouchableOpacity key={item.id} style={[styles.shopCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <item.icon size={24} color={colors.text} />
                        <Text style={[styles.shopItemName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.shopItemDesc, { color: colors.textSub }]}>{item.desc}</Text>
                        <View style={styles.shopPrice}>
                            <Star size={12} color="#FACC15" fill="#FACC15" />
                            <Text style={styles.priceText}>{item.price}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
                <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: noPadding ? 0 : insets.top }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0EA5E9" />}
            >
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={[styles.title, { color: colors.text }]}>Mon Pingouin</Text>
                            <Text style={[styles.subtitle, { color: colors.textSub }]}>Stade : {profile?.stage.toUpperCase() || 'EGG'}</Text>
                        </View>
                    </View>
                </View>

                {profile && (
                    <>
                        <PenguinStats
                            shrimp={profile.shrimp_total}
                            shrimpToday={profile.shrimp_today}
                            shrimpLimit={profile.shrimp_daily_limit}
                            salmon={profile.salmon_total}
                            goldenFish={profile.golden_fish_total}
                            icebergSize={profile.iceberg_size}
                        />

                        <IcebergView size={profile.iceberg_size} climate={profile.climate_state}>
                            <PenguinAvatar stage={profile.stage} />
                        </IcebergView>
                    </>
                )}

                <View style={styles.tabs}>
                    {[
                        { id: 'EXPEDITIONS', label: 'Expéditions' },
                        { id: 'PEARLS', label: 'Perles' },
                        { id: 'SHOP', label: 'Boutique' }
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.tabItem, activeTab === tab.id && { backgroundColor: colors.tabActive }]}
                            onPress={() => setActiveTab(tab.id as TabId)}
                        >
                            <Text style={[styles.tabText, { color: activeTab === tab.id ? colors.text : colors.textSub }]}>{tab.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {activeTab === 'EXPEDITIONS' && renderExpeditions()}
                {activeTab === 'PEARLS' && renderPearls()}
                {activeTab === 'SHOP' && renderShop()}

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
    header: { marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '800' },
    subtitle: { fontSize: 14, marginTop: 4 },
    syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
    syncText: { fontSize: 12, fontWeight: '700' },
    tabs: { flexDirection: 'row', gap: 10, marginBottom: 25 },
    tabItem: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
    tabText: { fontSize: 13, fontWeight: '700' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
    sectionTitle: { fontSize: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    card: { flexDirection: 'row', gap: 15, padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
    progressFill: { height: '100%', backgroundColor: '#0EA5E9' },
    progressText: { fontSize: 11, color: '#8E8E93' },
    rewardContainer: { alignItems: 'center', minWidth: 40 },
    rewardAmount: { fontSize: 12, fontWeight: 'bold', color: '#FFF' },
    dateText: { fontSize: 10, color: '#8E8E93', marginTop: 8 },
    emptyState: { padding: 30, alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: 15 },
    shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    shopCard: { width: (width - 52) / 2, padding: 15, borderRadius: 15, borderWidth: 1, alignItems: 'center', gap: 8 },
    shopItemName: { fontSize: 15, fontWeight: '700' },
    shopItemDesc: { fontSize: 11, textAlign: 'center' },
    shopPrice: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(250, 204, 21, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    priceText: { color: '#FACC15', fontWeight: '800', fontSize: 12 }
});

export default PenguinArena;
