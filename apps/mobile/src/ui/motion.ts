import { Platform } from 'react-native';
import { useReducedMotion as useReanimatedReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { REDUCED_MOTION_DURATION, duration, type DurationToken } from './theme/index';

/**
 * Motion helpers. Reanimated worklets only — core `Animated` is banned because
 * it runs on the JS thread and stutters on the mid-range Android phones these
 * users actually own.
 *
 * This file exists before the first animated component on purpose: the phase
 * plan asks for it that way, because retrofitting Reduce Motion means auditing
 * every component instead of one hook.
 */

export { useReducedMotion } from 'react-native-reanimated';

/**
 * Reduce Motion **replaces, never removes**.
 *
 * A user with it enabled must still know their tap registered, so movement and
 * scale collapse to a 100ms cross-fade rather than vanishing. Returning a
 * duration rather than a boolean means the call site cannot accidentally skip
 * the feedback entirely.
 */
export function useMotionDuration(token: DurationToken): number {
  const reduced = useReanimatedReducedMotion();
  return reduced ? REDUCED_MOTION_DURATION : duration[token];
}

/** True when movement should be replaced by a cross-fade. */
export function useShouldTravel(): boolean {
  return !useReanimatedReducedMotion();
}

export type HapticKind =
  'light' | 'medium' | 'success' | 'warning' | 'error' | 'selection';

/**
 * Haptics are half of what makes a tap feel confirmed, and they survive Reduce
 * Motion — a user who has turned off movement has not turned off feedback.
 *
 * **iOS gets the full set; Android gets Light only.** Haptic hardware quality
 * varies wildly across Android and a bad buzz is worse than silence.
 */
export async function haptic(kind: HapticKind): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    switch (kind) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        return;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      case 'selection':
        await Haptics.selectionAsync();
        return;
    }
  } catch {
    // A device without a haptic engine, or a user who has turned haptics off
    // at the system level. Neither is an error worth surfacing.
  }
}
