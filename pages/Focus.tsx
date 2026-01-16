import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Play, Pause, RotateCcw, X } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');
// Ajustement pour être sûr que ça rentre sur tous les écrans
const CIRCLE_SIZE = Math.min(width * 0.75, 300); 
const STROKE_WIDTH = 15;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface FocusProps {
    onExit: () => void;
}

const Focus: React.FC<FocusProps> = ({ onExit }) => {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [sessionType, setSessionType] = useState<'FOCUS' | 'BREAK'>('FOCUS');
  const [sessionDuration, setSessionDuration] = useState(25);

  useEffect(() => {
    let interval: number | undefined;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
        setIsActive(false);
        saveSession();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const saveSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && sessionType === 'FOCUS') {
          await supabase.from('focus_sessions').insert({
              user_id: user.id,
              duration: sessionDuration,
              completed_at: new Date().toISOString(),
              session_type: 'focus'
          });
      }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(sessionType === 'FOCUS' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalTime = sessionType === 'FOCUS' ? 25 * 60 : 5 * 60;
  const progress = 1 - (timeLeft / totalTime);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  
  const activeColor = sessionType === 'FOCUS' ? '#FFFFFF' : '#30B0C7'; 

  return (
    <View style={styles.container}>
        <View style={styles.header}>
             <TouchableOpacity onPress={onExit} style={styles.exitButton}>
                <X size={24} color="white" />
             </TouchableOpacity>
        </View>

        <View style={styles.content}>
            <View style={styles.timerContainer}>
                <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svg}>
                    <Circle
                        cx={CIRCLE_SIZE / 2}
                        cy={CIRCLE_SIZE / 2}
                        r={RADIUS}
                        stroke="#1C1C1E"
                        strokeWidth={STROKE_WIDTH}
                        fill="transparent"
                    />
                    <Circle
                        cx={CIRCLE_SIZE / 2}
                        cy={CIRCLE_SIZE / 2}
                        r={RADIUS}
                        stroke={activeColor}
                        strokeWidth={STROKE_WIDTH}
                        fill="transparent"
                        strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                    />
                </Svg>
                
                <View style={styles.timerTextContainer}>
                    <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
                    <Text style={[styles.statusText, { color: activeColor }]}>
                        {sessionType}
                    </Text>
                </View>
            </View>

            <View style={styles.controls}>
                <TouchableOpacity onPress={resetTimer} style={styles.controlBtnSecondary}>
                    <RotateCcw size={24} color="#8E8E93" />
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleTimer} style={[styles.playBtn, { backgroundColor: activeColor }]}>
                    {isActive ? <Pause size={32} color="black" fill="black" /> : <Play size={32} color="black" fill="black" style={{ marginLeft: 4 }} />}
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => {
                        const newType = sessionType === 'FOCUS' ? 'BREAK' : 'FOCUS';
                        setSessionType(newType);
                        setIsActive(false);
                        setTimeLeft(newType === 'FOCUS' ? 25 * 60 : 5 * 60);
                    }}
                    style={styles.controlBtnSecondary}
                >
                    <Text style={styles.typeSwitchText}>
                        {sessionType === 'FOCUS' ? 'Break' : 'Focus'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
    height: 60,
    justifyContent: 'center',
  },
  exitButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  timerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  },
  svg: {
    position: 'absolute',
  },
  timerTextContainer: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 60,
    fontWeight: '300',
    color: 'white',
    fontVariant: ['tabular-nums'],
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
  controlBtnSecondary: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeSwitchText: {
      color: '#8E8E93',
      fontWeight: '600',
      fontSize: 12,
  }
});

export default Focus;