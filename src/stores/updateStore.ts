import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export const APP_VERSION = '1.0.5';
const GITHUB_LATEST_API =
  'https://api.github.com/repos/virkyu/aether-antidetect-browser/releases/latest';
const GITHUB_RELEASES_PAGE =
  'https://github.com/virkyu/aether-antidetect-browser/releases';

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  tagName: string;
  name: string;
  body: string;
  htmlUrl: string;
  downloadUrl?: string | null;
  publishedAt: string;
  updateAvailable: boolean;
}

function parseSemver(v: string): [number, number, number] {
  const clean = v.trim().replace(/^[vV]/, '').split('-')[0];
  const [a = '0', b = '0', c = '0'] = clean.split('.');
  return [Number(a) || 0, Number(b) || 0, Number(c) || 0];
}

function isNewerSemver(current: string, latest: string): boolean {
  const [c1, c2, c3] = parseSemver(current);
  const [l1, l2, l3] = parseSemver(latest);
  if (l1 !== c1) return l1 > c1;
  if (l2 !== c2) return l2 > c2;
  return l3 > c3;
}

interface UpdateState {
  isChecking: boolean;
  updateInfo: UpdateInfo | null;
  error: string | null;
  dismissed: boolean;
  lastCheckedAt: string | null;
  isPreviewMode: boolean;

  checkForUpdates: (silent?: boolean) => Promise<UpdateInfo | null>;
  dismissUpdate: () => void;
  reopenUpdateBanner: () => void;
  previewUpdateNotification: () => void;
  openReleasePage: (url?: string) => Promise<void>;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  isChecking: false,
  updateInfo: null,
  error: null,
  dismissed: false,
  lastCheckedAt: null,
  isPreviewMode: false,

  checkForUpdates: async (silent = false) => {
    if (get().isChecking) return get().updateInfo;
    set({ isChecking: true, error: null, isPreviewMode: false });

    try {
      let info: UpdateInfo;
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

      if (isTauri) {
        info = await invoke<UpdateInfo>('check_for_updates');
      } else {
        const res = await fetch(GITHUB_LATEST_API, {
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (!res.ok) {
          throw new Error(`GitHub API HTTP ${res.status}`);
        }
        const json = await res.json();
        const tagName: string = json.tag_name || `v${APP_VERSION}`;
        const latestVersion = tagName.replace(/^[vV]/, '');
        const exeAsset = Array.isArray(json.assets)
          ? json.assets.find((a: any) => typeof a?.name === 'string' && a.name.toLowerCase().endsWith('.exe'))
          : null;

        info = {
          currentVersion: APP_VERSION,
          latestVersion,
          tagName,
          name: json.name || tagName,
          body: json.body || '',
          htmlUrl: json.html_url || GITHUB_RELEASES_PAGE,
          downloadUrl: exeAsset?.browser_download_url || null,
          publishedAt: json.published_at || '',
          updateAvailable: isNewerSemver(APP_VERSION, latestVersion),
        };
      }

      set({
        isChecking: false,
        updateInfo: info,
        lastCheckedAt: new Date().toLocaleTimeString(),
        dismissed: info.updateAvailable ? false : get().dismissed,
      });
      return info;
    } catch (err: any) {
      const msg = err?.message || String(err);
      set({
        isChecking: false,
        error: silent ? null : msg,
        lastCheckedAt: new Date().toLocaleTimeString(),
      });
      return null;
    }
  },

  dismissUpdate: () => set({ dismissed: true, isPreviewMode: false }),

  reopenUpdateBanner: () => set({ dismissed: false }),

  previewUpdateNotification: () => {
    set({
      isPreviewMode: true,
      dismissed: false,
      error: null,
      updateInfo: {
        currentVersion: APP_VERSION,
        latestVersion: '1.0.5',
        tagName: 'v1.0.5',
        name: 'Aether Browser v1.0.5 (Preview)',
        body: 'Nowe animacje interfejsu, konfiguracja losowania odcisku cyfrowego oraz usprawnienia stabilności.',
        htmlUrl: GITHUB_RELEASES_PAGE,
        downloadUrl: GITHUB_RELEASES_PAGE,
        publishedAt: new Date().toISOString(),
        updateAvailable: true,
      },
    });
  },

  openReleasePage: async (customUrl?: string) => {
    const info = get().updateInfo;
    const targetUrl = customUrl || info?.downloadUrl || info?.htmlUrl || GITHUB_RELEASES_PAGE;
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

    if (isTauri) {
      try {
        await invoke('open_external_url', { url: targetUrl });
        return;
      } catch (err) {
        console.warn('Tauri open_external_url fallback:', err);
      }
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  },
}));
