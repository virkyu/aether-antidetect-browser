import React, { useEffect, useState } from 'react';
import { AppShell, type NavTab } from './components/layout/AppShell';
import { ProfileTable } from './components/profiles/ProfileTable';
import { ProfileModal } from './components/profiles/ProfileModal';
import { BulkCreateModal } from './components/profiles/BulkCreateModal';
import { UserNameModal } from './components/user/UserNameModal';
import { ProxyView } from './components/proxies/ProxyView';
import { AutomationView } from './components/automation/AutomationView';
import { SynchronizerView } from './components/synchronizer/SynchronizerView';
import { SettingsView } from './components/settings/SettingsView';
import { ActivityView } from './components/settings/ActivityView';
import { useProfileStore } from './stores/profileStore';
import { useProxyStore } from './stores/proxyStore';
import { Puzzle } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('profiles');
  const { loadProfiles } = useProfileStore();
  const { loadProxies } = useProxyStore();

  useEffect(() => {
    // Attempt loading initial data from Tauri backend
    loadProfiles().catch((err) => console.log('Tauri IPC init loadProfiles:', err));
    loadProxies().catch((err) => console.log('Tauri IPC init loadProxies:', err));
  }, [loadProfiles, loadProxies]);

  return (
    <AppShell currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'profiles' && <ProfileTable />}
      {currentTab === 'proxies' && <ProxyView />}
      {currentTab === 'automation' && <AutomationView />}
      {currentTab === 'synchronizer' && <SynchronizerView />}
      {currentTab === 'activity' && <ActivityView />}
      {currentTab === 'settings' && <SettingsView />}
      {currentTab === 'extensions' && (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-8">
          <Puzzle className="w-10 h-10 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Browser Extension Manager</h3>
          <p className="text-xs text-muted-foreground max-w-sm text-center">
            Install and manage unpacked extensions or CRX packages globally across all profile instances.
          </p>
        </div>
      )}

      {/* Global Modals */}
      <ProfileModal />
      <BulkCreateModal />
      <UserNameModal />
    </AppShell>
  );
}

export default App;
