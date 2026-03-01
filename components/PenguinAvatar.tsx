
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { PenguinStage } from '../types';
import { Circle, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PenguinAvatarProps {
    stage: PenguinStage;
    accessories?: string[];
    size?: number;
}

const PenguinAvatar: React.FC<PenguinAvatarProps> = ({ stage, accessories = [], size = 100 }) => {

    const renderEgg = () => (
        <View style={[styles.eggWrapper, { width: size * 0.7, height: size * 0.9 }]}>
            <LinearGradient
                colors={['#fffbeb', '#fde68a', '#f59e0b']}
                style={[styles.egg, { borderRadius: size * 0.35 }]}
                start={{ x: 0.3, y: 0 }}
                end={{ x: 0.7, y: 1 }}
            />
            {/* Specular highlight */}
            <View style={[styles.highlight, { top: '15%', left: '25%', width: size * 0.1, height: size * 0.15, borderRadius: size * 0.05 }]} />
            {/* Small crack if close to hatching? Maybe later */}
        </View>
    );

    const renderChick = () => (
        <View style={[styles.penguinContainer, { width: size, height: size }]}>
            {/* Body */}
            <LinearGradient
                colors={['#f3f4f6', '#d1d5db', '#9ca3af']}
                style={[styles.body, { width: size * 0.75, height: size * 0.75, borderRadius: size * 0.35, bottom: 0 }]}
            />
            {/* Face/Head */}
            <View style={[styles.head, { width: size * 0.45, height: size * 0.45, borderRadius: size * 0.22, top: 0, backgroundColor: '#d1d5db' }]}>
                {/* Eyes */}
                <View style={[styles.eye, { left: '20%', top: '35%' }]} />
                <View style={[styles.eye, { right: '20%', top: '35%' }]} />
                {/* Beak */}
                <View style={[styles.beak, { top: '50%', backgroundColor: '#fb923c', width: size * 0.1, height: size * 0.08 }]} />
            </View>
        </View>
    );

    const renderExplorer = () => (
        <View style={[styles.penguinContainer, { width: size, height: size }]}>
            {/* Wings */}
            <View style={[styles.wing, { left: -size * 0.1, transform: [{ rotate: '-20deg' }] }]} />
            <View style={[styles.wing, { right: -size * 0.1, transform: [{ rotate: '20deg' }] }]} />

            {/* Body */}
            <LinearGradient
                colors={['#4b5563', '#1f2937', '#111827']}
                style={[styles.body, { width: size * 0.85, height: size * 0.95, borderRadius: size * 0.4, bottom: 0 }]}
            />
            {/* White Belly */}
            <LinearGradient
                colors={['#ffffff', '#f3f4f6', '#e5e7eb']}
                style={[styles.belly, { width: size * 0.55, height: size * 0.7, borderRadius: size * 0.25, bottom: size * 0.05 }]}
            />
            {/* Face */}
            <View style={[styles.head, { width: size * 0.5, height: size * 0.45, borderRadius: size * 0.2, top: 0, backgroundColor: '#1f2937' }]}>
                {/* Face mask (white) */}
                <View style={[styles.faceMask, { width: '80%', height: '70%', bottom: 0 }]} />
                <View style={[styles.eye, { left: '25%', top: '40%', backgroundColor: '#000' }]} />
                <View style={[styles.eye, { right: '25%', top: '40%', backgroundColor: '#000' }]} />
                <View style={[styles.beak, { top: '55%', backgroundColor: '#facc15', width: size * 0.12, height: size * 0.1 }]} />
            </View>
        </View>
    );

    const renderEmperor = () => (
        <View style={[styles.penguinContainer, { width: size, height: size * 1.1 }]}>
            {/* Wings */}
            <View style={[styles.wing, { left: -size * 0.15, height: size * 0.6, width: size * 0.2, backgroundColor: '#0f172a' }]} />
            <View style={[styles.wing, { right: -size * 0.15, height: size * 0.6, width: size * 0.2, backgroundColor: '#0f172a' }]} />

            {/* Body */}
            <LinearGradient
                colors={['#1e293b', '#0f172a', '#020617']}
                style={[styles.body, { width: size * 0.9, height: size * 1.1, borderRadius: size * 0.4, bottom: 0 }]}
            />
            {/* Golden Neck gradient */}
            <LinearGradient
                colors={['#fbbf24', '#f59e0b', 'transparent']}
                style={{ position: 'absolute', top: size * 0.1, width: size * 0.8, height: size * 0.3, borderRadius: size * 0.4 }}
            />
            {/* White Belly */}
            <LinearGradient
                colors={['#ffffff', '#f8fafc', '#f1f5f9']}
                style={[styles.belly, { width: size * 0.65, height: size * 0.85, borderRadius: size * 0.3, bottom: size * 0.05 }]}
            />
            {/* Face */}
            <View style={[styles.head, { width: size * 0.55, height: size * 0.5, borderRadius: size * 0.25, top: 0, backgroundColor: '#0f172a' }]}>
                <View style={[styles.faceMask, { width: '85%', height: '75%', bottom: 0 }]} />
                <View style={[styles.eye, { left: '25%', top: '45%', backgroundColor: '#000' }]} />
                <View style={[styles.eye, { right: '25%', top: '45%', backgroundColor: '#000' }]} />
                <View style={[styles.beak, { top: '60%', backgroundColor: '#ea580c', width: size * 0.14, height: size * 0.12 }]} />
            </View>

            {/* Scarf Accessory if equipped or just as emperor bonus */}
            <View style={[styles.scarf, { width: size * 0.8, top: '35%', backgroundColor: '#ef4444' }]} />
        </View>
    );

    const renderDefault = () => (
        <View style={[styles.container, { width: size, height: size }]}>
            <User size={size * 0.8} color="#94a3b8" />
        </View>
    );

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {stage === 'egg' && renderEgg()}
            {stage === 'chick' && renderChick()}
            {stage === 'explorer' && renderExplorer()}
            {stage === 'emperor' && renderEmperor()}
            {!['egg', 'chick', 'explorer', 'emperor'].includes(stage) && renderDefault()}
        </View>
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
    highlight: {
        position: 'absolute',
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    penguinContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {
        position: 'absolute',
    },
    belly: {
        position: 'absolute',
        zIndex: 2,
    },
    head: {
        position: 'absolute',
        alignItems: 'center',
        zIndex: 5,
    },
    eye: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#374151',
    },
    beak: {
        position: 'absolute',
        borderRadius: 4,
        transform: [{ rotate: '45deg' }],
    },
    faceMask: {
        position: 'absolute',
        backgroundColor: '#fff',
        borderRadius: 15,
    },
    wing: {
        position: 'absolute',
        width: '20%',
        height: '50%',
        backgroundColor: '#374151',
        borderRadius: 20,
        zIndex: -1,
    },
    scarf: {
        position: 'absolute',
        height: '8%',
        borderRadius: 10,
        zIndex: 10,
        borderBottomWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
    }
});

export default PenguinAvatar;
