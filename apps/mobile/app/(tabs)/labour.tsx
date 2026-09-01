import { ScrollView } from 'react-native';
import { EmptyState, SectionHeader, useTheme } from '../../src/ui';

/** Placeholder. Labour arrives in a later phase; the tab exists so the shell is real. */
export default function LabourScreen() {
  const theme = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.ground }}>
      <SectionHeader title="Labour" />
      <EmptyState message="Nothing here yet — this arrives in a later phase." />
    </ScrollView>
  );
}
