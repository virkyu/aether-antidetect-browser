import { create } from 'zustand';

interface UserState {
  name: string;
  askOnStartup: boolean;
  isNamePromptOpen: boolean;
  setName: (name: string) => void;
  setAskOnStartup: (ask: boolean) => void;
  openNamePrompt: () => void;
  closeNamePrompt: () => void;
  resetName: () => void;
}

const STORAGE_KEY_NAME = 'aether_user_name';
const STORAGE_KEY_ASK_STARTUP = 'aether_ask_name_on_startup';

export const useUserStore = create<UserState>((set, get) => {
  let savedName = '';
  let askStartup = false;

  try {
    savedName = localStorage.getItem(STORAGE_KEY_NAME) || '';
    askStartup = localStorage.getItem(STORAGE_KEY_ASK_STARTUP) === 'true';
  } catch (e) {
    // ignore
  }

  // Open modal if user has no name yet, OR if askStartup is enabled
  const shouldOpen = !savedName || askStartup;

  return {
    name: savedName,
    askOnStartup: askStartup,
    isNamePromptOpen: shouldOpen,

    setName: (newName: string) => {
      const trimmed = newName.trim();
      try {
        localStorage.setItem(STORAGE_KEY_NAME, trimmed);
      } catch (e) {}
      set({ name: trimmed, isNamePromptOpen: false });
    },

    setAskOnStartup: (ask: boolean) => {
      try {
        localStorage.setItem(STORAGE_KEY_ASK_STARTUP, String(ask));
      } catch (e) {}
      set({ askOnStartup: ask });
    },

    openNamePrompt: () => set({ isNamePromptOpen: true }),
    closeNamePrompt: () => {
      const { name } = get();
      if (name) {
        set({ isNamePromptOpen: false });
      }
    },

    resetName: () => {
      try {
        localStorage.removeItem(STORAGE_KEY_NAME);
      } catch (e) {}
      set({ name: '', isNamePromptOpen: true });
    },
  };
});
