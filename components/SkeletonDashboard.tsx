import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, withRepeat, withTiming, withSequence, useAnimatedStyle } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const SkeletonItem = ({ width: w, height: h, borderRadius = 8, style }: any) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 1000 }),
                withTiming(0.3, { duration: 1000 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[{ width: w, height: h, backgroundColor: '#333', borderRadius }, animatedStyle, style]} />
    );
};

const SkeletonDashboard = () => {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <SkeletonItem width={40} height={40} borderRadius={20} />
                <View style={{alignItems: 'center'}}>
                    <SkeletonItem width={100} height={14} style={{marginBottom: 6}} />
                    <SkeletonItem width={160} height={24} />
                </View>
                <SkeletonItem width={40} height={40} borderRadius={20} />
            </View>

            {/* Score Card */}
            <View style={styles.card}>
                <View>
                    <SkeletonItem width={80} height={12} style={{marginBottom: 8}} />
                    <SkeletonItem width={120} height={24} />
                </View>
                <SkeletonItem width={56} height={56} borderRadius={28} />
            </View>

            {/* Habits Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <SkeletonItem width={100} height={20} />
                    <SkeletonItem width={60} height={16} />
                </View>
                <View style={styles.row}>
                    <SkeletonItem width={120} height={120} borderRadius={20} style={{marginRight: 12}} />
                    <SkeletonItem width={120} height={120} borderRadius={20} style={{marginRight: 12}} />
                    <SkeletonItem width={60} height={120} borderRadius={20} />
                </View>
            </View>

            {/* Tasks Section */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <SkeletonItem width={140} height={20} />
                    <SkeletonItem width={60} height={16} />
                </View>
                <View style={styles.taskCard}>
                    <View style={styles.taskRow}>
                        <SkeletonItem width={24} height={24} borderRadius={12} style={{marginRight: 16}} />
                        <SkeletonItem width={'70%'} height={16} />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.taskRow}>
                        <SkeletonItem width={24} height={24} borderRadius={12} style={{marginRight: 16}} />
                        <SkeletonItem width={'50%'} height={16} />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.taskRow}>
                        <SkeletonItem width={24} height={24} borderRadius={12} style={{marginRight: 16}} />
                        <SkeletonItem width={'60%'} height={16} />
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60, // Approx status bar + padding
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    card: {
        backgroundColor: '#1C1C1E',
        padding: 20,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        height: 100,
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
    },
    taskCard: {
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        padding: 16,
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: 8,
        marginLeft: 40,
    }
});

export default SkeletonDashboard;