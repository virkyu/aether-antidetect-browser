import type { FingerprintConfig, OsType, BrowserType, WebRtcPolicy, CanvasNoiseMode } from '../types/profile';
import {
  loadFingerprintRandomizePrefs,
  type FingerprintRandomizePrefs,
} from './fingerprintPrefs';

const USER_AGENTS: Record<OsType, Record<BrowserType, string[]>> = {
  windows: {
    chrome: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    ],
    edge: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0',
      'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0',
    ],
    brave: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    ],
  },
  macos: {
    chrome: [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Apple Mac OS X 14_7_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    ],
    edge: [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0',
    ],
    brave: [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    ],
  },
  linux: {
    chrome: [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
    ],
    edge: [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0',
    ],
    brave: [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    ],
  },
};

export const SCREEN_RESOLUTIONS = [
  { w: 1920, h: 1080, dpr: 1, label: '1920 × 1080 (Full HD)' },
  { w: 2560, h: 1440, dpr: 1.25, label: '2560 × 1440 (2K QHD)' },
  { w: 1440, h: 900, dpr: 2, label: '1440 × 900 (MacBook Retina)' },
  { w: 1680, h: 1050, dpr: 1, label: '1680 × 1050 (16:10 WS)' },
  { w: 1536, h: 864, dpr: 1.25, label: '1536 × 864 (Laptop)' },
  { w: 1366, h: 768, dpr: 1, label: '1366 × 768 (HD Laptop)' },
  { w: 1280, h: 720, dpr: 1, label: '1280 × 720 (HD Standard)' },
  { w: 1600, h: 900, dpr: 1, label: '1600 × 900 (HD+)' },
  { w: 3840, h: 2160, dpr: 1.5, label: '3840 × 2160 (4K UHD)' },
];

export const TIMEZONE_LOCALES = [
  { tz: 'America/New_York', lang: 'en-US,en;q=0.9', label: 'New York (EDT/EST, UTC-5)' },
  { tz: 'America/Chicago', lang: 'en-US,en;q=0.9', label: 'Chicago (CDT/CST, UTC-6)' },
  { tz: 'America/Los_Angeles', lang: 'en-US,en;q=0.9', label: 'Los Angeles (PDT/PST, UTC-8)' },
  { tz: 'Europe/London', lang: 'en-GB,en;q=0.9', label: 'London (GMT/BST, UTC+0)' },
  { tz: 'Europe/Warsaw', lang: 'pl-PL,pl;q=0.9,en-US;q=0.8', label: 'Warsaw (CEST/CET, UTC+1)' },
  { tz: 'Europe/Berlin', lang: 'de-DE,de;q=0.9,en-US;q=0.8', label: 'Berlin (CEST/CET, UTC+1)' },
  { tz: 'Europe/Paris', lang: 'fr-FR,fr;q=0.9,en-US;q=0.8', label: 'Paris (CEST/CET, UTC+1)' },
  { tz: 'Asia/Tokyo', lang: 'ja-JP,ja;q=0.9,en-US;q=0.8', label: 'Tokyo (JST, UTC+9)' },
  { tz: 'Asia/Singapore', lang: 'en-SG,en;q=0.9,zh;q=0.8', label: 'Singapore (SGT, UTC+8)' },
  { tz: 'Asia/Dubai', lang: 'ar-AE,ar;q=0.9,en;q=0.8', label: 'Dubai (GST, UTC+4)' },
  { tz: 'Australia/Sydney', lang: 'en-AU,en;q=0.9', label: 'Sydney (AEST, UTC+10)' },
  { tz: 'America/Toronto', lang: 'en-CA,en;q=0.9,fr-CA;q=0.8', label: 'Toronto (EDT/EST, UTC-5)' },
];

const HARDWARE_CORES = [4, 6, 8, 12, 16];
const MEMORY_OPTIONS = [8, 16, 32];
const OS_OPTIONS: OsType[] = ['windows', 'macos', 'linux'];
const BROWSER_OPTIONS: BrowserType[] = ['chrome', 'edge', 'brave'];
const WEBRTC_POLICIES: WebRtcPolicy[] = ['disable_non_proxied_udp', 'disabled', 'default'];
const CANVAS_MODES: CanvasNoiseMode[] = ['noise', 'block', 'off'];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomChoiceDifferent<T>(arr: T[], current?: T): T {
  if (arr.length <= 1 || current === undefined) return randomChoice(arr);
  const filtered = arr.filter((item) => item !== current);
  return filtered.length > 0 ? randomChoice(filtered) : randomChoice(arr);
}

/**
 * Generates or randomizes a fingerprint strictly honoring the user's
 * Settings -> Fingerprint Randomization preferences.
 */
