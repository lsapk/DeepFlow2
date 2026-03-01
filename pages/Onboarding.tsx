
import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, TextInput, ScrollView } from 'react-native';
import Animated, { FadeInDown, SlideInRight, FadeIn, FadeOut } from 'react-native-reanimated';
import { Target, Zap, TrendingUp, ArrowRight, Fish, MountainSnow, Coffee, Brain } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';

const { width, height } = Dimensions.get('window');

interface OnboardingProps {
    onFinish: () => void;
}

const SLIDES = [
    {
        id: 1,
        title: "Éclosez\nVotre Potentiel",
        desc: "Commencez avec un œuf. Chaque tâche complétée vous apporte des crevettes pour nourrir votre pingouin.",
        icon: Fish,
        color: ['#0C4A6E', '#0EA5E9']
    },
    {
        id: 2,
        title: "Focus\nGlacial",
        desc: "Entrez dans la zone de concentration profonde. Plus vous restez focus, plus votre iceberg grandit.",
        icon: MountainSnow,
        color: ['#1E293B', '#334155']
    },
    {
        id: 3,
        title: "Devenez\nL'Empereur",
        desc: "Faites évoluer votre compagnon du stade de poussin à celui d'Empereur en dominant vos objectifs.",
        icon: TrendingUp,
        color: ['#4F46E5', '#6366F1']
    }
];

const QUESTIONS = [
    {
        id: 'goal',
        question: "Quel est votre objectif principal ?",
        options: ["Productivité brute", "Équilibre vie pro/perso", "Discipline personnelle", "Réduire la procrastination"]
    },
    {
        id: 'rhythm',
        question: "Votre moment de focus idéal ?",
        options: ["Aube polaire (Matin)", "Zénith (Midi)", "Crépuscule (Soir)", "Oiseau de nuit"]
    },
    {
        id: 'difficulty',
        question: "Niveau de défi souhaité ?",
        options: ["Balade sur la banquise (Facile)", "Exploration (Normal)", "Tempête de neige (Difficile)"]
    }
];

const Onboarding: React.FC<OnboardingProps> = ({ onFinish }) => {
    const insets = useSafeAreaInsets();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizIndex, setQuizIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentIndex < SLIDES.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setShowQuiz(true);
        }
    };

    const handleQuizAnswer = (answer: string) => {
        const currentQuestion = QUESTIONS[quizIndex];
        const newAnswers = { ...answers, [currentQuestion.id]: answer };
        setAnswers(newAnswers);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (quizIndex < QUESTIONS.length - 1) {
            setQuizIndex(quizIndex + 1);
        } else {
            saveAndFinish(newAnswers);
        }
    };

    const saveAndFinish = async (finalAnswers: any) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('user_profiles').update({
                    bio: JSON.stringify({ onboarding_quiz: finalAnswers })
                }).eq('id', user.id);
            }
        } catch (e) {
            console.error("Failed to save quiz answers", e);
        }
        onFinish();
    };

    const handleSkip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onFinish();
    };

    if (showQuiz) {
        const q = QUESTIONS[quizIndex];
        return (
            <View style={[styles.container, { backgroundColor: '#000' }]}>
                <LinearGradient colors={['#0f172a', '#000']} style={StyleSheet.absoluteFill} />
                <Animated.View entering={FadeIn} style={[styles.overlay, { paddingTop: insets.top + 60 }]}>
                    <Text style={styles.quizStep}>QUESTION {quizIndex + 1}/{QUESTIONS.length}</Text>
                    <Text style={styles.quizQuestion}>{q.question}</Text>

                    <View style={styles.optionsContainer}>
                        {q.options.map((opt, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.optionBtn}
                                onPress={() => handleQuizAnswer(opt)}
                            >
                                <Text style={styles.optionText}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>
            </View>
        );
    }

    const currentSlide = SLIDES[currentIndex];
    const Icon = currentSlide.icon;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <LinearGradient
                key={`grad-${currentIndex}`}
                colors={currentSlide.color as any}
                style={styles.background}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />
            
            <View style={[styles.overlay, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}>
                
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
                                <Text style={styles.btnText}>PERSONNALISER</Text>
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
        backgroundColor: 'rgba(0,0,0,0.3)',
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
    },
    contentContainer: {
        gap: 40,
    },
    textWrapper: {
        gap: 16,
    },
    title: {
        fontSize: 38,
        fontWeight: '900',
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 1,
        lineHeight: 42,
    },
    desc: {
        fontSize: 17,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 24,
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
    },
    btnText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 14,
    },
    // Quiz styles
    quizStep: {
        color: '#0EA5E9',
        fontWeight: '800',
        fontSize: 12,
        letterSpacing: 2,
        marginBottom: 10,
    },
    quizQuestion: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 40,
    },
    optionsContainer: {
        gap: 15,
    },
    optionBtn: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    optionText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    }
});

export default Onboarding;
