
import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { PenguinClimate } from '../types';
import { Cloud, Sun, Moon, Wind } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface IcebergViewProps {
    size: number;
    climate: PenguinClimate;
    children?: React.ReactNode;
}

const IcebergView: React.FC<IcebergViewProps> = ({ size, climate, children }) => {
    const isDark = climate === 'resting';

    // Background colors based on climate
    const bgColors = isDark
        ? (['#0F172A', '#1E293B'] as const)
        : (['#0C4A6E', '#0EA5E9'] as const);

    return (
        <LinearGradient colors={bgColors} style={styles.container}>
            {/* Environment Elements */}
            <View style={styles.environment}>
                {isDark ? (
                    <Moon size={40} color="#FDE68A" style={styles.celestial} />
                ) : (
                    <Sun size={50} color="#FACC15" style={styles.celestial} />
                )}

                <Cloud size={60} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', top: 40, left: 30 }} />
                <Cloud size={40} color="rgba(255,255,255,0.1)" style={{ position: 'absolute', top: 80, right: 50 }} />

                {!isDark && (
                    <View style={styles.auroraContainer}>
                        <LinearGradient
                            colors={['rgba(34, 197, 94, 0.2)', 'rgba(59, 130, 246, 0.2)', 'transparent']}
                            style={styles.aurora}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                        />
                    </View>
                )}
            </View>

            {/* The Iceberg */}
            <View style={[styles.iceberg, {
                width: width * 0.7 * (1 + (size - 1) * 0.1),
                height: 120 * (1 + (size - 1) * 0.05),
                backgroundColor: isDark ? '#94A3B8' : '#F8FAFC'
            }]}>
                <View style={styles.content}>
                    {children}
                </View>
            </View>

            <View style={[styles.water, { backgroundColor: isDark ? '#1E293B' : '#075985' }]} />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 300,
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: 20,
        marginBottom: 20,
    },
    environment: {
        ...StyleSheet.absoluteFillObject,
    },
    celestial: {
        position: 'absolute',
        top: 20,
        right: 30,
    },
    auroraContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 150,
    },
    aurora: {
        flex: 1,
    },
    iceberg: {
        zIndex: 10,
        borderTopLeftRadius: 100,
        borderTopRightRadius: 100,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    content: {
        position: 'absolute',
        bottom: 20,
        alignItems: 'center',
    },
    water: {
        height: 60,
        width: '100%',
        zIndex: 5,
    }
});

export default IcebergView;
