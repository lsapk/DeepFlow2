import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  progress: number; // 0 to 1
  size: number;
  strokeWidth: number;
  color: string;
  label: string;
  value: string | number;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ progress, size, strokeWidth, color, label, value }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Circle
            stroke="#2C2C2C" // Dark grey track
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <Circle
            stroke={color}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.innerContent}>
            <Text style={styles.value}>{value}</Text>
             {label ? <Text style={styles.label}>{label}</Text> : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  innerContent: {
      alignItems: 'center',
      justifyContent: 'center',
  },
  label: {
      fontSize: 10,
      color: '#8E8E93',
      marginTop: 2,
      fontWeight: '600',
  },
  value: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
  }
});

export default ProgressRing;