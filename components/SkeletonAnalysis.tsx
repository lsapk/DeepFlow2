import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, withRepeat, withTiming, withSequence, useAnimatedStyle } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const SkeletonItem = ({ width: w, height: h, borderRadius = 8, style }: any) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.6, { duration: 800 }),
                withTiming(0.3, { duration: 800 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return <Animated.View style={[{ width: w, height: h, backgroundColor: '#333', borderRadius }, animatedStyle, style]} />;
};

const SkeletonAnalysis = () => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SkeletonItem width={40} height={40} borderRadius={20} />
                <SkeletonItem width={120} height={24} />
                <SkeletonItem width={40} height={40} borderRadius={20} />
            </View>
            
            <View style={styles.tabs}>
                <SkeletonItem width={'30%'} height={30} borderRadius={8} />
                <SkeletonItem width={'30%'} height={30} borderRadius={8} />
                <SkeletonItem width={'30%'} height={30} borderRadius={8} />
            </View>

            <View style={styles.card}>
                <SkeletonItem width={150} height={20} style={{marginBottom: 20}} />
                <View style={{alignItems: 'center'}}>
                     <SkeletonItem width={200} height={200} borderRadius={100} />
                </View>
            </View>

            <View style={styles.card}>
                <SkeletonItem width={150} height={20} style={{marginBottom: 10}} />
                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 4}}>
                    {Array.from({length: 40}).map((_, i) => (
                        <SkeletonItem key={i} width={width / 10} height={width / 10} borderRadius={4} />
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    tabs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    card: {
        backgroundColor: '#1C1C1E',
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
    }
});

export default SkeletonAnalysis;