export interface AppSettings {
  chromiumBinaryPath: string;
  detectedBrowsers: { name: string; path: string; isDefault: boolean }[];
  maxConcurrentProfiles: number;
  apiEnabled: boolean;
  apiPort: number;
  apiToken: string;
  theme: 'dark' | 'light' | 'system';
  tableDensity: 'compact' | 'normal' | 'relaxed';
  autoRestoreCrashedProfiles: boolean;
  clearCacheOnExit: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  entityType: 'profile' | 'proxy' | 'automation' | 'system';
  entityId?: string;
  entityName?: string;
  details?: string;
  status: 'success' | 'warn' | 'error';
}