export function randomizeFingerprint(
  currentFp: Partial<FingerprintConfig> = {},
  overridePrefs?: FingerprintRandomizePrefs
): FingerprintConfig {
  const prefs = overridePrefs || loadFingerprintRandomizePrefs();

  const osType: OsType = prefs.osType
    ? randomChoiceDifferent(OS_OPTIONS, currentFp.osType)
    : currentFp.osType || randomChoice<OsType>(['windows', 'windows', 'macos', 'linux']);

  const browserType: BrowserType = prefs.browserType
    ? randomChoiceDifferent(BROWSER_OPTIONS, currentFp.browserType)
    : currentFp.browserType || randomChoice<BrowserType>(['chrome', 'chrome', 'edge', 'brave']);

  const uaList = USER_AGENTS[osType]?.[browserType] || USER_AGENTS.windows.chrome;
  const userAgent = prefs.userAgent
    ? randomChoiceDifferent(uaList, currentFp.userAgent)
    : currentFp.userAgent || randomChoice(uaList);

  let screenWidth = currentFp.screenWidth || 1920;
  let screenHeight = currentFp.screenHeight || 1080;
  let devicePixelRatio = currentFp.devicePixelRatio || 1;
  if (prefs.screenResolution || !currentFp.screenWidth || !currentFp.screenHeight) {
    const currentScreen = SCREEN_RESOLUTIONS.find(
      (s) => s.w === currentFp.screenWidth && s.h === currentFp.screenHeight
    );
    const chosenScreen = randomChoiceDifferent(SCREEN_RESOLUTIONS, currentScreen);
    screenWidth = chosenScreen.w;
    screenHeight = chosenScreen.h;
    devicePixelRatio = chosenScreen.dpr;
  }

  let timezone = currentFp.timezone || 'Europe/Warsaw';
  let language = currentFp.language || 'pl-PL,pl;q=0.9,en-US;q=0.8';
  if (prefs.timezone || !currentFp.timezone) {
    const currentLocale = TIMEZONE_LOCALES.find((l) => l.tz === currentFp.timezone);
    const chosenLocale = randomChoiceDifferent(TIMEZONE_LOCALES, currentLocale);
    timezone = chosenLocale.tz;
    language = chosenLocale.lang;
  }

  const hardwareConcurrency =
    prefs.hardware || !currentFp.hardwareConcurrency
      ? randomChoiceDifferent(HARDWARE_CORES, currentFp.hardwareConcurrency)
      : currentFp.hardwareConcurrency;

  const deviceMemoryGb =
    prefs.hardware || !currentFp.deviceMemoryGb
      ? randomChoiceDifferent(MEMORY_OPTIONS, currentFp.deviceMemoryGb)
      : currentFp.deviceMemoryGb;

  const webrtcPolicy: WebRtcPolicy = prefs.webrtcPolicy
    ? randomChoiceDifferent(WEBRTC_POLICIES, currentFp.webrtcPolicy)
    : currentFp.webrtcPolicy || 'disable_non_proxied_udp';

  const canvasNoise: CanvasNoiseMode = prefs.noiseProtection
    ? randomChoiceDifferent(CANVAS_MODES, currentFp.canvasNoise)
    : currentFp.canvasNoise || 'noise';

  const webglNoise = prefs.noiseProtection
    ? Math.random() > 0.25
    : currentFp.webglNoise ?? true;

  const audioNoise = prefs.noiseProtection
    ? Math.random() > 0.25
    : currentFp.audioNoise ?? true;

  return {
    userAgent,
    osType,
    browserType,
    browserVersion: currentFp.browserVersion || '133.0.0.0',
    screenWidth,
    screenHeight,
    devicePixelRatio,
    language,
    timezone,
    geolocation: currentFp.geolocation || { mode: 'auto' },
    webrtcPolicy,
    canvasNoise,
    webglNoise,
    audioNoise,
    hardwareConcurrency,
    deviceMemoryGb,
    doNotTrack: currentFp.doNotTrack ?? false,
  };
}

export function generateRandomFingerprint(
  preferredOs?: OsType,
  preferredBrowser?: BrowserType,
  currentResolution?: { w: number; h: number },
  currentTimezone?: string
): FingerprintConfig {
  const osType = preferredOs || randomChoice<OsType>(['windows', 'windows', 'windows', 'macos', 'linux']);
  const browserType = preferredBrowser || randomChoice<BrowserType>(['chrome', 'chrome', 'edge', 'brave']);

  const uaList = USER_AGENTS[osType]?.[browserType] || USER_AGENTS.windows.chrome;
  const userAgent = randomChoice(uaList);

  // Screen resolution: preserve current resolution if already set/requested
  let screen: (typeof SCREEN_RESOLUTIONS)[number];
  if (currentResolution && currentResolution.w > 0 && currentResolution.h > 0) {
    const matched = SCREEN_RESOLUTIONS.find(
      (s) => s.w === currentResolution.w && s.h === currentResolution.h
    );
    screen = matched || {
      w: currentResolution.w,
      h: currentResolution.h,
      dpr: 1,
      label: `${currentResolution.w}x${currentResolution.h}`,
    };
  } else {
    screen = randomChoice(SCREEN_RESOLUTIONS);
  }

  // Timezone & Locale: preserve current timezone if already set/requested
  let locale: (typeof TIMEZONE_LOCALES)[number];
  if (currentTimezone) {
    const matched = TIMEZONE_LOCALES.find((l) => l.tz === currentTimezone);
    locale = matched || { tz: currentTimezone, lang: 'en-US,en;q=0.9', label: currentTimezone };
  } else {
    locale = randomChoice(TIMEZONE_LOCALES);
  }

  const hardwareConcurrency = randomChoice(HARDWARE_CORES);
  const deviceMemoryGb = randomChoice(MEMORY_OPTIONS);

  return {
    userAgent,
    osType,
    browserType,
    browserVersion: '133.0.0.0',
    screenWidth: screen.w,
    screenHeight: screen.h,
    devicePixelRatio: screen.dpr,
    language: locale.lang,
    timezone: locale.tz,
    geolocation: {
      mode: 'auto',
    },
    webrtcPolicy: 'disable_non_proxied_udp',
    canvasNoise: 'noise',
    webglNoise: true,
    audioNoise: true,
    hardwareConcurrency,
    deviceMemoryGb,
    doNotTrack: false,
  };
}
