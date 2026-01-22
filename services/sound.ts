import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

// Un son de "pop" très court et subtil encodé en base64 (format wav)
const SHORT_CLICK_B64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA////8AAAAA'; 
// Note: Le son ci-dessus est un placeholder silencieux pour l'exemple technique si le fichier manque, 
// dans une vraie app on utiliserait un fichier .mp3 dans assets/. 
// Pour l'instant, on se base surtout sur l'Haptique qui est plus "Pro" sur mobile.

export const playSound = async (type: 'click' | 'success' | 'delete' | 'notification') => {
    // 1. Haptique (Le ressenti physique est prioritaire pour l'effet "Pro")
    switch (type) {
        case 'click':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
        case 'success':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
        case 'delete':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
            break;
        case 'notification':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
    }

    // 2. Audio (Optionnel, à décommenter si vous ajoutez des fichiers mp3 dans assets/)
    /*
    try {
        const { sound } = await Audio.Sound.createAsync(
            type === 'success' ? require('../assets/success.mp3') : require('../assets/click.mp3')
        );
        await sound.playAsync();
    } catch (e) {
        // Ignorer silencieusement si pas de son
    }
    */
};

export const playMenuClick = () => playSound('click');
export const playSuccess = () => playSound('success');
export const playError = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
