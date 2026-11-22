import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { colors, fontAssets, typography } from './src/theme';

export default function App() {
  const [loaded] = useFonts(fontAssets);
  if (!loaded) return null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[typography.display, { color: colors.text }]}>Luna</Text>
      <StatusBar style="light" />
    </View>
  );
}
