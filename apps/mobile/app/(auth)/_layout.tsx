import { Stack } from 'expo-router';
import { useTheme } from '../../src/ui';

export default function AuthLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.color.ground },
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="business" />
    </Stack>
  );
}
