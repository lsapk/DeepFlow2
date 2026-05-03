import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Brain, Send, Sparkles, TrendingUp, LayoutDashboard, History, Zap, Target, BookOpen, RefreshCw, MessageSquare } from 'lucide-react-native';
import { UserProfile, Task, Habit, Goal, FocusSession, JournalEntry, Reflection } from '../types';
import { generateActionableCoaching, generateLifeWheelAnalysis, AnalysisResult } from '../services/ai';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import Markdown from 'react-native-markdown-display';
import SkeletonAnalysis from '../components/SkeletonAnalysis';

const { width } = Dimensions.get('window');

interface AIProps {
    user: UserProfile;
    tasks: Task[];
    habits: Habit[];
    goals: Goal[];
    focusSessions: FocusSession[];
    journalEntries: JournalEntry[];
    reflections: Reflection[];
    productivityScore: number;
    isDarkMode?: boolean;
    onActionGenerated?: (action: any) => void;
}

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

const AI: React.FC<AIProps> = ({
    user, tasks, habits, goals, focusSessions, journalEntries, reflections, productivityScore, isDarkMode = true, onActionGenerated
}) => {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'CHAT' | 'ANALYSE'>('CHAT');

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: `Bonjour ${user.display_name?.split(' ')[0] || 'Voyageur'} ! Je suis DeepFlow, votre coach IA. Comment puis-je vous aider à optimiser votre journée ?`,
            sender: 'ai',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const BOTTOM_NAV_HEIGHT = 80;

    // Analysis State
    const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);

    const colors = {
        bg: isDarkMode ? '#000000' : '#F2F2F7',
        card: isDarkMode ? '#1C1C1E' : '#FFFFFF',
        text: isDarkMode ? '#FFFFFF' : '#000000',
        textSub: isDarkMode ? '#8E8E93' : '#8E8E93',
        accent: '#8B5CF6', // Purple
        accentLight: 'rgba(139, 92, 246, 0.1)',
        border: isDarkMode ? '#2C2C2E' : '#E5E5EA',
        input: isDarkMode ? '#2C2C2E' : '#F2F2F7'
    };

    useEffect(() => {
        if (activeTab === 'ANALYSE' && !analysisData) {
            runAnalysis();
        }
    }, [activeTab]);

    const runAnalysis = async () => {
        setLoadingAnalysis(true);
        const context = {
            tasks: tasks.slice(0, 20),
            habits: habits.map(h => ({ title: h.title, streak: h.streak })),
            goals: goals.map(g => ({ title: g.title, progress: g.progress })),
            journalCount: journalEntries.length,
            reflectionCount: reflections.length,
            productivityScore: productivityScore,
            recentFocus: focusSessions.slice(-5)
        };
        const result = await generateLifeWheelAnalysis(context);
        if (result) setAnalysisData(result);
        setLoadingAnalysis(false);
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: input.trim(),
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        const context = {
            tasks: tasks.filter(t => !t.completed).slice(0, 5),
            habits: habits.slice(0, 5),
            goals: goals.slice(0, 5),
            productivityScore: productivityScore
        };

        const response = await generateActionableCoaching(userMsg.text, context, false);

        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: response.text,
            sender: 'ai',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMsg]);
        setIsTyping(false);

        if (response.action && onActionGenerated) {
            onActionGenerated(response.action);
        }
    };

    const renderRadarChart = () => {
        if (!analysisData) return null;

        const size = width - 80;
        const center = size / 2;
        const radius = size * 0.4;
        const labels = ['Santé', 'Loisirs', 'Perso', 'Apprentissage', 'Mental', 'Carrière'];
        const angles = labels.map((_, i) => (i * 2 * Math.PI) / labels.length - Math.PI / 2);

        const points = analysisData.scores.map((val, i) => {
            const r = (val / 100) * radius;
            const x = center + r * Math.cos(angles[i]);
            const y = center + r * Math.sin(angles[i]);
            return `${x},${y}`;
        }).join(' ');

        return (
            <View style={styles.chartContainer}>
                <Svg width={size} height={size}>
                    <G>
                        {/* Background Polygons (Web) */}
                        {[0.2, 0.4, 0.6, 0.8, 1].map((tick, i) => {
                            const p = angles.map(a => {
                                const r = radius * tick;
                                return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`;
                            }).join(' ');
                            return (
                                <Polygon
                                    key={i}
                                    points={p}
                                    fill="none"
                                    stroke={colors.border}
                                    strokeWidth="1"
                                />
                            );
                        })}

                        {/* Axes */}
                        {angles.map((a, i) => (
                            <Line
                                key={i}
                                x1={center} y1={center}
                                x2={center + radius * Math.cos(a)}
                                y2={center + radius * Math.sin(a)}
                                stroke={colors.border}
                                strokeWidth="1"
                            />
                        ))}

                        {/* Data Polygon */}
                        <Polygon
                            points={points}
                            fill={colors.accent + '40'}
                            stroke={colors.accent}
                            strokeWidth="3"
                        />

                        {/* Labels */}
                        {labels.map((l, i) => {
                            const r = radius + 25;
                            const x = center + r * Math.cos(angles[i]);
                            const y = center + r * Math.sin(angles[i]);
                            return (
                                <SvgText
                                    key={i}
                                    x={x} y={y}
                                    fill={colors.text}
                                    fontSize="10"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    alignmentBaseline="middle"
                                >
                                    {l}
                                </SvgText>
                            );
                        })}
                    </G>
                </Svg>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Brain size={24} color={colors.accent} style={{ marginRight: 10 }} />
                    <Text style={[styles.title, { color: colors.text }]}>DeepFlow AI</Text>
                </View>

                <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'CHAT' && { backgroundColor: colors.accent }]}
                        onPress={() => setActiveTab('CHAT')}
                    >
                        <MessageSquare size={16} color={activeTab === 'CHAT' ? '#FFF' : colors.textSub} />
                        <Text style={[styles.tabText, { color: activeTab === 'CHAT' ? '#FFF' : colors.textSub }]}>Chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'ANALYSE' && { backgroundColor: colors.accent }]}
                        onPress={() => setActiveTab('ANALYSE')}
                    >
                        <TrendingUp size={16} color={activeTab === 'ANALYSE' ? '#FFF' : colors.textSub} />
                        <Text style={[styles.tabText, { color: activeTab === 'ANALYSE' ? '#FFF' : colors.textSub }]}>Analyse</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {activeTab === 'CHAT' ? (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.chatScroll}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                    >
                        {messages.map((msg) => (
                            <Animated.View
                                key={msg.id}
                                entering={FadeInDown}
                                style={[
                                    styles.messageBubble,
                                    msg.sender === 'user' ? styles.userBubble : [styles.aiBubble, { backgroundColor: colors.card }]
                                ]}
                            >
                                {msg.sender === 'ai' ? (
                                    <Markdown style={{
                                        body: { color: colors.text, fontSize: 16 },
                                        paragraph: { marginBottom: 0 }
                                    }}>
                                        {msg.text}
                                    </Markdown>
                                ) : (
                                    <Text style={styles.userText}>{msg.text}</Text>
                                )}
                            </Animated.View>
                        ))}
                        {isTyping && (
                            <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: colors.card, width: 60 }]}>
                                <ActivityIndicator size="small" color={colors.accent} />
                            </View>
                        )}
                    </ScrollView>

                    <View style={[styles.inputWrapper, { paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT }]}>
                        <BlurView intensity={30} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputBlur, { borderColor: colors.border }]}>
                            <TextInput
                                style={[styles.textInput, { color: colors.text }]}
                                placeholder="Posez une question à l'IA..."
                                placeholderTextColor={colors.textSub}
                                value={input}
                                onChangeText={setInput}
                                multiline
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, { backgroundColor: colors.accent }, !input.trim() && { opacity: 0.5 }]}
                                onPress={handleSend}
                                disabled={!input.trim() || isTyping}
                            >
                                <Send size={20} color="#FFF" />
                            </TouchableOpacity>
                        </BlurView>
                    </View>
                </KeyboardAvoidingView>
            ) : (
                <ScrollView style={styles.analysisContainer} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                    {loadingAnalysis ? (
                        <SkeletonAnalysis />
                    ) : (
                        <>
                            <Animated.View entering={FadeInDown} style={[styles.analysisCard, { backgroundColor: colors.card }]}>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Roue de la Vie</Text>
                                <Text style={[styles.cardSub, { color: colors.textSub }]}>Équilibre actuel basé sur vos activités</Text>
                                {renderRadarChart()}
                                <TouchableOpacity style={[styles.refreshBtn, { borderColor: colors.accent }]} onPress={runAnalysis}>
                                    <RefreshCw size={16} color={colors.accent} style={{ marginRight: 8 }} />
                                    <Text style={{ color: colors.accent, fontWeight: '600' }}>Actualiser l'analyse</Text>
                                </TouchableOpacity>
                            </Animated.View>

                            <View style={styles.insightGrid}>
                                <Animated.View entering={FadeInDown.delay(100)} style={[styles.insightCard, { backgroundColor: colors.card }]}>
                                    <Zap size={24} color="#FACC15" style={{ marginBottom: 10 }} />
                                    <Text style={[styles.insightTitle, { color: colors.text }]}>Productivité</Text>
                                    <Text style={[styles.insightValue, { color: colors.text }]}>{productivityScore}%</Text>
                                    <Text style={[styles.insightSub, { color: colors.textSub }]}>{analysisData?.trends.productivity || "0%"} vs période précédente</Text>
                                </Animated.View>
                                <Animated.View entering={FadeInDown.delay(200)} style={[styles.insightCard, { backgroundColor: colors.card }]}>
                                    <Target size={24} color="#EF4444" style={{ marginBottom: 10 }} />
                                    <Text style={[styles.insightTitle, { color: colors.text }]}>Objectifs</Text>
                                    <Text style={[styles.insightValue, { color: colors.text }]}>{goals.filter(g => g.completed).length}/{goals.length}</Text>
                                    <Text style={[styles.insightSub, { color: colors.textSub }]}>{analysisData?.insights.goals || "Chargement..."}</Text>
                                </Animated.View>
                            </View>

                            <Animated.View entering={FadeInDown.delay(300)} style={[styles.analysisCard, { backgroundColor: colors.card }]}>
                                <View style={styles.cardHeader}>
                                    <Sparkles size={20} color={colors.accent} style={{ marginRight: 10 }} />
                                    <Text style={[styles.cardTitle, { color: colors.text }]}>Conseil du jour</Text>
                                </View>
                                <Text style={[styles.insightText, { color: colors.textSub }]}>
                                    {analysisData?.insights.advice || "Chargement de votre conseil personnalisé..."}
                                </Text>
                            </Animated.View>
                        </>
                    )}
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingVertical: 15 },
    titleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '800' },
    tabContainer: { flexDirection: 'row', borderRadius: 12, padding: 4 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, gap: 8 },
    tabText: { fontSize: 14, fontWeight: '600' },

    // Chat
    chatScroll: { flex: 1, paddingHorizontal: 20 },
    messageBubble: { maxWidth: '85%', padding: 16, borderRadius: 20, marginBottom: 12 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: '#007AFF' },
    aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
    userText: { color: '#FFF', fontSize: 16 },
    inputWrapper: { paddingHorizontal: 20 },
    inputBlur: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
    textInput: { flex: 1, paddingHorizontal: 12, maxHeight: 100, fontSize: 16 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

    // Analysis
    analysisContainer: { flex: 1, paddingHorizontal: 20 },
    analysisCard: { borderRadius: 24, padding: 20, marginBottom: 20 },
    cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
    cardSub: { fontSize: 14, marginBottom: 20 },
    chartContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
    refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 20 },
    insightGrid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    insightCard: { flex: 1, borderRadius: 24, padding: 20 },
    insightTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    insightValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    insightSub: { fontSize: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    insightText: { fontSize: 15, lineHeight: 22 }
});

export default AI;
