
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Fish, Zap, Star, Shield } from 'lucide-react-native';

interface PenguinStatsProps {
    shrimp: number;
    shrimpToday: number;
    shrimpLimit: number;
    salmon: number;
    goldenFish: number;
    icebergSize: number;
}

const PenguinStats: React.FC<PenguinStatsProps> = ({ shrimp, shrimpToday, shrimpLimit, salmon, goldenFish, icebergSize }) => {
    return (
        <View style={styles.container}>
            <View style={styles.stat}>
                <Fish size={18} color="#EF4444" fill="#EF4444" />
                <View style={styles.labelContainer}>
                    <Text style={styles.value}>{shrimp}</Text>
                    <Text style={styles.limit}>{shrimpToday}/{shrimpLimit}</Text>
                </View>
                <Text style={styles.label}>Crevette</Text>
            </View>
            <View style={styles.stat}>
                <Fish size={18} color="#3B82F6" fill="#3B82F6" />
                <Text style={styles.value}>{salmon}</Text>
                <Text style={styles.label}>Saumon</Text>
            </View>
            <View style={styles.stat}>
                <Star size={18} color="#FACC15" fill="#FACC15" />
                <Text style={styles.value}>{goldenFish}</Text>
                <Text style={styles.label}>Doré</Text>
            </View>
            <View style={styles.stat}>
                <Shield size={18} color="#0EA5E9" fill="#0EA5E9" />
                <Text style={styles.value}>{icebergSize}</Text>
                <Text style={styles.label}>Iceberg</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 15,
        marginBottom: 20,
    },
    stat: {
        alignItems: 'center',
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    value: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 4,
    },
    limit: {
        fontSize: 10,
        color: '#8E8E93',
        marginLeft: 4,
    },
    label: {
        fontSize: 10,
        color: '#8E8E93',
        marginTop: 2,
    }
});

export default PenguinStats;
