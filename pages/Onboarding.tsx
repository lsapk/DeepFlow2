import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar } from 'react-native';
import Animated, { FadeInDown, SlideInRight, FadeOut } from 'react-native-reanimated';
import { ChevronRight, Target, Zap, TrendingUp, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface OnboardingProps {
    onFinish: () => void;
}

const SLIDES = [
    {
        id: 1,
        title: "Gamifiez\nVotre Vie",
        desc: "Transformez vos tâches en quêtes. Gagnez de l'XP et montez de niveau à chaque réussite.",
        icon: Target,
        color: ['#4F46E5', '#9333EA']
    },
    {
        id: 2,
        title: "Focus\nImmersif",
        desc: "Entrez dans la zone avec un minuteur adapté à votre chronobiologie.",
        icon: Zap,
        color: ['#EA580C', '#FACC15']
    },
    {
        id: 3,
        title: "Devenez\nLégendaire",
        desc: "Analysez vos données, débloquez des avatars Cyber Knight et maîtrisez votre destin.",
        icon: TrendingUp,
        color: ['#059669', '#34D399']
    }
];

const Onboarding: React.FC<OnboardingProps> = ({ onFinish }) => {
    const insets = useSafeAreaInsets();
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentIndex < SLIDES.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onFinish();
        }
    };

    const handleSkip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onFinish();
    };

    const currentSlide = SLIDES[currentIndex];
    const Icon = currentSlide.icon;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Background avec transition fluide simulée par key */}
            <LinearGradient
                key={`grad-${currentIndex}`}
                colors={currentSlide.color as any}
                style={styles.background}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            
            <View style={[styles.overlay, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}>
                
                {/* Bouton Passer */}
                <TouchableOpacity 
                    style={styles.skipButton} 
                    onPress={handleSkip}
                    activeOpacity={0.7}
                >
                    <Text style={styles.skipText}>Passer</Text>
                </TouchableOpacity>

                <Animated.View 
                    key={`icon-${currentIndex}`}
                    entering={FadeInDown.springify().damping(12)}
                    style={styles.iconContainer}
                >
                    <View style={styles.iconCircle}>
                        <Icon size={64} color="#FFF" />
                    </View>
                </Animated.View>

                <View style={styles.contentContainer}>
                    <Animated.View 
                        key={`text-${currentIndex}`}
                        entering={SlideInRight.springify().damping(14)}
                        style={styles.textWrapper}
                    >
                        <Text style={styles.title}>{currentSlide.title}</Text>
                        <Text style={styles.desc}>{currentSlide.desc}</Text>
                    </Animated.View>

                    <View style={styles.footer}>
                        <View style={styles.indicators}>
                            {SLIDES.map((_, idx) => (
                                <Animated.View 
                                    key={idx} 
                                    style={[
                                        styles.dot, 
                                        idx === currentIndex ? styles.activeDot : null
                                    ]} 
                                />
                            ))}
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.8}>
                            {currentIndex === SLIDES.length - 1 ? (
                                <Text style={styles.btnText}>C'EST PARTI</Text>
                            ) : (
                                <ArrowRight size={24} color="#000" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    background: {
        position: 'absolute',
        width: width,
        height: height,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)', // Léger assombrissement pour lisibilité
        justifyContent: 'space-between',
        paddingHorizontal: 30,
    },
    skipButton: {
        alignSelf: 'flex-end',
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    skipText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    iconContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    contentContainer: {
        gap: 40,
    },
    textWrapper: {
        gap: 16,
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 1,
        lineHeight: 44,
    },
    desc: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 26,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    indicators: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    activeDot: {
        width: 24,
        backgroundColor: '#FFF',
    },
    button: {
        height: 60,
        minWidth: 60,
        backgroundColor: '#FFF',
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    btnText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 16,
    }
});

export default Onboarding;