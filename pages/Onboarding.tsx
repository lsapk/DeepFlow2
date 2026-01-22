import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import Animated, { FadeInDown, FadeOutLeft, SlideInRight } from 'react-native-reanimated';
import { ChevronRight, Target, Zap, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface OnboardingProps {
    onFinish: () => void;
}

const SLIDES = [
    {
        id: 1,
        title: "Gamifiez Votre Vie",
        desc: "Transformez vos tâches quotidiennes en quêtes épiques. Gagnez de l'XP, montez de niveau et débloquez votre potentiel.",
        icon: Target,
        color: ['#4F46E5', '#9333EA']
    },
    {
        id: 2,
        title: "Focus Absolu",
        desc: "Utilisez le mode Focus immersif pour entrer dans la zone. Suivez votre chronobiologie et maximisez votre productivité.",
        icon: Zap,
        color: ['#EA580C', '#FACC15']
    },
    {
        id: 3,
        title: "Maîtrisez Votre Destin",
        desc: "Visualisez votre évolution avec des analyses détaillées. Devenez le Cyber Knight de votre propre histoire.",
        icon: TrendingUp,
        color: ['#059669', '#34D399']
    }
];

const Onboarding: React.FC<OnboardingProps> = ({ onFinish }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (currentIndex < SLIDES.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onFinish();
        }
    };

    const currentSlide = SLIDES[currentIndex];
    const Icon = currentSlide.icon;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={currentSlide.color as any}
                style={styles.background}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            
            <View style={styles.overlay}>
                <Animated.View 
                    key={`icon-${currentIndex}`}
                    entering={FadeInDown.springify()}
                    style={styles.iconContainer}
                >
                    <Icon size={80} color="#FFF" />
                </Animated.View>

                <Animated.View 
                    key={`text-${currentIndex}`}
                    entering={SlideInRight.springify()}
                    style={styles.textContainer}
                >
                    <Text style={styles.title}>{currentSlide.title}</Text>
                    <Text style={styles.desc}>{currentSlide.desc}</Text>
                </Animated.View>

                <View style={styles.footer}>
                    <View style={styles.indicators}>
                        {SLIDES.map((_, idx) => (
                            <View 
                                key={idx} 
                                style={[
                                    styles.dot, 
                                    idx === currentIndex && styles.activeDot
                                ]} 
                            />
                        ))}
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleNext} activeOpacity={0.8}>
                        <Text style={styles.btnText}>
                            {currentIndex === SLIDES.length - 1 ? "COMMENCER" : "SUIVANT"}
                        </Text>
                        <ChevronRight size={20} color="#000" />
                    </TouchableOpacity>
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
        opacity: 0.8,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'space-between',
        paddingVertical: 80,
        paddingHorizontal: 30,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: '40%',
    },
    textContainer: {
        marginBottom: 40,
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    desc: {
        fontSize: 18,
        color: '#E5E5E5',
        lineHeight: 28,
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 30,
        gap: 8,
    },
    btnText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 14,
    }
});

export default Onboarding;