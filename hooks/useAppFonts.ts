import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { useFonts } from 'expo-font';

/**
 * Las fuentes viajan dentro del bundle (no se descargan en runtime), así que
 * la espera real es de milisegundos. Si la carga falla se devuelve `true`
 * igual: los `fontFamily` sin registrar caen al tipo del sistema y la app
 * sigue siendo usable.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    PlayfairDisplay_700Bold,
  });

  return loaded || error !== null;
}
