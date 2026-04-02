import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

const PenguinAvatar: React.FC = () => {
  return (
    <View style={styles.container}>
      <Image source={require('../assets/penguin_main.png')} style={styles.image} resizeMode="contain" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
  image: {
    width: '100%',
    height: '100%',
  }
});

export default PenguinAvatar;
