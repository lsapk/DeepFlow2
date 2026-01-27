
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, RadialGradient, Stop, G } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { AvatarConfig } from '../types';
import { Shield, Zap, Brain, Ghost, Crosshair, Crown, Eye, Hexagon } from 'lucide-react-native';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedG = Animated.createAnimatedComponent(G);

interface AvatarGeneratorProps {
    config: AvatarConfig;
    size?: number;
    showGlow?: boolean;
}

const AvatarGenerator: React.FC<AvatarGeneratorProps> = ({ config, size = 120, showGlow = true }) => {
    const { class: avatarClass, helmet, armor, color } = config;

    // Animations
    const rotate = useSharedValue(0);
    const pulse = useSharedValue(1);

    useEffect(() => {
        rotate.value = withRepeat(
            withTiming(360, { duration: 8000, easing: Easing.linear }),
            -1
        );
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 1500 }),
                withTiming(1, { duration: 1500 })
            ),
            -1,
            true
        );
    }, []);

    const rotationStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotate.value}deg` }]
    }));

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }]
    }));

    // Class Icon Logic
    const getIcon = () => {
        const iconSize = size * 0.4;
        const iconColor = "#FFF"; // Inner icon always white for contrast against neon
        switch (avatarClass) {
            case 'cyber_knight': return <Shield size={iconSize} color={iconColor} strokeWidth={2.5} />;
            case 'neon_hacker': return <Hexagon size={iconSize} color={iconColor} strokeWidth={2.5} />;
            case 'quantum_warrior': return <Zap size={iconSize} color={iconColor} strokeWidth={2.5} fill={iconColor} />;
            case 'shadow_ninja': return <Ghost size={iconSize} color={iconColor} strokeWidth={2.5} />;
            case 'cosmic_sage': return <Brain size={iconSize} color={iconColor} strokeWidth={2.5} />;
            default: return <Shield size={iconSize} color={iconColor} />;
        }
    };

    // Helmet Decoration Logic (simplified visual overlay)
    const getHelmetDeco = () => {
        if (helmet === 'crown') return <Crown size={size*0.2} color={color} style={{position: 'absolute', top: size*0.15}} />;
        if (helmet === 'halo') return <View style={[styles.halo, {borderColor: color, width: size*0.6, height: 10, top: size*0.2}]} />;
        if (helmet === 'visor') return <View style={[styles.visor, {backgroundColor: color, width: size*0.3, top: size*0.45}]} />;
        return null;
    };

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Background Glow */}
            {showGlow && (
                <AnimatedG style={[StyleSheet.absoluteFill, pulseStyle, { opacity: 0.5 }]}>
                    <Svg height={size} width={size}>
                        <Defs>
                            <RadialGradient id="grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                                <Stop offset="0%" stopColor={color} stopOpacity="0.6" />
                                <Stop offset="100%" stopColor={color} stopOpacity="0" />
                            </RadialGradient>
                        </Defs>
                        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#grad)" />
                    </Svg>
                </AnimatedG>
            )}

            {/* Rotating Rings */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.centered, rotationStyle]}>
                <Svg height={size} width={size}>
                    <Circle 
                        cx={size / 2} cy={size / 2} r={(size / 2) - 5} 
                        stroke={color} strokeWidth={2} strokeDasharray="10, 5" strokeOpacity={0.8}
                        fill="transparent"
                    />
                    {armor === 'heavy' && (
                        <Circle 
                            cx={size / 2} cy={size / 2} r={(size / 2) - 12} 
                            stroke={color} strokeWidth={4} strokeDasharray="20, 20" strokeOpacity={0.6}
                            fill="transparent"
                        />
                    )}
                </Svg>
            </Animated.View>

            {/* Inner Core */}
            <View style={[styles.innerCircle, { width: size * 0.7, height: size * 0.7, backgroundColor: `${color}44`, borderColor: color }]}>
                {getIcon()}
            </View>

            {/* Accessories */}
            {getHelmetDeco()}
            
            {/* Armor Indicator (Visual Dot) */}
            {armor === 'stealth' && <View style={[styles.stealthDot, { backgroundColor: color, bottom: 5 }]} />}
            {armor === 'energy' && (
                <Animated.View style={[StyleSheet.absoluteFill, pulseStyle]}>
                     <Svg height={size} width={size} style={{position: 'absolute'}}>
                        <Circle cx={size/2} cy={size/2} r={size/2} stroke={color} strokeWidth={1} opacity={0.3} />
                     </Svg>
                </Animated.View>
            )}

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
    },
    innerCircle: {
        borderRadius: 999,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        zIndex: 10,
    },
    halo: {
        position: 'absolute',
        borderWidth: 2,
        borderRadius: 50,
        zIndex: 20,
    },
    visor: {
        position: 'absolute',
        height: 4,
        zIndex: 20,
        borderRadius: 2,
    },
    stealthDot: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
        zIndex: 20,
    }
});

export default AvatarGenerator;
