import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Bot, Gamepad2, Sparkles, ChevronRight } from 'lucide-react-native';
import { PlayerProfile } from '../types';

interface ExploreProps {
    player: PlayerProfile;
}

const Explore: React.FC<ExploreProps> = ({ player }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
            <Text style={styles.largeTitle}>Explore</Text>
      </View>
        
      <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
             <TextInput 
                placeholder="Discuter avec DeepFlow AI..." 
                placeholderTextColor="#666" 
                style={styles.searchInput}
             />
             <Bot size={20} color="#666" />
          </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* IA Section */}
        <Text style={styles.sectionLabel}>Assistant</Text>
        <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.iconBox, { backgroundColor: '#171717' }]}>
                 <Sparkles size={22} color="#FFF" />
            </View>
            <View style={{flex: 1}}>
                <Text style={styles.menuText}>Nouveau Chat IA</Text>
                <Text style={styles.menuSubText}>Posez une question ou planifiez votre journée.</Text>
            </View>
            <ChevronRight size={16} color="#444" />
        </TouchableOpacity>

        <View style={styles.spacer} />
        
        {/* Gamification Section - REAL DATA */}
        <Text style={styles.sectionLabel}>Cyber Knight QG</Text>

        <TouchableOpacity style={styles.cardItem}>
            <View style={styles.cardHeader}>
                 <Gamepad2 size={24} color="#C4B5FD" />
                 <Text style={styles.cardTitle}>Statut Joueur</Text>
            </View>
            
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{player?.level || 1}</Text>
                    <Text style={styles.statLabel}>Niveau</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{player?.credits || 0}</Text>
                    <Text style={styles.statLabel}>Crédits</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{player?.experience_points || 0}</Text>
                    <Text style={styles.statLabel}>XP</Text>
                </View>
            </View>
            
            <View style={styles.xpBarBg}>
                <View style={[styles.xpBarFill, { width: `${(player?.experience_points % 1000) / 10}%` }]} />
            </View>
            <Text style={styles.xpText}>Progression vers Niveau {(player?.level || 1) + 1}</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 10,
  },
  header: {
      paddingHorizontal: 20,
      marginBottom: 10,
      paddingTop: 10,
  },
  largeTitle: {
      fontSize: 32,
      fontWeight: '700',
      color: '#FFF',
  },
  scrollContent: {
      paddingBottom: 100,
      paddingHorizontal: 20,
  },
  searchContainer: {
      paddingHorizontal: 20,
      marginBottom: 20,
  },
  searchInputWrapper: {
      backgroundColor: '#171717',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: '#262626',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  searchInput: {
      color: '#FFF',
      fontSize: 16,
      flex: 1,
  },
  sectionLabel: {
      color: '#666',
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 12,
      marginTop: 12,
      textTransform: 'uppercase',
  },
  menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      gap: 16,
  },
  iconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#262626',
  },
  menuText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '600',
  },
  menuSubText: {
      color: '#666',
      fontSize: 13,
      marginTop: 2,
  },
  spacer: {
      height: 20,
  },
  cardItem: {
      backgroundColor: '#171717',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#262626',
  },
  cardHeader: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      marginBottom: 16,
  },
  cardTitle: {
      color: '#C4B5FD',
      fontSize: 18,
      fontWeight: '600',
  },
  statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
  },
  stat: {
      alignItems: 'center',
      flex: 1,
  },
  statValue: {
      color: '#FFF',
      fontSize: 20,
      fontWeight: '700',
  },
  statLabel: {
      color: '#666',
      fontSize: 12,
      marginTop: 2,
  },
  divider: {
      width: 1,
      backgroundColor: '#333',
      height: '80%',
  },
  xpBarBg: {
      height: 6,
      backgroundColor: '#333',
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 8,
  },
  xpBarFill: {
      height: '100%',
      backgroundColor: '#C4B5FD',
      borderRadius: 3,
  },
  xpText: {
      color: '#666',
      fontSize: 11,
      textAlign: 'center',
  }
});

export default Explore;