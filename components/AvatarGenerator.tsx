
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop, Rect, Ellipse } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { AvatarConfig } from '../types';

interface AvatarGeneratorProps {
    config?: AvatarConfig | any; // Any pour gérer le JSON brut de Supabase
    size?: number;
    showGlow?: boolean;
}

const AvatarGenerator: React.FC<AvatarGeneratorProps> = ({ config, size = 120, showGlow = true }) => {
    // Valeurs par défaut sécurisées si la config est vide ou mal formée
    const safeConfig = config || {};
    const helmet = safeConfig.helmet || 'standard';
    const armor = safeConfig.armor || 'standard';
    // Mapping DB (glow_color) vs App (color)
    const primaryColor = safeConfig.color || safeConfig.glow_color || '#C4B5FD';

    // Animations
    const hover = useSharedValue(0);
    const pulse = useSharedValue(1);

    useEffect(() => {
        hover.value = withRepeat(
            withSequence(
                withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 2000 }),
                withTiming(1, { duration: 2000 })
            ),
            -1,
            true
        );
    }, []);

    const floatStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: hover.value }]
    }));

    const glowStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        opacity: 0.6
    }));

    // Couleurs du corps selon l'armure
    const bodyColor = armor === 'stealth' ? '#333' : armor === 'heavy' ? '#555' : '#E0E7FF';

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Background Glow */}
            {showGlow && (
                <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
                    <Svg height={size} width={size} viewBox="0 0 100 100">
                        <Defs>
                            <RadialGradient id="grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                                <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.5" />
                                <Stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
                            </RadialGradient>
                        </Defs>
                        <Circle cx="50" cy="50" r="45" fill="url(#grad)" />
                    </Svg>
                </Animated.View>
            )}

            {/* Robot Floating */}
            <Animated.View style={[styles.centered, floatStyle, { width: size, height: size }]}>
                <Svg height={size} width={size} viewBox="0 0 100 100">
                    {/* Shadow */}
                    <Ellipse cx="50" cy="90" rx="20" ry="5" fill="#000" opacity="0.3" />

                    {/* Antenna */}
                    <Path d="M50 25 L50 15" stroke={primaryColor} strokeWidth="2" />
                    <Circle cx="50" cy="15" r="3" fill={primaryColor} />

                    {/* Head */}
                    <Rect x="25" y="25" width="50" height="40" rx="10" fill={bodyColor} stroke={primaryColor} strokeWidth="2" />
                    
                    {/* Face Screen */}
                    <Rect x="30" y="32" width="40" height="26" rx="6" fill="#111" />

                    {/* Eyes */}
                    <Circle cx="40" cy="45" r="5" fill={primaryColor} />
                    <Circle cx="60" cy="45" r="5" fill={primaryColor} />

                    {/* Accessories */}
                    {helmet === 'crown' && (
                        <Path d="M30 25 L30 10 L40 20 L50 5 L60 20 L70 10 L70 25 Z" fill="#FACC15" stroke="#EAB308" strokeWidth="1" />
                    )}
                    {helmet === 'halo' && (
                        <Ellipse cx="50" cy="18" rx="25" ry="3" fill="none" stroke="#FACC15" strokeWidth="2" />
                    )}
                    {helmet === 'visor' && (
                        <Rect x="30" y="40" width="40" height="10" fill={primaryColor} opacity="0.7" />
                    )}

                    {/* Body */}
                    <Path d="M30 65 L20 85 L80 85 L70 65 Z" fill={bodyColor} stroke={primaryColor} strokeWidth="2" />
                    
                    {/* Core Light */}
                    {armor === 'energy' && (
                        <Circle cx="50" cy="75" r="6" fill={primaryColor} opacity="0.9" />
                    )}
                </Svg>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default AvatarGenerator;
