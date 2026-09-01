import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '../src/stores/session';
import { useTheme } from '../src/ui';

/**
 * The only job of the entry route is to decide where the user actually belongs,
 * once the stored session has been checked. Rendering a tab shell first and
 * redirecting after would flash signed-in content at a signed-out user.
 */
export default function Index() {
  const { status, activeBusinessId, restore } = useSession();
  const theme = useTheme();

  useEffect(() => {
    void restore();
  }, [restore]);

  if (status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.color.ground,
        }}
      >
        <ActivityIndicator color={theme.color.accent} />
      </View>
    );
  }

  if (status === 'signed-out') return <Redirect href="/(auth)/sign-in" />;
  if (!activeBusinessId) return <Redirect href="/(auth)/business" />;
  return <Redirect href="/(tabs)" />;
}
