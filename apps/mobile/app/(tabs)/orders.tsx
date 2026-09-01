import { ScrollView } from 'react-native';
import { EmptyState, SectionHeader, useTheme } from '../../src/ui';

/** Placeholder. Orders arrives in a later phase; the tab exists so the shell is real. */
export default function OrdersScreen() {
  const theme = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.ground }}>
      <SectionHeader title="Orders" />
      <EmptyState message="Nothing here yet — this arrives in a later phase." />
    </ScrollView>
  );
}
