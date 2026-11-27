import type { BrowserType, CanvasNoiseMode, OsType, WebRtcPolicy } from '../types/profile';

export interface DefaultProfileSettings {
  osType: OsType;
  browserType: BrowserType;
  folderId: string;
  defaultTags: string;
  defaultProxyId: string;
  resolutionMode: 'fixed' | 'random';
  screenWidth: number;
  screenHeight: number;
  timezoneMode: 'fixed' | 'random';
  timezone: string;
  webrtcPolicy: WebRtcPolicy;
  canvasNoise: CanvasNoiseMode;
  webglNoise: boolean;
  audioNoise: boolean;
  hardwareConcurrency: number;
  deviceMemoryGb: number;
  bulkDefaultCount: number;
  bulkNamePrefix: string;
  bulkAutoDistributeProxies: boolean;
}

export const DEFAULT_PROFILE_SETTINGS: DefaultProfileSettings = {
  osType: 'windows',
  browserType: 'brave',
  folderId: '',
  defaultTags: 'work',
  defaultProxyId: '',
  resolutionMode: 'fixed',
  screenWidth: 1920,
  screenHeight: 1080,
  timezoneMode: 'fixed',
  timezone: 'Europe/Warsaw',
  webrtcPolicy: 'disable_non_proxied_udp',
  canvasNoise: 'noise',
  webglNoise: true,
  audioNoise: true,
  hardwareConcurrency: 8,
  deviceMemoryGb: 16,
  bulkDefaultCount: 5,
  bulkNamePrefix: 'Profile',
  bulkAutoDistributeProxies: false,
};

const STORAGE_KEY = 'aether_default_profile_settings_v1';

export function loadDefaultProfileSettings(): DefaultProfileSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE_SETTINGS,
      ...(typeof parsed === 'object' && parsed !== null ? parsed : {}),
    };
  } catch {
    return { ...DEFAULT_PROFILE_SETTINGS };
  }
}

export function saveDefaultProfileSettings(settings: DefaultProfileSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}
