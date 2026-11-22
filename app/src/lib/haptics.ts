import * as Haptics from 'expo-haptics';

/** Fire-and-forget haptics. A device without a haptic engine must never break a game screen. */
const safe = (fn: () => Promise<void>) => void fn().catch(() => undefined);

export const haptic = {
  selection: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
};
