import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, withDelay } from 'react-native-reanimated';
import { Trophy, Star, Shield, Crown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getRankName } from '../services/gamification';

const { width } = Dimensions.get('window');

interface LevelUpModalProps {
  visible: boolean;
  newLevel: number;
  onClose: () => void;
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({ visible, newLevel, onClose }) => {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      scale.value = withSequence(withTiming(0, { duration: 0 }), withSpring(1, { damping: 12 }));
      rotate.value = withSequence(withTiming(-10, { duration: 0 }), withSpring(0));
      opacity.value = withTiming(1, { duration: 500 });
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [visible]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  } as any));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  } as any));

  if (!visible) return null;

  const rankName = getRankName(newLevel);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={40} tint="dark" style={styles.container}>
        <Animated.View style={[styles.card, animatedContainerStyle]}>
            
            {/* Glow Effect Background */}
            <View style={styles.glow} />

            <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
                <Trophy size={60} color="#FACC15" fill="#FACC15" />
            </Animated.View>

            <Text style={styles.title}>LEVEL UP !</Text>
            
            <View style={styles.levelRow}>
                <Text style={styles.levelText}>{newLevel}</Text>
            </View>

            <Text style={styles.rankText}>Vous êtes maintenant {rankName}</Text>
            <Text style={styles.subText}>Vos capacités augmentent. Continuez votre ascension.</Text>

            <View style={styles.rewardsContainer}>
                <View style={styles.rewardItem}>
                    <Star size={20} color="#C4B5FD" />
                    <Text style={styles.rewardText}>+ Full Energy</Text>
                </View>
                <View style={styles.rewardItem}>
                    <Shield size={20} color="#4ADE80" />
                    <Text style={styles.rewardText}>+ Nouvelles Quêtes</Text>
                </View>
            </View>

            <TouchableOpacity 
                style={styles.button} 
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onClose();
                }}
            >
                <Text style={styles.buttonText}>CONTINUER</Text>
            </TouchableOpacity>

        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: width * 0.85,
    backgroundColor: '#171717',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  glow: {
      position: 'absolute',
      top: 0,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: 'rgba(250, 204, 21, 0.1)',
      transform: [{ translateY: -50 }],
  },
  iconContainer: {
    marginBottom: 20,
    shadowColor: "#FACC15",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    fontStyle: 'italic',
    marginBottom: 10,
    letterSpacing: 2,
  },
  levelRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 10,
  },
  levelText: {
      fontSize: 60,
      fontWeight: '800',
      color: '#FACC15',
      textShadowColor: 'rgba(250, 204, 21, 0.5)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
  },
  rankText: {
      fontSize: 18,
      color: '#C4B5FD',
      fontWeight: '600',
      marginBottom: 8,
  },
  subText: {
      fontSize: 14,
      color: '#8E8E93',
      textAlign: 'center',
      marginBottom: 30,
      lineHeight: 20,
  },
  rewardsContainer: {
      flexDirection: 'row',
      gap: 15,
      marginBottom: 30,
  },
  rewardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#262626',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      gap: 6,
  },
  rewardText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  }
});

export default LevelUpModal;