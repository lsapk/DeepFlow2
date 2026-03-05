import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import { PenguinStage } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface PenguinAvatarProps {
  stage: PenguinStage;
  accessories?: string[];
  size?: number;
  scene?: 'thinking' | 'overwhelmed' | 'planner' | 'fitness' | 'reading' | 'working' | 'writing';
}

const STAGE_SCENE: Record<PenguinStage, NonNullable<PenguinAvatarProps['scene']>> = {
  egg: 'thinking',
  chick: 'reading',
  explorer: 'planner',
  emperor: 'working',
};

const SCENE_ACCENT: Record<NonNullable<PenguinAvatarProps['scene']>, { label: string; color: string }> = {
  thinking: { label: '💡', color: 'rgba(59,130,246,0.2)' },
  overwhelmed: { label: '⚠️', color: 'rgba(239,68,68,0.2)' },
  planner: { label: '📅', color: 'rgba(16,185,129,0.2)' },
  fitness: { label: '🏋️', color: 'rgba(234,179,8,0.2)' },
  reading: { label: '📘', color: 'rgba(99,102,241,0.2)' },
  working: { label: '💻', color: 'rgba(20,184,166,0.2)' },
  writing: { label: '✍️', color: 'rgba(168,85,247,0.2)' },
};

const PenguinAvatar: React.FC<PenguinAvatarProps> = ({ stage, size = 100, scene }) => {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.04, { duration: 2000 }), -1, true);
    translateY.value = withRepeat(withTiming(-size * 0.03, { duration: 1500 }), -1, true);
  }, [size]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  if (stage === 'egg') {
    return (
      <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
        <View style={[styles.eggWrapper, { width: size * 0.7, height: size * 0.9 }]}> 
          <LinearGradient
            colors={['#fffbeb', '#fde68a', '#f59e0b']}
            style={[styles.egg, { borderRadius: size * 0.35 }]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
          />
        </View>
      </Animated.View>
    );
  }

  const selectedScene = scene || STAGE_SCENE[stage] || 'thinking';
  const accent = SCENE_ACCENT[selectedScene];

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, animatedStyle]}>
      <View
        style={[
          styles.sceneBadge,
          {
            backgroundColor: accent.color,
            borderRadius: size * 0.16,
            width: size * 0.32,
            height: size * 0.32,
            top: size * 0.04,
            right: size * 0.02,
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.14 }}>{accent.label}</Text>
      </View>
      <Image source={require('../assets/penguin_main.png')} style={{ width: size, height: size }} resizeMode="contain" />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eggWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  egg: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#d97706',
  },
  sceneBadge: {
    position: 'absolute',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
});

export default PenguinAvatar;
