import 'react-native-gesture-handler'; // DOIT ÊTRE EN PREMIER
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent garantit que l'environnement est correctement configuré 
// que ce soit pour Expo Go ou pour une build native de production.
// Cela remplace AppRegistry.registerComponent de manière plus robuste pour Expo.
registerRootComponent(App);