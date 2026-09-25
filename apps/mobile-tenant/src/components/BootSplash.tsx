import { Image, StyleSheet, View } from 'react-native';

const logo = require('../assets/eveider_logo.png');

/** Matches native expo-splash-screen while JS finishes booting. */
export function BootSplash() {
  return (
    <View style={styles.root} accessibilityLabel="Eveider">
      <Image source={logo} style={styles.logo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 200,
    height: 80,
  },
});
