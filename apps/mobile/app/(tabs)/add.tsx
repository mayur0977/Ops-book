import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Button,
  EmptyState,
  SectionHeader,
  Sheet,
  Text,
  space,
  useTheme,
} from '../../src/ui';

/**
 * Quick Add opens a sheet rather than navigating, so it is never a destination
 * the Android back button has to reason about.
 */
export default function AddScreen() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.ground }}>
      <SectionHeader title="Add" />
      <View style={{ padding: space.lg }}>
        <Button label="Quick add" onPress={() => setOpen(true)} />
      </View>
      <EmptyState message="Quick actions appear here once modules are enabled." />

      <Sheet visible={open} onClose={() => setOpen(false)} title="Quick add">
        <Text variant="secondary" tone="ink2">
          Orders, payments and expenses will be added from here.
        </Text>
        <Button label="Close" onPress={() => setOpen(false)} />
      </Sheet>
    </ScrollView>
  );
}
