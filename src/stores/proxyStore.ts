import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Proxy, CreateProxyInput, ProxyCheckResult } from '../types/proxy';

interface ProxyState {
  proxies: Proxy[];
  isLoading: boolean;
  isCheckingAll: boolean;
  checkingIds: string[];
  error: string | null;
  activeModal: 'create' | 'import' | null;

  // Actions
  loadProxies: () => Promise<void>;
  createProxy: (input: CreateProxyInput) => Promise<Proxy>;
  bulkImportProxies: (text: string) => Promise<Proxy[]>;
  deleteProxy: (id: string) => Promise<void>;
  checkProxy: (id: string) => Promise<ProxyCheckResult>;
  checkAllProxies: () => Promise<void>;
  openCreateModal: () => void;
  openImportModal: () => void;
  closeModal: () => void;
}

export const useProxyStore = create<ProxyState>((set, get) => ({
  proxies: [],
  isLoading: false,
  isCheckingAll: false,
  checkingIds: [],
  error: null,
  activeModal: null,

  loadProxies: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await invoke<Proxy[]>('get_proxies');
      set({ proxies: data, isLoading: false });
    } catch (err: any) {
      console.error('Failed to load proxies:', err);
      set({ error: String(err), isLoading: false });
    }
  },

  createProxy: async (input: CreateProxyInput) => {
    set({ isLoading: true });
    try {
      const created = await invoke<Proxy>('create_proxy', { input });
      set((state) => ({
        proxies: [created, ...state.proxies],
        activeModal: null,
        isLoading: false,
      }));
      return created;
    } catch (err: any) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  bulkImportProxies: async (text: string) => {
    set({ isLoading: true });
    try {
      const created = await invoke<Proxy[]>('bulk_import_proxies', { text });
      set((state) => ({
        proxies: [...created, ...state.proxies],
        activeModal: null,
        isLoading: false,
      }));
      return created;
    } catch (err: any) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  deleteProxy: async (id: string) => {
    try {
      await invoke('delete_proxy', { id });
      set((state) => ({
        proxies: state.proxies.filter((p) => p.id !== id),
      }));
    } catch (err: any) {
      set({ error: String(err) });
      throw err;
    }
  },

  checkProxy: async (id: string) => {
    set((state) => ({
      checkingIds: [...state.checkingIds, id],
      proxies: state.proxies.map((p) =>
        p.id === id ? { ...p, status: 'testing' as const } : p
      ),
    }));
    try {
      const result = await invoke<ProxyCheckResult>('check_proxy', { id });
      set((state) => ({
        checkingIds: state.checkingIds.filter((cid) => cid !== id),
        proxies: state.proxies.map((p) =>
          p.id === id
            ? {
                ...p,
                status: result.status,
                latencyMs: result.latencyMs,
                exitIp: result.exitIp,
                countryCode: result.countryCode,
                countryName: result.countryName,
                errorMessage: result.errorMessage,
                lastCheckedAt: new Date().toISOString(),
              }
            : p
        ),
      }));
      return result;
    } catch (err: any) {
      set((state) => ({
        checkingIds: state.checkingIds.filter((cid) => cid !== id),
        proxies: state.proxies.map((p) =>
          p.id === id
            ? {
                ...p,
                status: 'failed' as const,
                errorMessage: String(err),
                lastCheckedAt: new Date().toISOString(),
              }
            : p
        ),
      }));
      throw err;
    }
  },

  checkAllProxies: async () => {
    const list = get().proxies;
    set({ isCheckingAll: true });
    for (const p of list) {
      try {
        await get().checkProxy(p.id);
      } catch (e) {
        console.error(`Check proxy ${p.id} error:`, e);
      }
    }
    set({ isCheckingAll: false });
  },

  openCreateModal: () => set({ activeModal: 'create' }),
  openImportModal: () => set({ activeModal: 'import' }),
  closeModal: () => set({ activeModal: null }),
}));
