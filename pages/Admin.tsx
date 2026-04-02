
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { UserProfile, PlatformStats, Announcement } from '../types';
import { Shield, Users, BarChart3, Megaphone, Search, X, Ban, Unlock, CreditCard, ChevronRight, RefreshCw, Eye, Star, Clock, CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPlatformStats, getAllUsers, getUserFullDetails, banUser, unbanUser, createAnnouncement, getActiveAnnouncements, deleteAnnouncement } from '../services/admin';

const { width } = Dimensions.get('window');

const Admin: React.FC = () => {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'ANNOUNCEMENTS'>('OVERVIEW');
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [newAnnTitle, setNewAnnTitle] = useState('');
    const [newAnnContent, setNewAnnContent] = useState('');
    const [newAnnType, setNewAnnType] = useState('info');
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [userDetails, setUserDetails] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'OVERVIEW') {
                const s = await getPlatformStats();
                setStats(s);
            } else if (activeTab === 'USERS') {
                const u = await getAllUsers(searchQuery);
                setUsers(u);
            } else if (activeTab === 'ANNOUNCEMENTS') {
                const a = await getActiveAnnouncements();
                setAnnouncements(a);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => loadData();

    const handleViewUser = async (user: UserProfile) => {
        setSelectedUser(user);
        setDetailLoading(true);
        try {
            const details = await getUserFullDetails(user.id);
            setUserDetails(details);
        } catch (e) {
            console.error(e);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleBan = (user: UserProfile) => {
        Alert.prompt(
            "Bannir l'utilisateur",
            "Raison du bannissement :",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Bannir",
                    style: "destructive",
                    onPress: async (reason) => {
                        await banUser(user.id, reason || "Violation des CGU");
                        loadData();
                        setSelectedUser(null);
                    }
                }
            ]
        );
    };

    const handleUnban = async (user: UserProfile) => {
        await unbanUser(user.id);
        loadData();
        setSelectedUser(null);
    };

    const handlePostAnnouncement = async () => {
        if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
        await createAnnouncement(newAnnTitle, newAnnContent, newAnnType);
        setNewAnnTitle('');
        setNewAnnContent('');
        setNewAnnType('info');
        loadData();
    };

    const handleDeleteAnnouncement = async (id: string) => {
        await deleteAnnouncement(id);
        loadData();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <Shield size={24} color="#EF4444" />
                    <Text style={styles.title}>Administration</Text>
                </View>
                <Text style={styles.subtitle}>Gestion de la plateforme</Text>
            </View>

            <View style={styles.tabBar}>
                <TouchableOpacity style={[styles.tab, activeTab === 'OVERVIEW' && styles.activeTab]} onPress={() => setActiveTab('OVERVIEW')}>
                    <BarChart3 size={20} color={activeTab === 'OVERVIEW' ? "#FFF" : "#666"} />
                    <Text style={[styles.tabText, activeTab === 'OVERVIEW' && styles.activeTabText]}>Stats</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'USERS' && styles.activeTab]} onPress={() => setActiveTab('USERS')}>
                    <Users size={20} color={activeTab === 'USERS' ? "#FFF" : "#666"} />
                    <Text style={[styles.tabText, activeTab === 'USERS' && styles.activeTabText]}>Utilisateurs</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'ANNOUNCEMENTS' && styles.activeTab]} onPress={() => setActiveTab('ANNOUNCEMENTS')}>
                    <Megaphone size={20} color={activeTab === 'ANNOUNCEMENTS' ? "#FFF" : "#666"} />
                    <Text style={[styles.tabText, activeTab === 'ANNOUNCEMENTS' && styles.activeTabText]}>Annonces</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {activeTab === 'OVERVIEW' && stats && (
                        <View style={styles.statsGrid}>
                            <StatBox label="Total Utilisateurs" value={stats.totalUsers} icon={Users} color="#007AFF" />
                            <StatBox label="Nouveaux (7j)" value={stats.activeThisWeek} icon={Users} color="#34C759" />
                            <StatBox label="Bannis" value={stats.totalBanned} icon={Ban} color="#EF4444" />
                            <StatBox label="Tâches" value={stats.totalTasks} icon={CheckCircle2} color="#8B5CF6" />
                            <StatBox label="Habitudes" value={stats.totalHabits} icon={RefreshCw} color="#F59E0B" />
                            <StatBox label="Objectifs" value={stats.totalGoals} icon={Star} color="#FACC15" />
                            <StatBox label="Focus Total" value={`${stats.totalFocusHours}h`} icon={Clock} color="#60A5FA" />
                            <StatBox label="Crédits Admin" value="∞" icon={CreditCard} color="#EC4899" />
                        </View>
                    )}

                    {activeTab === 'USERS' && (
                        <View>
                            <View style={styles.searchRow}>
                                <View style={styles.searchInputContainer}>
                                    <Search size={18} color="#666" style={{ marginLeft: 12 }} />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Rechercher par email ou nom..."
                                        placeholderTextColor="#666"
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        onSubmitEditing={handleSearch}
                                    />
                                </View>
                            </View>
                            {users.map(user => (
                                <TouchableOpacity key={user.id} style={styles.userItem} onPress={() => handleViewUser(user)}>
                                    <View style={styles.userAvatar}>
                                        <Text style={styles.avatarText}>{user.display_name?.charAt(0) || user.email?.charAt(0)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.userName}>{user.display_name}</Text>
                                        <Text style={styles.userEmail}>{user.email}</Text>
                                    </View>
                                    {user.is_banned && <Ban size={16} color="#EF4444" style={{ marginRight: 10 }} />}
                                    <ChevronRight size={20} color="#333" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {activeTab === 'ANNOUNCEMENTS' && (
                        <View>
                            <View style={styles.announcementInputCard}>
                                <Text style={styles.sectionTitle}>Nouvelle Annonce</Text>
                                <TextInput
                                    style={[styles.announcementInput, { minHeight: 48, marginBottom: 8 }]}
                                    placeholder="Titre de l'annonce..."
                                    placeholderTextColor="#666"
                                    value={newAnnTitle}
                                    onChangeText={setNewAnnTitle}
                                />
                                <TextInput
                                    style={styles.announcementInput}
                                    placeholder="Corps du message..."
                                    placeholderTextColor="#666"
                                    multiline
                                    value={newAnnContent}
                                    onChangeText={setNewAnnContent}
                                />
                                <View style={styles.typeSelector}>
                                    {['info', 'alert', 'update'].map(t => (
                                        <TouchableOpacity
                                            key={t}
                                            style={[styles.typeBtn, newAnnType === t && styles.activeTypeBtn]}
                                            onPress={() => setNewAnnType(t)}
                                        >
                                            <Text style={[styles.typeBtnText, newAnnType === t && styles.activeTypeBtnText]}>{t.toUpperCase()}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TouchableOpacity style={styles.postBtn} onPress={handlePostAnnouncement}>
                                    <Text style={styles.postBtnText}>Publier</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.sectionTitle}>Annonces Actives</Text>
                            {announcements.map(a => (
                                <View key={a.id} style={styles.announcementItem}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <View style={[styles.typeBadge, { backgroundColor: a.announcement_type === 'alert' ? '#EF4444' : (a.announcement_type === 'update' ? '#34C759' : '#007AFF') }]} />
                                            <Text style={styles.announcementTitleText}>{a.title}</Text>
                                        </View>
                                        <Text style={styles.announcementContentText}>{a.content}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeleteAnnouncement(a.id)}>
                                        <X size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* USER DETAIL MODAL */}
            <Modal visible={!!selectedUser} transparent animationType="slide" onRequestClose={() => setSelectedUser(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Détails Utilisateur</Text>
                            <TouchableOpacity onPress={() => setSelectedUser(null)}>
                                <X size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        {detailLoading || !userDetails ? (
                            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
                        ) : (
                            <ScrollView style={{ padding: 20 }}>
                                <View style={styles.detailHeader}>
                                    <View style={[styles.userAvatar, { width: 60, height: 60, borderRadius: 30 }]}>
                                        <Text style={[styles.avatarText, { fontSize: 24 }]}>{selectedUser?.display_name?.charAt(0)}</Text>
                                    </View>
                                    <Text style={styles.detailName}>{selectedUser?.display_name}</Text>
                                    <Text style={styles.detailEmail}>{selectedUser?.email}</Text>
                                    {selectedUser?.is_banned && (
                                        <View style={styles.bannedBadge}>
                                            <Text style={styles.bannedText}>BANNI : {selectedUser.ban_reason}</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.detailStatsGrid}>
                                    <DetailStat label="Tâches" value={userDetails.tasksCount} />
                                    <DetailStat label="Habitudes" value={userDetails.habitsCount} />
                                    <DetailStat label="Objectifs" value={userDetails.goalsCount} />
                                    <DetailStat label="Focus" value={`${Math.round(userDetails.focusMinutes / 60)}h`} />
                                </View>

                                <View style={styles.actionSection}>
                                    <Text style={styles.sectionTitle}>Actions</Text>
                                    <View style={styles.actionButtons}>
                                        {selectedUser?.is_banned ? (
                                            <ActionButton icon={Unlock} label="Débannir" color="#34C759" onPress={() => handleUnban(selectedUser!)} />
                                        ) : (
                                            <ActionButton icon={Ban} label="Bannir" color="#EF4444" onPress={() => handleBan(selectedUser!)} />
                                        )}
                                    </View>
                                </View>
                                <View style={{ height: 40 }} />
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const StatBox = ({ label, value, icon: Icon, color }: any) => (
    <View style={styles.statBox}>
        <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
            <Icon size={20} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const DetailStat = ({ label, value }: any) => (
    <View style={styles.detailStat}>
        <Text style={styles.detailStatValue}>{value}</Text>
        <Text style={styles.detailStatLabel}>{label}</Text>
    </View>
);

const ActionButton = ({ icon: Icon, label, value, color = "#FFF", onPress }: any) => (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon size={20} color={color === "#FFF" ? "#007AFF" : color} />
            <Text style={[styles.actionBtnLabel, { color }]}>{label}</Text>
        </View>
        {value !== undefined && <Text style={styles.actionBtnValue}>{value}</Text>}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { padding: 20 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    title: { color: '#FFF', fontSize: 24, fontWeight: '800' },
    subtitle: { color: '#666', fontSize: 14 },
    tabBar: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#1C1C1E' },
    activeTab: { backgroundColor: '#007AFF' },
    tabText: { color: '#666', fontWeight: '700', fontSize: 13 },
    activeTabText: { color: '#FFF' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statBox: { width: (width - 52) / 2, backgroundColor: '#1C1C1E', padding: 16, borderRadius: 16 },
    statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    statValue: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 4 },
    statLabel: { color: '#666', fontSize: 12, fontWeight: '600' },
    searchRow: { marginBottom: 16 },
    searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', borderRadius: 12, height: 48 },
    searchInput: { flex: 1, color: '#FFF', paddingHorizontal: 12, fontSize: 15 },
    userItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', padding: 12, borderRadius: 16, marginBottom: 10 },
    userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    avatarText: { color: '#FFF', fontWeight: '700' },
    userName: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    userEmail: { color: '#666', fontSize: 12 },
    announcementInputCard: { backgroundColor: '#1C1C1E', padding: 16, borderRadius: 16, marginBottom: 20 },
    sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 12 },
    announcementInput: { backgroundColor: '#000', borderRadius: 12, color: '#FFF', padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
    postBtn: { backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    postBtnText: { color: '#FFF', fontWeight: '700' },
    announcementItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#1C1C1E', padding: 16, borderRadius: 16, marginBottom: 10 },
    announcementTitleText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    announcementContentText: { color: '#8E8E93', fontSize: 13, lineHeight: 18 },
    typeBadge: { width: 8, height: 8, borderRadius: 4 },
    typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    typeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#000', borderWidth: 1, borderColor: '#333' },
    activeTypeBtn: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
    typeBtnText: { color: '#666', fontSize: 10, fontWeight: '700' },
    activeTypeBtnText: { color: '#FFF' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '90%' },
    modalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#222', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    detailHeader: { alignItems: 'center', marginBottom: 24 },
    detailName: { color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 12 },
    detailEmail: { color: '#666', fontSize: 14 },
    bannedBadge: { backgroundColor: '#EF444420', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 12 },
    bannedText: { color: '#EF4444', fontWeight: '700', fontSize: 12 },
    detailStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
    detailStat: { width: (width - 60) / 3, backgroundColor: '#1C1C1E', padding: 12, borderRadius: 12, alignItems: 'center' },
    detailStatValue: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    detailStatLabel: { color: '#666', fontSize: 11, fontWeight: '600', marginTop: 4 },
    actionSection: {},
    actionButtons: { gap: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1C1C1E', padding: 16, borderRadius: 16 },
    actionBtnLabel: { fontSize: 15, fontWeight: '600' },
    actionBtnValue: { color: '#007AFF', fontWeight: '800' }
});

export default Admin;
