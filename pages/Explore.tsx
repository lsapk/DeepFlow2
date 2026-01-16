import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Bot, Gamepad2, Sparkles, Folder, Grid, Image as ImageIcon, MessageSquarePlus } from 'lucide-react-native';

const Explore: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
            <Text style={styles.largeTitle}>Explore</Text>
      </View>
        
      {/* Search Input style ChatGPT */}
      <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
             <TextInput 
                placeholder="Rechercher" 
                placeholderTextColor="#666" 
                style={styles.searchInput}
             />
          </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.sectionLabel}>Actions Rapides</Text>
        
        <TouchableOpacity style={styles.menuItem}>
            <MessageSquarePlus size={22} color="#FFF" style={styles.menuIcon} />
            <Text style={styles.menuText}>Nouveau chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
            <ImageIcon size={22} color="#FFF" style={styles.menuIcon} />
            <Text style={styles.menuText}>Images</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
            <Grid size={22} color="#FFF" style={styles.menuIcon} />
            <Text style={styles.menuText}>Applis</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
        <Text style={styles.sectionLabel}>Cyber Knight</Text>

        <TouchableOpacity style={styles.menuItem}>
            <Gamepad2 size={22} color="#C4B5FD" style={styles.menuIcon} />
            <View>
                <Text style={[styles.menuText, {color: '#C4B5FD'}]}>Accéder au QG</Text>
                <Text style={styles.menuSubText}>Gérer l'avatar et les crédits</Text>
            </View>
        </TouchableOpacity>

        <View style={styles.spacer} />
        <Text style={styles.sectionLabel}>Projets</Text>

        <TouchableOpacity style={styles.menuItem}>
            <Folder size={22} color="#FFF" style={styles.menuIcon} />
            <Text style={styles.menuText}>Nouveau projet</Text>
        </TouchableOpacity>
        
         <TouchableOpacity style={styles.menuItem}>
            <Folder size={22} color="#FFF" style={styles.menuIcon} />
            <Text style={styles.menuText}>Développement personnel</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 10,
  },
  header: {
      paddingHorizontal: 20,
      marginBottom: 10,
      paddingTop: 10,
  },
  largeTitle: {
      fontSize: 32,
      fontWeight: '700',
      color: '#FFF',
  },
  scrollContent: {
      paddingBottom: 100,
      paddingHorizontal: 20,
  },
  searchContainer: {
      paddingHorizontal: 20,
      marginBottom: 20,
  },
  searchInputWrapper: {
      backgroundColor: '#171717',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: '#262626',
  },
  searchInput: {
      color: '#FFF',
      fontSize: 16,
  },
  sectionLabel: {
      color: '#666',
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 12,
      marginTop: 12,
  },
  menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
  },
  menuIcon: {
      marginRight: 16,
  },
  menuText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '500',
  },
  menuSubText: {
      color: '#666',
      fontSize: 13,
      marginTop: 2,
  },
  spacer: {
      height: 20,
  }
});

export default Explore;