
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { PenguinStage } from '../types';
import { Circle, User } from 'lucide-react-native';

interface PenguinAvatarProps {
    stage: PenguinStage;
    accessories?: string[];
    size?: number;
}

const PenguinAvatar: React.FC<PenguinAvatarProps> = ({ stage, accessories = [], size = 100 }) => {
    // In a real app with assets, we'd use Image or SVG.
    // For now, let's use Lucide icons or simple shapes as placeholders.

    const renderPenguin = () => {
        switch (stage) {
            case 'egg':
                return (
                    <View style={[styles.egg, { width: size * 0.6, height: size * 0.8, borderRadius: size * 0.3 }]} />
                );
            case 'chick':
                return (
                    <View style={styles.chickContainer}>
                        <View style={[styles.body, { width: size * 0.7, height: size * 0.7, borderRadius: size * 0.35, backgroundColor: '#D1D5DB' }]} />
                        <View style={[styles.head, { width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2, top: -size * 0.1, backgroundColor: '#D1D5DB' }]} />
                    </View>
                );
            case 'explorer':
                return (
                    <View style={styles.explorerContainer}>
                        <View style={[styles.body, { width: size * 0.8, height: size * 0.9, borderRadius: size * 0.4, backgroundColor: '#374151' }]} />
                        <View style={[styles.belly, { width: size * 0.5, height: size * 0.6, borderRadius: size * 0.25, backgroundColor: '#F9FAFB' }]} />
                    </View>
                );
            case 'emperor':
                return (
                    <View style={styles.emperorContainer}>
                        <View style={[styles.body, { width: size * 0.9, height: size * 1.1, borderRadius: size * 0.45, backgroundColor: '#111827' }]} />
                        <View style={[styles.belly, { width: size * 0.6, height: size * 0.8, borderRadius: size * 0.3, backgroundColor: '#F9FAFB' }]} />
                        <View style={[styles.scarf, { width: size * 0.9, height: size * 0.15, backgroundColor: '#EF4444' }]} />
                    </View>
                );
            default:
                return <User size={size} color="#FFF" />;
        }
    };

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {renderPenguin()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    egg: {
        backgroundColor: '#FDE68A',
        borderWidth: 2,
        borderColor: '#F59E0B',
    },
    chickContainer: {
        alignItems: 'center',
    },
    explorerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    emperorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {
        position: 'absolute',
    },
    belly: {
        position: 'absolute',
    },
    head: {
        position: 'absolute',
    },
    scarf: {
        position: 'absolute',
        top: '30%',
        borderRadius: 5,
    }
});

export default PenguinAvatar;
