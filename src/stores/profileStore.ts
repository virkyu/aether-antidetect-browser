import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { generateRandomFingerprint } from '../lib/fingerprintGenerator';
import type { Profile, CreateProfileInput, UpdateProfileInput, BulkCreateProfilesInput } from '../types/profile';

interface ProfileState {
  profiles: Profile[];
  selectedIds: string[];
  searchQuery: string;
  statusFilter: string | null;
  tagFilter: string | null;
  groupFilter: string | null;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  isLoading: boolean;
  error: string | null;
  activeModal: 'create' | 'bulk_create' | 'edit' | null;
  editingProfile: Profile | null;
  selectedProfileId: string | null;

  // Actions
  loadProfiles: () => Promise<void>;
  setSelectedProfileId: (id: string | null) => void;
  createProfile: (input: CreateProfileInput) => Promise<Profile>;
  bulkCreateProfiles: (input: BulkCreateProfilesInput) => Promise<Profile[]>;
  updateProfile: (input: UpdateProfileInput) => Promise<Profile>;
  deleteProfile: (id: string) => Promise<void>;
  bulkDeleteProfiles: (ids: string[]) => Promise<void>;
  startProfile: (id: string) => Promise<void>;
  stopProfile: (id: string) => Promise<void>;
  bulkStartProfiles: (ids: string[]) => Promise<void>;
  bulkStopProfiles: (ids: string[]) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  setSelectedIds: (ids: string[]) => void;
  toggleSelectProfile: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string | null) => void;
  setTagFilter: (tag: string | null) => void;
  setGroupFilter: (group: string | null) => void;
  setSorting: (field: string, order: 'asc' | 'desc') => void;
  openCreateModal: () => void;
  openBulkCreateModal: () => void;
  openEditModal: (profile: Profile) => void;
  closeModal: () => void;
  seedSampleProfiles: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  selectedIds: [],
  searchQuery: '',
  statusFilter: null,
  tagFilter: null,
  groupFilter: null,
  sortField: 'lastLaunchedAt',
  sortOrder: 'desc',
  isLoading: false,
  error: null,
  activeModal: null,
  editingProfile: null,
  selectedProfileId: null,

  setSelectedProfileId: (id: string | null) => set({ selectedProfileId: id }),

  loadProfiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await invoke<Profile[]>('get_profiles');
      set({ profiles: data, isLoading: false });
    } catch (err: any) {
      console.error('Failed to load profiles:', err);
      set({ error: String(err), isLoading: false });
    }
  },

  createProfile: async (input: CreateProfileInput) => {
    set({ isLoading: true });
    try {
      const created = await invoke<Profile>('create_profile', { input });
      set((state) => ({
        profiles: [created, ...state.profiles],
        activeModal: null,
        isLoading: false,
      }));
      return created;
    } catch (err: any) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  bulkCreateProfiles: async (input: BulkCreateProfilesInput) => {
    set({ isLoading: true });
    try {
      const created = await invoke<Profile[]>('bulk_create_profiles', { input });
      set((state) => ({
        profiles: [...created, ...state.profiles],
        activeModal: null,
        isLoading: false,
      }));
      return created;
    } catch (err: any) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  updateProfile: async (input: UpdateProfileInput) => {
    try {
      const updated = await invoke<Profile>('update_profile', { input });
      set((state) => ({
        profiles: state.profiles.map((p) => (p.id === updated.id ? updated : p)),
        activeModal: null,
        editingProfile: null,
      }));
      return updated;
    } catch (err: any) {
      set({ error: String(err) });
      throw err;
    }
  },

  deleteProfile: async (id: string) => {
    try {
      await invoke('delete_profile', { id });
      set((state) => ({
        profiles: state.profiles.filter((p) => p.id !== id),
        selectedIds: state.selectedIds.filter((sid) => sid !== id),
        selectedProfileId: state.selectedProfileId === id ? null : state.selectedProfileId,
      }));
    } catch (err: any) {
      set({ error: String(err) });
      throw err;
    }
  },

  bulkDeleteProfiles: async (ids: string[]) => {
    try {
      await invoke('bulk_delete_profiles', { ids });
      const idSet = new Set(ids);
      set((state) => ({
        profiles: state.profiles.filter((p) => !idSet.has(p.id)),
        selectedIds: state.selectedIds.filter((sid) => !idSet.has(sid)),
      }));
    } catch (err: any) {
      set({ error: String(err) });
      throw err;
    }
  },

  startProfile: async (id: string) => {
    set((state) => ({
      profiles: state.profiles.map((p) =>
        p.id === id ? { ...p, status: 'running' as const } : p
      ),
    }));
    try {
      const updated = await invoke<Profile>('start_profile', { id });
      set((state) => ({
        profiles: state.profiles.map((p) => (p.id === id ? updated : p)),
      }));
    } catch (err: any) {
      set((state) => ({
        profiles: state.profiles.map((p) =>
          p.id === id ? { ...p, status: 'error' as const } : p
        ),
        error: String(err),
      }));
      throw err;
    }
  },

  stopProfile: async (id: string) => {
    set((state) => ({
      profiles: state.profiles.map((p) =>
        p.id === id ? { ...p, status: 'stopping' as const } : p
      ),
    }));
    try {
      const updated = await invoke<Profile>('stop_profile', { id });
      set((state) => ({
        profiles: state.profiles.map((p) => (p.id === id ? updated : p)),
      }));
    } catch (err: any) {
      set((state) => ({
        profiles: state.profiles.map((p) =>
          p.id === id ? { ...p, status: 'idle' as const } : p
        ),
        error: String(err),
      }));
      throw err;
    }
  },

  bulkStartProfiles: async (ids: string[]) => {
    for (const id of ids) {
      try {
        await get().startProfile(id);
      } catch (e) {
        console.error(`Failed to start profile ${id}:`, e);
      }
    }
  },

  bulkStopProfiles: async (ids: string[]) => {
    for (const id of ids) {
      try {
        await get().stopProfile(id);
      } catch (e) {
        console.error(`Failed to stop profile ${id}:`, e);
      }
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      const updated = await invoke<Profile>('toggle_favorite', { id });
      set((state) => ({
        profiles: state.profiles.map((p) => (p.id === id ? updated : p)),
      }));
    } catch (err: any) {
      set({ error: String(err) });
    }
  },

  togglePin: async (id: string) => {
    try {
      const updated = await invoke<Profile>('toggle_pin', { id });
      set((state) => ({
        profiles: state.profiles.map((p) => (p.id === id ? updated : p)),
      }));
    } catch (err: any) {
      set({ error: String(err) });
    }
  },

  setSelectedIds: (ids: string[]) => set({ selectedIds: ids }),
  
  toggleSelectProfile: (id: string) => {
    set((state) => {
      const exists = state.selectedIds.includes(id);
      return {
        selectedIds: exists
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id],
      };
    });
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: state.profiles.map((p) => p.id),
    }));
  },

  deselectAll: () => set({ selectedIds: [] }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setStatusFilter: (status: string | null) => set({ statusFilter: status }),
  setTagFilter: (tag: string | null) => set({ tagFilter: tag }),
  setGroupFilter: (group: string | null) => set({ groupFilter: group }),
  setSorting: (field: string, order: 'asc' | 'desc') => set({ sortField: field, sortOrder: order }),
  openCreateModal: () => set({ activeModal: 'create', editingProfile: null }),
  openBulkCreateModal: () => set({ activeModal: 'bulk_create', editingProfile: null }),
  openEditModal: (profile: Profile) => set({ activeModal: 'edit', editingProfile: profile }),
  closeModal: () => set({ activeModal: null, editingProfile: null }),
  seedSampleProfiles: async () => {
    const samples: CreateProfileInput[] = [
      {
        name: 'Fleet 01 - Brave / Win11',
        tags: ['work', 'fleet'],
        notes: 'Isolated Brave profile with randomized canvas noise',
        fingerprint: generateRandomFingerprint('windows', 'brave'),
      },
      {
        name: 'Fleet 02 - Chrome / macOS',
        tags: ['marketing', 'social'],
        notes: 'High-res Retina display with dedicated storage',
        fingerprint: generateRandomFingerprint('macos', 'chrome'),
      },
      {
        name: 'Fleet 03 - Edge / Linux',
        tags: ['crypto', 'proxy'],
        notes: 'Strict WebRTC leak protection and isolated cookies',
        fingerprint: generateRandomFingerprint('linux', 'edge'),
      },
    ];
    set({ isLoading: true });
    try {
      for (const sample of samples) {
        const created = await invoke<Profile>('create_profile', { input: sample });
        set((state) => ({ profiles: [created, ...state.profiles] }));
      }
    } catch (e) {
      console.error('Failed to seed sample profiles:', e);
    } finally {
      set({ isLoading: false });
    }
  },
}));
