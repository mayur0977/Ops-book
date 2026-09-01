import { Tabs } from 'expo-router';
import { size, useTheme } from '../../src/ui';

/**
 * Home, Orders, Add, Labour, More.
 *
 * `animation: 'fade'` rather than a slide: sliding implies a spatial order
 * between tabs that does not exist, and the motion spec rules it out.
 *
 * Icons are text placeholders until the icon set lands — SF Symbols on iOS and
 * Material Symbols on Android, outlined, because filled icons fight the
 * hairline aesthetic.
 */
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        animation: 'fade',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.color.ground },
        headerTintColor: theme.color.ink,
        sceneStyle: { backgroundColor: theme.color.ground },
        tabBarActiveTintColor: theme.color.accent,
        tabBarInactiveTintColor: theme.color.ink3,
        tabBarStyle: {
          backgroundColor: theme.color.surface,
          borderTopWidth: size.hairline,
          borderTopColor: theme.color.rule,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
      <Tabs.Screen name="add" options={{ title: 'Add' }} />
      <Tabs.Screen name="labour" options={{ title: 'Labour' }} />
      <Tabs.Screen name="more" options={{ title: 'More' }} />
    </Tabs>
  );
}
