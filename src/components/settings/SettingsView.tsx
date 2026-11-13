import React, { useState } from 'react';
import {
  Settings,
  User,
  Cpu,
  Terminal,
  Shield,
  Trash2,
  HardDrive,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Globe,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Switch } from '../ui/Switch';
import { Select } from '../ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { useUIStore } from '../../stores/uiStore';
import { useUserStore } from '../../stores/userStore';
import { useTranslation } from '../../lib/i18n';
import aetherLogo from '../../assets/logo.png';

export const SettingsView: React.FC = () => {
  const { zoomLevel, setZoom, resetZoom } = useUIStore();
  const { t, language, setLanguage } = useTranslation();
  const { name, askOnStartup, setAskOnStartup, openNamePrompt, resetName } = useUserStore();
  const [chromiumPath, setChromiumPath] = useState(
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  );
  const [apiEnabled, setApiEnabled] = useState(false);
  const [apiPort, setApiPort] = useState(52400);
  const [apiToken, setApiToken] = useState('aether_sec_89f02c4b81');
  const [copiedToken, setCopiedToken] = useState(false);
  const [maxConcurrent, setMaxConcurrent] = useState(10);

  const detectedBrowsers = [
    {
      name: 'Microsoft Edge (Chromium)',
      path: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      isDefault: true,
    },
    {
      name: 'Google Chrome',
      path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      isDefault: false,
    },
    {
      name: 'Brave Browser',
      path: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      isDefault: false,
    },
  ];

  const copyToken = () => {
    navigator.clipboard.writeText(apiToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const maxConcurrentOptions = [
    { value: 5, label: '5 Concurrent' },
    { value: 10, label: '10 Concurrent (Standard)' },
    { value: 20, label: '20 Concurrent' },
    { value: 50, label: '50 Concurrent' },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-6 bg-background">
      {/* Language Selection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-foreground" />
              {t.settings.languageTitle}
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-xs uppercase px-2.5 py-0.5">
              {language.toUpperCase()}
            </Badge>
          </div>
          <CardDescription className="text-[11px]">
            {t.settings.languageDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2.5">
          <Button
            variant={language === 'pl' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage('pl')}
            className="h-8.5 px-4 text-xs font-medium cursor-pointer"
          >
            🇵🇱 {t.settings.polish}
          </Button>
          <Button
            variant={language === 'en' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage('en')}
            className="h-8.5 px-4 text-xs font-medium cursor-pointer"
          >
            🇬🇧 {t.settings.english}
          </Button>
        </CardContent>
      </Card>

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <img src={aetherLogo} alt="Aether" className="w-4 h-4 object-contain" />
              {t.settings.userProfile}
            </CardTitle>
            {name ? (
              <Badge variant="secondary" className="font-medium text-xs px-2.5 py-0.5">
                {name}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {language === 'pl' ? 'Nie ustawiono' : 'Not set'}
              </Badge>
            )}
          </div>
          <CardDescription className="text-[11px]">
            {language === 'pl'
              ? 'Twoje imię skonfigurowane podczas uruchamiania aplikacji. Możesz je zmienić lub zresetować w dowolnym momencie.'
              : 'Your name configured during onboarding. You can update or reset it at any time.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-foreground block">
                {language === 'pl' ? 'Aktualne imię:' : 'Current name:'}
              </span>
              <span className="text-sm font-bold text-foreground">
                {name ? name : <span className="text-muted-foreground italic font-normal">{language === 'pl' ? 'Brak' : 'None'}</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openNamePrompt}
                className="h-8 text-xs font-medium"
              >
                {name ? t.settings.changeName : t.settings.setName}
              </Button>
              {name && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetName}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  {t.settings.clearName}
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-foreground block">
                {t.settings.askOnStartup}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {t.settings.askOnStartupDesc}
              </span>
            </div>
            <Switch
              checked={askOnStartup}
              onCheckedChange={setAskOnStartup}
            />
          </div>
        </CardContent>
      </Card>

      {/* Interface Scaling & Zoom */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <ZoomIn className="w-4 h-4 text-foreground" />
              {t.settings.zoomTitle}
            </CardTitle>
            <Badge variant="secondary">{zoomLevel}% Scale</Badge>
          </div>
          <CardDescription className="text-[11px]">
            {t.settings.zoomDesc}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex items-center gap-2 flex-wrap">
          {[80, 90, 100, 110, 125, 140, 150].map((lvl) => (
            <Button
              key={lvl}
              variant={zoomLevel === lvl ? 'default' : 'outline'}
              size="sm"
              onClick={() => setZoom(lvl)}
              className="h-8 px-3 text-xs font-mono"
            >
              {lvl}%
            </Button>
          ))}
          {zoomLevel !== 100 && (
            <Button variant="ghost" size="sm" onClick={resetZoom} className="text-xs gap-1 h-8">
              <RotateCcw className="w-3.5 h-3.5" />
              {t.settings.resetZoom}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Engine Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <Cpu className="w-4 h-4 text-foreground" />
              Chromium Browser Engine Runtime
            </CardTitle>
            <Badge variant="outline">Engine Detected</Badge>
          </div>
          <CardDescription className="text-[11px]">
            Select which Chromium engine to spawn for isolated profile sessions.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">
          {detectedBrowsers.map((b) => {
            const isSelected = chromiumPath === b.path;
            return (
              <div
                key={b.path}
                onClick={() => setChromiumPath(b.path)}
                className={`p-3 rounded-md border flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-primary bg-muted/60 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">{b.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{b.path}</span>
                </div>
                {isSelected && <Badge variant="secondary">Active</Badge>}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Localhost REST API */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <Terminal className="w-4 h-4 text-foreground" />
                Localhost Automation REST API
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Control profiles and proxies via local HTTP endpoints (127.0.0.1). Secured by Bearer token.
              </CardDescription>
            </div>
            <Switch
              checked={apiEnabled}
              onCheckedChange={setApiEnabled}
            />
          </div>
        </CardHeader>

        {apiEnabled && (
          <CardContent className="space-y-3 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">API Port (Localhost)</label>
                <Input
                  type="number"
                  value={apiPort}
                  onChange={(e) => setApiPort(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Bearer Access Token</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={apiToken}
                    className="font-mono text-[11px] h-8"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToken}
                    className="h-8 w-8 shrink-0"
                    title="Copy token"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-md bg-muted/40 border border-border font-mono text-[11px] text-muted-foreground space-y-1">
              <span className="text-foreground font-semibold block">Available Endpoints:</span>
              <div>GET  http://127.0.0.1:{apiPort}/profiles</div>
              <div>POST http://127.0.0.1:{apiPort}/profiles/:id/start</div>
              <div>POST http://127.0.0.1:{apiPort}/profiles/:id/stop</div>
              <div>GET  http://127.0.0.1:{apiPort}/proxies</div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Storage and Concurrency Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-foreground" />
            Storage & Performance Limits
          </CardTitle>
          <CardDescription className="text-[11px]">
            Profiles data directories reside locally in your user profile: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground border border-border">~/.aether</code>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between text-xs text-foreground">
            <div>
              <span className="font-semibold block">Max Concurrent Profiles</span>
              <span className="text-[11px] text-muted-foreground">Prevent host RAM/CPU exhaustion</span>
            </div>
            <div className="w-48">
              <Select
                value={maxConcurrent}
                onChange={(val) => setMaxConcurrent(Number(val))}
                options={maxConcurrentOptions}
                triggerClassName="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
