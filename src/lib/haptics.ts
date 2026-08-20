import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export function nativeHapticsAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics')
}

/** Gentle feedback for a deliberate selection. Web/PWA installs stay silent. */
export async function selectionFeedback(enabled: boolean) {
  if (!enabled || !nativeHapticsAvailable()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // Feedback is an enhancement; it must never interrupt communication.
  }
}
