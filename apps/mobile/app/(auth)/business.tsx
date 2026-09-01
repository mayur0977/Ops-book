import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../../src/stores/session';
import { describeError } from '../../src/api/client';
import {
  Button,
  EmptyState,
  Field,
  Row,
  SectionHeader,
  Text,
  haptic,
  space,
  useTheme,
} from '../../src/ui';

/**
 * Create or join, and switch between what you already have.
 *
 * The vertical is chosen once here and never consulted again at runtime
 * (ADR 0004) — it selects the seed pack and then stops mattering.
 */
const VERTICALS = [
  { key: 'general', label: 'General' },
  { key: 'fabrication', label: 'Fabrication' },
] as const;

export default function BusinessScreen() {
  const theme = useTheme();
  const {
    memberships,
    activeBusinessId,
    createBusiness,
    joinBusiness,
    switchBusiness,
    signOut,
  } = useSession();

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [vertical, setVertical] = useState<string>('general');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await haptic('success');
      router.replace('/(tabs)');
    } catch (caught) {
      await haptic('error');
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  const active = memberships.filter((m) => m.status === 'active');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.color.ground }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        {active.length > 0 ? (
          <>
            <SectionHeader title="Your businesses" trailing={`${active.length}`} />
            <View style={{ backgroundColor: theme.color.surface }}>
              {active.map((membership) => (
                <Row
                  key={membership.businessId}
                  title={membership.businessName}
                  subtitle={membership.roleKey}
                  tone={
                    membership.businessId === activeBusinessId ? 'success' : undefined
                  }
                  marker={membership.businessId === activeBusinessId ? 'OPEN' : undefined}
                  onPress={() => {
                    void switchBusiness(membership.businessId).then(() =>
                      router.replace('/(tabs)'),
                    );
                  }}
                />
              ))}
            </View>
          </>
        ) : (
          <EmptyState message="You are not in a business yet. Create one, or join with a code." />
        )}

        <SectionHeader
          title={mode === 'create' ? 'Create a business' : 'Join with a code'}
        />

        <View style={{ padding: space.lg, gap: space.lg }}>
          {mode === 'create' ? (
            <>
              <Field
                label="Business name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                error={
                  name.length > 0 && name.trim().length < 2
                    ? 'At least two characters'
                    : null
                }
              />

              <View style={{ gap: space.sm }}>
                <Text variant="label" tone="ink3">
                  Type of business
                </Text>
                <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                  {VERTICALS.map((option) => (
                    <Button
                      key={option.key}
                      label={option.label}
                      variant={vertical === option.key ? 'primary' : 'secondary'}
                      onPress={() => setVertical(option.key)}
                    />
                  ))}
                </View>
                <Text variant="caption" tone="ink3">
                  This chooses your starting categories and statuses. You can change them
                  later.
                </Text>
              </View>

              <Button
                label="Create"
                onPress={() => void run(() => createBusiness(name.trim(), vertical))}
                disabled={name.trim().length < 2}
                loading={busy}
              />
              <Button
                label="I have a code"
                variant="secondary"
                onPress={() => setMode('join')}
              />
            </>
          ) : (
            <>
              <Field
                label="Join code"
                value={joinCode}
                onChangeText={(text) => setJoinCode(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={16}
                hint="Ask an owner for the code."
              />
              <Button
                label="Join"
                onPress={() => void run(() => joinBusiness(joinCode.trim()))}
                disabled={joinCode.trim().length < 6}
                loading={busy}
              />
              <Button
                label="Create one instead"
                variant="secondary"
                onPress={() => setMode('create')}
              />
            </>
          )}

          {error ? (
            <Text variant="secondary" style={{ color: theme.status.danger }}>
              {error}
            </Text>
          ) : null}

          <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
