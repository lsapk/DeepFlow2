import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Journal from './Journal';
import ReflectionPage from './Reflection';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme';
import { PageContainer } from '../components/PageContainer';

interface IntrospectionProps {
    userId: string;
    openMenu: () => void;
    isDarkMode?: boolean;
    deleteJournalEntry?: (id: string) => void;
    deleteReflection?: (id: string) => void;
}

const Introspection: React.FC<IntrospectionProps> = (props) => {
    const [view, setView] = useState<'JOURNAL' | 'REFLECTION'>('JOURNAL');
    const { isDarkMode } = props;
    const insets = useSafeAreaInsets();

    const colors = {
        ...Theme.colors,
        bg: Theme.colors.background,
        segmentBg: 'rgba(255,255,255,0.1)',
        segmentActive: 'rgba(255,255,255,0.2)',
    };

    return (
        <PageContainer style={[styles.container, { paddingTop: insets.top + 10 }]}>
            <View style={styles.segmentContainer}>
                <View style={[styles.segment, { backgroundColor: colors.segmentBg }]}>
                    <TouchableOpacity 
                        style={[styles.segmentBtn, view === 'JOURNAL' && { backgroundColor: colors.segmentActive }]} 
                        onPress={() => setView('JOURNAL')}
                        activeOpacity={1}
                    >
                        <Text style={[styles.segmentText, { color: colors.text, fontWeight: view === 'JOURNAL' ? '700' : '500' }]}>Journal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.segmentBtn, view === 'REFLECTION' && { backgroundColor: colors.segmentActive }]} 
                        onPress={() => setView('REFLECTION')}
                        activeOpacity={1}
                    >
                        <Text style={[styles.segmentText, { color: colors.text, fontWeight: view === 'REFLECTION' ? '700' : '500' }]}>Réflexion</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{flex: 1}}>
                {view === 'JOURNAL' ? (
                    <Journal 
                        userId={props.userId} 
                        openMenu={props.openMenu} 
                        isDarkMode={props.isDarkMode}
                        noPadding={true}
                        deleteEntry={props.deleteJournalEntry}
                    />
                ) : (
                    <ReflectionPage 
                        userId={props.userId} 
                        openMenu={props.openMenu} 
                        isDarkMode={props.isDarkMode}
                        noPadding={true}
                        deleteReflection={props.deleteReflection}
                    />
                )}
            </View>
        </PageContainer>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    segmentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    segment: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 12,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    segmentText: {
        fontSize: 13,
    }
});

export default Introspection;