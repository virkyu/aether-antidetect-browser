import React, { useState } from 'react';
import {
  Layers,
  Play,
  Square,
  MousePointer,
  Navigation,
  Keyboard,
  ArrowDownCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { useProfileStore } from '../../stores/profileStore';

export const SynchronizerView: React.FC = () => {
  const { profiles } = useProfileStore();

  const [masterId, setMasterId] = useState<string>('');
  const [slaveIds, setSlaveIds] = useState<string[]>([]);
  const [isSyncActive, setIsSyncActive] = useState(false);

  // Sync settings
  const [syncNav, setSyncNav] = useState(true);
  const [syncClicks, setSyncClicks] = useState(true);
  const [syncScroll, setSyncScroll] = useState(true);
  const [syncTyping, setSyncTyping] = useState(true);

  const runningProfiles = profiles.filter((p) => p.status === 'running');

  const toggleSlave = (id: string) => {
    setSlaveIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const startSync = () => {
    if (!masterId || slaveIds.length === 0) return;
    setIsSyncActive(true);
  };

  const stopSync = () => {
    setIsSyncActive(false);
  };

  const masterOptions = [
    { value: '', label: 'Select Master Profile...' },
    ...profiles.map((p) => ({
      value: p.id,
      label: p.name,
      badge: p.status === 'running' ? 'Running' : 'Idle',
    })),
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-6 bg-background">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-foreground" />
            Multi-Window Action Synchronizer
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Mirror navigation, clicks, scrolling, and keyboard actions from one master profile window to multiple slave windows in real time.
          </p>
        </div>

        <div>
          {isSyncActive ? (
            <Button
              variant="destructive"
              size="default"
              onClick={stopSync}
              className="gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop Synchronization
            </Button>
          ) : (
            <Button
              variant="default"
              size="default"
              disabled={!masterId || slaveIds.length === 0}
              onClick={startSync}
              className="gap-2 font-semibold"
            >
              <Play className="w-4 h-4 fill-current" />
              Start Synchronizer
            </Button>
          )}
        </div>
      </div>

      {/* Live Sync Active Status Display */}
      {isSyncActive && (
        <Card className="border-emerald-500/40 bg-emerald-950/20 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Layers className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Synchronizer Engine Broadcasting
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Master: <strong className="text-foreground">{profiles.find((p) => p.id === masterId)?.name || 'Active Profile'}</strong> → Mirroring to {slaveIds.length} slave windows
                </span>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 font-mono text-xs uppercase px-2.5 py-1">
              Active Broadcast
            </Badge>
          </CardContent>
        </Card>
      )}

      {runningProfiles.length < 2 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            You need at least 2 running browser profiles to synchronize actions. Launch your profiles from the Profiles tab first.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Master Window Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold">1. Master Window (Source)</CardTitle>
              <Badge variant="secondary">Controls Others</Badge>
            </div>
            <CardDescription className="text-[11px]">
              Actions performed inside this browser window will be broadcast to all selected slave windows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={masterId}
              onChange={(val) => {
                const newMaster = String(val);
                setMasterId(newMaster);
                setSlaveIds(slaveIds.filter((id) => id !== newMaster));
              }}
              disabled={isSyncActive}
              options={masterOptions}
              placeholder="Select Master Profile..."
              triggerClassName="h-9 text-xs"
            />
          </CardContent>
        </Card>

        {/* Sync Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold">2. Synchronized Events</CardTitle>
            <CardDescription className="text-[11px]">
              Choose which mouse and keyboard input signals will be mirrored.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none"
              onClick={() => setSyncNav(!syncNav)}
            >
              <Checkbox
                checked={syncNav}
                onCheckedChange={(checked) => setSyncNav(Boolean(checked))}
              />
              <Navigation className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground">URL Navigation & Page Changes</span>
            </div>

            <div
              className="flex items-center gap-2.5 cursor-pointer select-none"
              onClick={() => setSyncClicks(!syncClicks)}
            >
              <Checkbox
                checked={syncClicks}
                onCheckedChange={(checked) => setSyncClicks(Boolean(checked))}
              />
              <MousePointer className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground">Mouse Coordinates & Clicks</span>
            </div>

            <div
              className="flex items-center gap-2.5 cursor-pointer select-none"
              onClick={() => setSyncScroll(!syncScroll)}
            >
              <Checkbox
                checked={syncScroll}
                onCheckedChange={(checked) => setSyncScroll(Boolean(checked))}
              />
              <ArrowDownCircle className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground">Page Scrolling</span>
            </div>

            <div
              className="flex items-center gap-2.5 cursor-pointer select-none"
              onClick={() => setSyncTyping(!syncTyping)}
            >
              <Checkbox
                checked={syncTyping}
                onCheckedChange={(checked) => setSyncTyping(Boolean(checked))}
              />
              <Keyboard className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground">Keystrokes & Text Input</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Slave Windows List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-semibold">3. Target Windows (Slaves)</CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Select which browser windows will follow the master window&apos;s actions.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {slaveIds.length} window{slaveIds.length !== 1 ? 's' : ''} targeted
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
            {profiles.length === 0 ? (
              <div className="col-span-2 text-center py-6 text-xs text-muted-foreground">
                No profiles configured yet.
              </div>
            ) : (
              profiles
                .filter((p) => p.id !== masterId)
                .map((p) => {
                  const isSelected = slaveIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => !isSyncActive && toggleSlave(p.id)}
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-primary bg-muted/60'
                          : 'border-border bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => !isSyncActive && toggleSlave(p.id)}
                        />
                        <span className="text-xs font-medium text-foreground">{p.name}</span>
                      </div>
                      {p.status === 'running' ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : (
                        <Badge variant="outline">Idle</Badge>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
