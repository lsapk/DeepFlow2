import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { PlayerProfile, UserProfile } from '../types';
import { Star } from 'lucide-react-native';

interface GamificationHeaderProps {
  player: PlayerProfile;
  user: UserProfile;
}

const GamificationHeader: React.FC<GamificationHeaderProps> = ({ player, user }) => {
  const progress = (player.experience_points % 1000) / 1000 * 100;

  return (
    <View style={styles.container}>
        <View style={styles.headerRow}>
            <View>
                <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                <Text style={styles.largeTitle}>Summary</Text>
            </View>
            <View style={styles.avatarContainer}>
                 <Image 
                    source={{ uri: user.photo_url || "https://via.placeholder.com/100" }} 
                    style={styles.avatar} 
                />
            </View>
        </View>

        <View style={styles.card}>
            <View style={styles.levelRow}>
                <View>
                    <Text style={styles.cardLabel}>CURRENT LEVEL</Text>
                    <Text style={styles.levelValue}>{player.level}</Text>
                    <Text style={styles.avatarType}>{player.avatar_type.replace('_', ' ')}</Text>
                </View>
                <View style={styles.creditsContainer}>
                    <Text style={styles.creditsValue}>{player.credits}</Text>
                    <Text style={styles.creditsLabel}>CREDITS</Text>
                </View>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressRow}>
                    <Text style={styles.xpText}>XP Progress</Text>
                    <Text style={styles.xpValue}>{player.experience_points} / {player.level * 1000} XP</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
            </View>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000000',
    letterSpacing: 0.37,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  levelValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  avatarType: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  creditsContainer: {
    alignItems: 'flex-end',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  creditsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF9500', // System Orange
  },
  creditsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
  },
  progressSection: {
    gap: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
  },
  xpValue: {
    fontSize: 13,
    color: '#8E8E93',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
});

export default GamificationHeader;