export interface FingerprintRandomizePrefs {
  osType: boolean;
  browserType: boolean;
  userAgent: boolean;
  screenResolution: boolean;
  timezone: boolean;
  hardware: boolean;
  webrtcPolicy: boolean;
  noiseProtection: boolean;
}

export const DEFAULT_FINGERPRINT_RANDOMIZE_PREFS: FingerprintRandomizePrefs = {
  osType: false,
  browserType: false,
  userAgent: true,
  screenResolution: false,
  timezone: false,
  hardware: true,
  webrtcPolicy: false,
  noiseProtection: false,
};

const STORAGE_KEY = 'aether_fp_randomize_prefs_v1';

export function loadFingerprintRandomizePrefs(): FingerprintRandomizePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FINGERPRINT_RANDOMIZE_PREFS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_FINGERPRINT_RANDOMIZE_PREFS,
      ...(typeof parsed === 'object' && parsed !== null ? parsed : {}),
    };
  } catch {
    return { ...DEFAULT_FINGERPRINT_RANDOMIZE_PREFS };
  }
}

export function saveFingerprintRandomizePrefs(prefs: FingerprintRandomizePrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}
