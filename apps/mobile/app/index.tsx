import { ScrollView, View } from 'react-native';
import { useState } from 'react';
// The imports that matter: shared packages consumed as TypeScript source.
// If these resolve on a physical device, Metro + pnpm is configured correctly —
// and that is the single most valuable thing this screen proves.
import { permissionKeys, type Money } from '@daybook/contracts';
import { addMoney, splitMoney, sumMoney } from '@daybook/core';
import {
  Amount,
  AmountBadge,
  Button,
  Chip,
  EmptyState,
  Field,
  Row,
  SectionHeader,
  Sheet,
  Text,
  space,
  useTheme,
} from '../src/ui/index';

/**
 * The contract-resolution proof, and a live specimen of the design system.
 *
 * The phase plan asks for a `@daybook/contracts` import proven on real hardware
 * *before* any feature work, because Metro + pnpm is the classic trap: it
 * resolves in the simulator and throws "module not found" on a device. Doing
 * the arithmetic on screen means a bundling failure is impossible to miss.
 *
 * This screen is scaffolding. It goes when the tab shell lands.
 */
export default function ContractProofScreen() {
  const theme = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [amount, setAmount] = useState('450.00');

  // Real shared-package arithmetic, run on device.
  const wages: Money[] = ['450.00', '380.50', '520.25'];
  const total = sumMoney(wages);
  const withBonus = addMoney(total, '100.00');
  const threeWays = splitMoney(total, 3);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.color.ground }}>
      <SectionHeader title="Shared packages" trailing={`${permissionKeys.length} keys`} />

      <View style={{ backgroundColor: theme.color.surface }}>
        <Row
          title="@daybook/contracts"
          subtitle={`Resolved · ${permissionKeys.length} permission keys`}
          tone="success"
          marker="OK"
        />
        <Row
          title="@daybook/core"
          subtitle="decimal.js money, on device"
          tone="success"
          marker="OK"
          trailing={<Amount value={total} />}
        />
        <Row
          title="Split three ways"
          subtitle={threeWays.join('  ·  ')}
          tone="info"
          marker="SUM"
          trailing={<Amount value={sumMoney(threeWays)} />}
          twoLine
        />
      </View>

      <SectionHeader title="Status vocabulary" />
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: space.sm,
          padding: space.lg,
        }}
      >
        {/* Every chip carries a word — colour is never the only signal. */}
        <Chip label="Present" tone="success" />
        <Chip label="Half day" tone="warning" />
        <Chip label="Leave" tone="info" />
        <Chip label="Absent" tone="neutral" />
        <Chip label="Overdue" tone="danger" />
      </View>

      <SectionHeader title="Figures" />
      <View style={{ flexDirection: 'row', gap: space.md, padding: space.lg }}>
        <AmountBadge label="Total" value={total} />
        <AmountBadge label="With bonus" value={withBonus} />
        <AmountBadge label="Outstanding" value="1250.00" outstanding />
      </View>

      <SectionHeader title="Input" />
      <View style={{ padding: space.lg, gap: space.lg }}>
        <Field
          label="Daily rate"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          numeric
          hint="Money is a string all the way through — never a float."
        />
        <Button label="Open a sheet" onPress={() => setSheetOpen(true)} />
        <Button label="Secondary" variant="secondary" onPress={() => undefined} />
      </View>

      <SectionHeader title="Empty state" />
      <EmptyState
        message="No entries for today yet."
        action={{ label: 'Add the first one', onPress: () => setSheetOpen(true) }}
      />

      <View style={{ height: space.xxl }} />

      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Quick add">
        <Text variant="secondary" tone="ink2">
          The sheet springs up, and cross-fades instead when Reduce Motion is on.
        </Text>
        <Button label="Close" onPress={() => setSheetOpen(false)} />
      </Sheet>
    </ScrollView>
  );
}
