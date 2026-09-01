import { ScrollView, View } from 'react-native';
import { useActiveMembership, useSession } from '../../src/stores/session';
import { EmptyState, Row, SectionHeader, Text, space, useTheme } from '../../src/ui';

/**
 * Home. Phase 1 ships an app you can log into that has almost nothing in it —
 * that is correct, and the phase plan says so explicitly. The day's figures
 * arrive with orders and money in Phases 3 and 4.
 */
export default function HomeScreen() {
  const theme = useTheme();
  const membership = useActiveMembership();
  const { memberships } = useSession();

  if (!membership) {
    return <EmptyState message="No business selected." />;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.ground }}>
      <SectionHeader title="Today" trailing={new Date().toLocaleDateString()} />
      <View style={{ backgroundColor: theme.color.surface }}>
        <Row
          title={membership.businessName}
          subtitle={`Signed in as ${membership.roleKey}`}
          tone="success"
          marker="OPEN"
        />
      </View>

      <SectionHeader title="Coming next" />
      <View style={{ padding: space.lg }}>
        <Text variant="secondary" tone="ink2">
          Orders, payments and the muster roll land in the phases after this one.
        </Text>
      </View>

      {memberships.length > 1 ? (
        <>
          <SectionHeader
            title="Other businesses"
            trailing={`${memberships.length - 1}`}
          />
          <View style={{ backgroundColor: theme.color.surface }}>
            {memberships
              .filter((m) => m.businessId !== membership.businessId)
              .map((m) => (
                <Row key={m.businessId} title={m.businessName} subtitle={m.roleKey} />
              ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
