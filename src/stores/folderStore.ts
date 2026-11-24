import { create } from 'zustand';

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: string;
}

export interface FolderColorOption {
  id: string;
  name: string;
  hex: string;
}

export const FOLDER_COLOR_PRESETS: FolderColorOption[] = [
  { id: 'emerald', name: 'Emerald', hex: '#10b981' },
  { id: 'blue', name: 'Cyber Blue', hex: '#3b82f6' },
  { id: 'indigo', name: 'Indigo', hex: '#6366f1' },
  { id: 'purple', name: 'Violet', hex: '#a855f7' },
  { id: 'pink', name: 'Neon Pink', hex: '#ec4899' },
  { id: 'rose', name: 'Crimson Rose', hex: '#f43f5e' },
  { id: 'orange', name: 'Sunset Orange', hex: '#f97316' },
  { id: 'amber', name: 'Amber Gold', hex: '#f59e0b' },
  { id: 'yellow', name: 'Cyber Yellow', hex: '#eab308' },
  { id: 'teal', name: 'Teal', hex: '#14b8a6' },
  { id: 'cyan', name: 'Neo Cyan', hex: '#06b6d4' },
  { id: 'zinc', name: 'Dark Slate', hex: '#71717a' },
];

export const FOLDER_ICON_PRESETS = [
  '📁', '🚀', '💎', '🛒', '📱', '🔒', '💰', '🌐', '🤖', '🎯', '⚡', '🔥', '⭐', '📦'
];

const STORAGE_KEY = 'aether_folders_v2';

const DEFAULT_FOLDERS: Folder[] = [
  {
    id: 'folder-social',
    name: 'Social Media',
    color: '#3b82f6',
    icon: '📱',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'folder-crypto',
    name: 'Crypto & Web3',
    color: '#f59e0b',
    icon: '💎',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'folder-ads',
    name: 'Marketing & Ads',
    color: '#10b981',
    icon: '🚀',
    createdAt: new Date().toISOString(),
  },
];

function getStoredFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('aether_folders_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((f) => ({
          ...f,
          icon: f.icon || '📁',
          color: f.color || '#3b82f6',
        }));
      }
    }
  } catch (e) {
    // Ignore storage parse error
  }
  return DEFAULT_FOLDERS;
}

function persistFolders(folders: Folder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  } catch (e) {
    // Ignore
  }
}

interface FolderState {
  folders: Folder[];
  activeFolderId: string | null; // null = all, 'unassigned' = no folder, or folder.id
  setActiveFolderId: (id: string | null) => void;
  createFolder: (name: string, color?: string, icon?: string) => Folder;
  updateFolder: (id: string, name: string, color?: string, icon?: string) => void;
  deleteFolder: (id: string) => void;
  getFolderById: (id: string | undefined | null) => Folder | undefined;
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folders: getStoredFolders(),
  activeFolderId: null,

  setActiveFolderId: (id: string | null) => {
    set({ activeFolderId: id });
  },

  createFolder: (name: string, color?: string, icon?: string) => {
    const trimmed = name.trim();
    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmed || 'Nowy folder',
      color: color || FOLDER_COLOR_PRESETS[0].hex,
      icon: icon || '📁',
      createdAt: new Date().toISOString(),
    };
    const updated = [...get().folders, newFolder];
    persistFolders(updated);
    set({ folders: updated });
    return newFolder;
  },

  updateFolder: (id: string, name: string, color?: string, icon?: string) => {
    const trimmed = name.trim();
    const updated = get().folders.map((f) => {
      if (f.id !== id) return f;
      return {
        ...f,
        name: trimmed || f.name,
        color: color || f.color,
        icon: icon !== undefined ? icon : f.icon,
      };
    });
    persistFolders(updated);
    set({ folders: updated });
  },

  deleteFolder: (id: string) => {
    const updated = get().folders.filter((f) => f.id !== id);
    persistFolders(updated);
    set((state) => ({
      folders: updated,
      activeFolderId: state.activeFolderId === id ? null : state.activeFolderId,
    }));
  },

  getFolderById: (id: string | undefined | null) => {
    if (!id) return undefined;
    return get().folders.find((f) => f.id === id);
  },
}));
