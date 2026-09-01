import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { otpRequestSchema, otpVerifySchema } from '@daybook/contracts';
import { useSession } from '../../src/stores/session';
import { describeError } from '../../src/api/client';
import {
  Button,
  Field,
  SectionHeader,
  Text,
  haptic,
  space,
  useTheme,
} from '../../src/ui';

/**
 * Phone is the identity — there is no password (ADR 0007).
 *
 * The two steps live in one screen rather than two routes: a user who mistypes
 * their number should be able to fix it without a back navigation, and the code
 * arrives while they are still looking at this screen.
 */
export default function SignInScreen() {
  const theme = useTheme();
  const { requestOtp, verifyOtp } = useSession();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('+91');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Validated with the same schema the server enforces, so the two cannot
  // disagree about what a phone number is.
  const phoneValid = otpRequestSchema.safeParse({ phone }).success;
  const codeValid = otpVerifySchema.shape.code.safeParse(code).success;

  const onRequest = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestOtp(phone);
      await haptic('success');
      setStep('code');
    } catch (caught) {
      await haptic('error');
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(phone, code);
      await haptic('success');
      router.replace('/');
    } catch (caught) {
      await haptic('error');
      setError(describeError(caught));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.color.ground }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <SectionHeader title={step === 'phone' ? 'Sign in' : 'Enter the code'} />

        <View style={{ padding: space.lg, gap: space.lg }}>
          {step === 'phone' ? (
            <>
              <Text variant="secondary" tone="ink2">
                We will send a six-digit code by SMS.
              </Text>
              <Field
                label="Mobile number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                numeric
                autoFocus
                error={
                  phone.length > 3 && !phoneValid
                    ? 'Enter a number like +919876543210'
                    : null
                }
              />
              <Button
                label="Send code"
                onPress={() => void onRequest()}
                disabled={!phoneValid}
                loading={busy}
              />
            </>
          ) : (
            <>
              <Text variant="secondary" tone="ink2">
                Sent to {phone}.
              </Text>
              <Field
                label="Six-digit code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                // Lets both platforms offer the code from the SMS directly.
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                numeric
                autoFocus
              />
              <Button
                label="Sign in"
                onPress={() => void onVerify()}
                disabled={!codeValid}
                loading={busy}
              />
              <Button
                label="Change number"
                variant="secondary"
                onPress={() => {
                  setStep('phone');
                  setCode('');
                  setError(null);
                }}
              />
            </>
          )}

          {error ? (
            <Text variant="secondary" style={{ color: theme.status.danger }}>
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
