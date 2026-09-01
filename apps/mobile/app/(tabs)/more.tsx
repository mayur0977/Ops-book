import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useActiveMembership, useSession } from '../../src/stores/session';
import { Button, Row, SectionHeader, space, useTheme } from '../../src/ui';

export default function MoreScreen() {
  const theme = useTheme();
  const membership = useActiveMembership();
  const { signOut } = useSession();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.ground }}>
      <SectionHeader title="Business" />
      <View style={{ backgroundColor: theme.color.surface }}>
        <Row
          title={membership?.businessName ?? 'No business'}
          subtitle={membership?.roleKey ?? undefined}
          onPress={() => router.push('/(auth)/business')}
          accessibilityLabel="Switch business"
        />
      </View>

      <View style={{ padding: space.lg, gap: space.lg }}>
        <Button
          label="Switch business"
          variant="secondary"
          onPress={() => router.push('/(auth)/business')}
        />
        <Button
          label="Sign out"
          variant="danger"
          onPress={() => void signOut().then(() => router.replace('/'))}
        />
      </View>
    </ScrollView>
  );
}
