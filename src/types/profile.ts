export type OsType = 'windows' | 'macos' | 'linux';
export type BrowserType = 'chrome' | 'edge' | 'brave';
export type WebRtcPolicy = 'default' | 'disable_non_proxied_udp' | 'disabled';
export type CanvasNoiseMode = 'noise' | 'off' | 'block';
export type ProfileStatus = 'idle' | 'running' | 'stopping' | 'error';

export interface FingerprintConfig {
  userAgent: string;
  osType: OsType;
  browserType: BrowserType;
  browserVersion: string;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  language: string;
  timezone: string;
  geolocation: {
    mode: 'auto' | 'manual' | 'block';
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
  webrtcPolicy: WebRtcPolicy;
  canvasNoise: CanvasNoiseMode;
  webglNoise: boolean;
  audioNoise: boolean;
  hardwareConcurrency: number;
  deviceMemoryGb: number;
  doNotTrack: boolean;
}

export interface Profile {
  id: string;
  name: string;
  groupId?: string;
  groupName?: string;
  tags: string[];
  status: ProfileStatus;
  fingerprint: FingerprintConfig;
  proxyId?: string;
  proxySummary?: string;
  notes?: string;
  isFavorite: boolean;
  isPinned: boolean;
  pid?: number;
  debuggingPort?: number;
  lastLaunchedAt?: string;
  totalRuntimeSec: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileInput {
  name: string;
  groupId?: string;
  tags?: string[];
  fingerprint?: Partial<FingerprintConfig>;
  proxyId?: string;
  notes?: string;
}

export interface UpdateProfileInput extends Partial<CreateProfileInput> {
  id: string;
}

export interface BulkCreateProfilesInput {
  count: number;
  namePrefix: string;
  osType: OsType;
  browserType: BrowserType;
  proxyIds?: string[];
  tags?: string[];
}
