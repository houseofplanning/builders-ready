import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Biometric-unlock preference. Stored per-user in AsyncStorage so it
 * survives sign-out / sign-in cycles on the same device.
 *
 * The actual gate-on-launch enforcement is a polish-session feature —
 * for now this just persists the toggle.
 */
const KEY = 'br.biometric_enabled.v1';

export interface BiometricInfo {
  supported: boolean;
  enrolled: boolean;
  /** Friendly label like "Face ID" / "Touch ID" / "Fingerprint". */
  typeLabel: string;
}

export async function readBiometricCapabilities(): Promise<BiometricInfo> {
  const [hardware, enrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);
  let typeLabel = 'Biometrics';
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    typeLabel = 'Face ID';
  } else if (
    types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
  ) {
    typeLabel = 'Fingerprint';
  } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    typeLabel = 'Iris';
  }
  return { supported: hardware, enrolled, typeLabel };
}

export async function isBiometricEnabled(userId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(`${KEY}.${userId}`);
  return raw === '1';
}

export async function setBiometricEnabled(
  userId: string,
  enabled: boolean,
): Promise<boolean> {
  if (enabled) {
    const caps = await readBiometricCapabilities();
    if (!caps.supported || !caps.enrolled) {
      throw new Error(
        'Biometric authentication is not set up on this device.',
      );
    }
    // Prompt once so we know the user can actually authenticate before we
    // turn the toggle on.
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Confirm with ${caps.typeLabel}`,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    if (!result.success) throw new Error('Authentication cancelled.');
  }
  await AsyncStorage.setItem(`${KEY}.${userId}`, enabled ? '1' : '0');
  return enabled;
}
