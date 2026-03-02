
import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { PenguinClimate } from '../types';
import { Cloud, Sun, Moon, Wind, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface IcebergViewProps {
    size: number;
    climate: PenguinClimate;
    children?: React.ReactNode;
}

const IcebergView: React.FC<IcebergViewProps> = ({ size, climate, children }) => {
    const isDark = climate === 'resting';

    // Ensure size is a valid number and at least 1
    const safeSize = Math.max(1, typeof size === 'number' && !isNaN(size) ? size : 1);

    // Deep Antarctic gradients
    const skyColors = isDark
        ? (['#020617', '#0f172a', '#1e293b'] as const)
        : (['#0ea5e9', '#38bdf8', '#bae6fd'] as const);

    const icebergColors = isDark
        ? (['#CBD5E1', '#64748B', '#1E293B'] as const)
        : (['#FFFFFF', '#F1F5F9', '#CBD5E1'] as const);

    const waterColors = isDark
        ? (['#1E293B', '#020617'] as const)
        : (['#0369A1', '#0C4A6E'] as const);

    const icebergWidth = width * 0.75 * (1 + (safeSize - 1) * 0.08);
    const icebergHeight = 140 * (1 + (safeSize - 1) * 0.04);

    return (
        <LinearGradient colors={skyColors} style={styles.container}>
            {/* Background Details */}
            <View style={styles.environment}>
                {isDark ? (
                    <>
                        <Moon size={40} color="#fde68a" style={styles.celestial} fill="#fde68a" />
                        <Star size={12} color="#fff" style={{ position: 'absolute', top: 40, left: 60, opacity: 0.6 }} fill="#fff" />
                        <Star size={8} color="#fff" style={{ position: 'absolute', top: 100, right: 80, opacity: 0.4 }} fill="#fff" />
                        <Star size={10} color="#fff" style={{ position: 'absolute', top: 20, left: 150, opacity: 0.5 }} fill="#fff" />
                    </>
                ) : (
                    <>
                        <Sun size={50} color="#facc15" style={styles.celestial} fill="#facc15" />
                        <View style={styles.sunGlow} />
                    </>
                )}

                <Cloud size={60} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', top: 40, left: 30 }} />
                <Cloud size={40} color="rgba(255,255,255,0.1)" style={{ position: 'absolute', top: 80, right: 50 }} />

                {/* Aurora effect for both, but more visible in dark */}
                <View style={[styles.auroraContainer, { opacity: isDark ? 0.4 : 0.1 }]}>
                    <LinearGradient
                        colors={['rgba(34, 197, 94, 0.4)', 'rgba(59, 130, 246, 0.2)', 'transparent']}
                        style={styles.aurora}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                    />
                </View>
            </View>

            {/* The Iceberg with LinearGradient for depth */}
            <View style={[styles.icebergWrapper, { width: icebergWidth, height: icebergHeight }]}>
                <LinearGradient
                    colors={icebergColors}
                    style={styles.icebergBody}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {/* Glossy highlight */}
                    <LinearGradient
                        colors={['rgba(255,255,255,0.6)', 'transparent']}
                        style={styles.glossyHighlight}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />

                    {/* Snow highlights / cracks */}
                    <View style={styles.iceDetail1} />
                    <View style={styles.iceDetail2} />

                    <View style={styles.content}>
                        {children}
                    </View>
                </LinearGradient>
                {/* Ice reflection on water line */}
                <View style={styles.iceReflect} />
            </View>

            <LinearGradient colors={waterColors} style={styles.water}>
                <View style={styles.wave} />
                <View style={[styles.wave, { top: 15, opacity: 0.3, left: -20 }]} />
            </LinearGradient>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 320,
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    environment: {
        ...StyleSheet.absoluteFillObject,
    },
    celestial: {
        position: 'absolute',
        top: 25,
        right: 35,
        zIndex: 2,
    },
    sunGlow: {
        position: 'absolute',
        top: 0,
        right: 10,
        width: 100,
        height: 100,
        backgroundColor: 'rgba(250, 204, 21, 0.15)',
        borderRadius: 50,
    },
    auroraContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 180,
    },
    aurora: {
        flex: 1,
    },
    icebergWrapper: {
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    icebergBody: {
        width: '100%',
        height: '100%',
        borderTopLeftRadius: 120,
        borderTopRightRadius: 120,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 25,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.6)',
    },
    glossyHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        opacity: 0.5,
    },
    iceDetail1: {
        position: 'absolute',
        top: 20,
        left: '20%',
        width: 2,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        transform: [{ rotate: '15deg' }],
    },
    iceDetail2: {
        position: 'absolute',
        top: 10,
        right: '25%',
        width: 40,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    iceReflect: {
        position: 'absolute',
        bottom: -5,
        width: '110%',
        height: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 5,
    },
    content: {
        alignItems: 'center',
        zIndex: 20,
    },
    water: {
        height: 70,
        width: '100%',
        zIndex: 5,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    wave: {
        position: 'absolute',
        top: 10,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
    }
});

export default IcebergView;
