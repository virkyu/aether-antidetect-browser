export interface SyncSession {
  isActive: boolean;
  masterProfileId: string | null;
  targetProfileIds: string[];
  syncNavigation: boolean;
  syncClicks: boolean;
  syncScroll: boolean;
  syncTyping: boolean;
}

export interface SyncEvent {
  type: 'navigate' | 'click' | 'scroll' | 'key';
  url?: string;
  x?: number;
  y?: number;
  button?: string;
  deltaX?: number;
  deltaY?: number;
  key?: string;
}
