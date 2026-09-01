import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useTheme } from '../src/ui/index';
// Side-effect import: NativeWind's Babel transform consumes this and there is
// nothing to bind. The rule assumes an accidental import; this one is required.
// eslint-disable-next-line import/no-unassigned-import
import '../global.css';

export default function RootLayout() {
  const theme = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Follows the system setting: workshops are dim and many of these
            phones sit in dark mode permanently. */}
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: theme.color.ground },
            headerTintColor: theme.color.ink,
            contentStyle: { backgroundColor: theme.color.ground },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'DayBook' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
