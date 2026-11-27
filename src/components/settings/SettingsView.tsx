import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import {
  User,
  Cpu,
  Terminal,
  HardDrive,
  Copy,
  Check,
  ZoomIn,
  RotateCcw,
  Globe,
  Palette,
  Dices,
  RefreshCw,
  Download,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Monitor,
  Clock,
  ShieldCheck,
  Sliders,
  Folder as FolderIcon,
  Layers,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Switch } from '../ui/Switch';
import { Select } from '../ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { useUIStore, THEME_OPTIONS } from '../../stores/uiStore';
import { useUserStore } from '../../stores/userStore';
import { useUpdateStore, APP_VERSION } from '../../stores/updateStore';
import { useFolderStore } from '../../stores/folderStore';
import { useProxyStore } from '../../stores/proxyStore';
import { SCREEN_RESOLUTIONS, TIMEZONE_LOCALES } from '../../lib/fingerprintGenerator';
import { useTranslation } from '../../lib/i18n';
import type { FingerprintRandomizePrefs } from '../../lib/fingerprintPrefs';
import type { BrowserType, CanvasNoiseMode, OsType, WebRtcPolicy } from '../../types/profile';
import { cn } from '../../lib/utils';
import aetherLogo from '../../assets/logo.png';

export const SettingsView: React.FC = () => {
  const {
    zoomLevel,
    setZoom,
    resetZoom,
    themeColor,
    setThemeColor,
    fingerprintRandomizePrefs,
    setFingerprintRandomizePref,
    setAllFingerprintRandomizePrefs,
    resetFingerprintRandomizePrefs,
    defaultProfileSettings,
    updateDefaultProfileSetting,
    resetDefaultProfileSettings,
  } = useUIStore();
  const { folders } = useFolderStore();
  const { proxies } = useProxyStore();
  const { t, language, setLanguage } = useTranslation();
  const { name, askOnStartup, setAskOnStartup, openNamePrompt, resetName } = useUserStore();
  const {
    isChecking: isCheckingUpdate,
    updateInfo,
    error: updateError,
    lastCheckedAt,
    checkForUpdates,
    previewUpdateNotification,
    openReleasePage,
  } = useUpdateStore();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const cards = el.querySelectorAll(':scope > div');
    if (cards.length === 0) return;
    gsap.killTweensOf(cards);
    gsap.fromTo(
      cards,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.28, stagger: 0.04, ease: 'power3.out', clearProps: 'transform,opacity' }
    );
  }, []);
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

  const activeFpRandomCount = Object.values(fingerprintRandomizePrefs).filter(Boolean).length;

  const fpRandomOptions: Array<{
    key: keyof FingerprintRandomizePrefs;
    label: string;
    desc: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'osType',
      label: t.settings.fpOptOs,
      desc: t.settings.fpOptOsDesc,
      icon: <Monitor className="w-3.5 h-3.5" />,
    },
    {
      key: 'browserType',
      label: t.settings.fpOptBrowser,
      desc: t.settings.fpOptBrowserDesc,
      icon: <Globe className="w-3.5 h-3.5" />,
    },
    {
      key: 'userAgent',
      label: t.settings.fpOptUserAgent,
      desc: t.settings.fpOptUserAgentDesc,
      icon: <Terminal className="w-3.5 h-3.5" />,
    },
    {
      key: 'screenResolution',
      label: t.settings.fpOptResolution,
      desc: t.settings.fpOptResolutionDesc,
      icon: <ZoomIn className="w-3.5 h-3.5" />,
    },
    {
      key: 'timezone',
      label: t.settings.fpOptTimezone,
      desc: t.settings.fpOptTimezoneDesc,
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    {
      key: 'hardware',
      label: t.settings.fpOptHardware,
      desc: t.settings.fpOptHardwareDesc,
      icon: <Cpu className="w-3.5 h-3.5" />,
    },
    {
      key: 'webrtcPolicy',
      label: t.settings.fpOptWebrtc,
      desc: t.settings.fpOptWebrtcDesc,
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    {
      key: 'noiseProtection',
      label: t.settings.fpOptNoise,
      desc: t.settings.fpOptNoiseDesc,
      icon: <Sliders className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-6 bg-background">
      {/* App Updates & GitHub Release Checker */}
      <Card className={cn(updateInfo?.updateAvailable && 'border-primary/50 animate-glow-border')}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              {t.settings.updatesTitle}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5">
                v{APP_VERSION}
              </Badge>
              {updateInfo?.updateAvailable ? (
                <Badge variant="success" className="text-xs px-2.5 py-0.5 animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  {t.settings.updateAvailableBadge} ({updateInfo.tagName})
                </Badge>
              ) : updateInfo && !updateError ? (
                <Badge variant="secondary" className="text-xs px-2.5 py-0.5 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  {t.settings.upToDate}
                </Badge>
              ) : null}
            </div>
          </div>
          <CardDescription className="text-[11px]">
            {t.settings.updatesDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-lg border border-border bg-card/60">
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-muted-foreground">
                  {t.settings.currentVersionLabel}: <strong className="font-mono text-foreground">v{APP_VERSION}</strong>
                </span>
                {updateInfo && (
                  <span className="text-muted-foreground">
                    {t.settings.latestVersionLabel}: <strong className="font-mono text-primary">{updateInfo.tagName}</strong>
                  </span>
                )}
              </div>
              {lastCheckedAt && (
                <div className="text-[11px] text-muted-foreground font-mono">
                  Last checked: {lastCheckedAt}
                </div>
              )}
              {updateError && (
                <div className="text-[11px] text-destructive">
                  {updateError}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="default"
                size="sm"
                onClick={() => checkForUpdates(false)}
                disabled={isCheckingUpdate}
                className="h-8 text-xs px-3 gap-1.5 font-semibold"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isCheckingUpdate && 'animate-spin')} />
                {isCheckingUpdate ? t.settings.checkingUpdates : t.settings.checkUpdates}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={previewUpdateNotification}
                className="h-8 text-xs px-3 gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                {t.settings.previewUpdateBanner}
              </Button>
              {updateInfo?.updateAvailable && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openReleasePage(updateInfo.downloadUrl || updateInfo.htmlUrl)}
                  className="h-8 text-xs px-3 gap-1.5 text-emerald-400"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t.settings.downloadUpdate}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurable Fingerprint Randomizer Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <Dices className="w-4 h-4 text-primary" />
              {t.settings.fpRandomizeTitle}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5">
                {activeFpRandomCount} / {fpRandomOptions.length} {t.settings.fpActiveCount}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAllFingerprintRandomizePrefs(activeFpRandomCount < fpRandomOptions.length)}
                className="h-7 text-[11px] px-2.5"
              >
                {t.settings.fpRandomizeSelectAll}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFingerprintRandomizePrefs}
                className="h-7 text-[11px] px-2.5 gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                {t.settings.fpRandomizeDefaults}
              </Button>
            </div>
          </div>
          <CardDescription className="text-[11px]">
            {t.settings.fpRandomizeDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {fpRandomOptions.map((opt) => {
              const enabled = fingerprintRandomizePrefs[opt.key];
              return (
                <div
                  key={opt.key}
                  onClick={() => setFingerprintRandomizePref(opt.key, !enabled)}
                  className={cn(
                    'group flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150 ease-out active:scale-[0.99]',
                    enabled
                      ? 'border-primary/45 bg-primary/8 text-foreground shadow-xs'
                      : 'border-border bg-card/50 text-muted-foreground hover:bg-muted/30 hover:border-zinc-700'
                  )}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 group-hover:scale-105',
                        enabled
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-muted text-muted-foreground border border-border'
                      )}
                    >
                      {opt.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold block truncate text-foreground">
                        {opt.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-snug block mt-0.5">
                        {opt.desc}
                      </span>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => setFingerprintRandomizePref(opt.key, checked)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Default Profile & Bulk Creation Presets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              {t.settings.defaultsTitle}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetDefaultProfileSettings}
              className="h-7 text-[11px] px-2.5 gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              {t.settings.defaultsReset}
            </Button>
          </div>
          <CardDescription className="text-[11px]">
            {t.settings.defaultsDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {t.settings.defaultsOs}
              </label>
              <Select
                value={defaultProfileSettings.osType}
                onChange={(val) => updateDefaultProfileSetting('osType', val as OsType)}
                options={[
                  { value: 'windows', label: 'Windows 10/11' },
                  { value: 'macos', label: 'macOS (Apple Silicon / Intel)' },
                  { value: 'linux', label: 'Linux (Ubuntu / Debian)' },
                ]}
                triggerClassName="h-8.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {t.settings.defaultsBrowser}
              </label>
              <Select
                value={defaultProfileSettings.browserType}
                onChange={(val) => updateDefaultProfileSetting('browserType', val as BrowserType)}
                options={[
                  { value: 'brave', label: 'Brave Browser' },
                  { value: 'chrome', label: 'Google Chrome' },
                  { value: 'edge', label: 'Microsoft Edge' },
                ]}
                triggerClassName="h-8.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <FolderIcon className="w-3 h-3" />
                {t.settings.defaultsFolder}
              </label>
              <Select
                value={defaultProfileSettings.folderId}
                onChange={(val) => updateDefaultProfileSetting('folderId', val)}
                options={[
                  { value: '', label: `📁 ${t.folders.noFolder}` },
                  ...folders.map((f) => ({
                    value: f.id,
                    label: `${f.icon || '📁'} ${f.name}`,
                  })),
                ]}
                triggerClassName="h-8.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {t.settings.defaultsTags}
              </label>
              <Input
                value={defaultProfileSettings.defaultTags}
                onChange={(e) => updateDefaultProfileSetting('defaultTags', e.target.value)}
                placeholder="e.g. work, accounts"
                className="h-8.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {t.settings.defaultsProxy}
              </label>
              <Select
                value={defaultProfileSettings.defaultProxyId}
                onChange={(val) => updateDefaultProfileSetting('defaultProxyId', val)}
                options={[
                  { value: '', label: t.modal.noProxyDirect },
                  ...proxies.map((p) => ({
                    value: p.id,
                    label: `${p.title || `${p.host}:${p.port}`} (${p.protocol.toUpperCase()})`,
                  })),
                ]}
                triggerClassName="h-8.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {t.settings.defaultsWebrtc}
              </label>
              <Select
                value={defaultProfileSettings.webrtcPolicy}
                onChange={(val) => updateDefaultProfileSetting('webrtcPolicy', val as WebRtcPolicy)}
                options={[
                  { value: 'disable_non_proxied_udp', label: 'Disable Non-Proxied UDP (Recommended)' },
                  { value: 'disabled', label: 'Disabled (Block WebRTC Completely)' },
                ]}
                triggerClassName="h-8.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {t.settings.defaultsResolution}
              </label>
              <Select
                value={
                  defaultProfileSettings.resolutionMode === 'random'
                    ? 'random'
                    : `${defaultProfileSettings.screenWidth}x${defaultProfileSettings.screenHeight}`
                }
                onChange={(val) => {
                  if (val === 'random') {
                    updateDefaultProfileSetting('resolutionMode', 'random');
                  } else {
                    const [w, h] = String(val).split('x').map(Number);
                    updateDefaultProfileSetting('resolutionMode', 'fixed');
                    updateDefaultProfileSetting('screenWidth', w || 1920);
                    updateDefaultProfileSetting('screenHeight', h || 1080);
                  }
                }}
                options={[
                  { value: 'random', label: `🎲 ${t.settings.defaultsResolutionRandom}` },
                  ...SCREEN_RESOLUTIONS.map((s) => ({
                    value: `${s.w}x${s.h}`,
                    label: s.label,
                  })),
                ]}
                triggerClassName="h-8.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {t.settings.defaultsTimezone}
              </label>
              <Select
                value={
                  defaultProfileSettings.timezoneMode === 'random'
                    ? 'random'
                    : defaultProfileSettings.timezone
                }
                onChange={(val) => {
                  if (val === 'random') {
                    updateDefaultProfileSetting('timezoneMode', 'random');
                  } else {
                    updateDefaultProfileSetting('timezoneMode', 'fixed');
                    updateDefaultProfileSetting('timezone', String(val));
                  }
                }}
                options={[
                  { value: 'random', label: `🎲 ${t.settings.defaultsTimezoneRandom}` },
                  ...TIMEZONE_LOCALES.map((l) => ({
                    value: l.tz,
                    label: l.label,
                  })),
                ]}
                triggerClassName="h-8.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {t.settings.defaultsCanvas}
              </label>
              <Select
                value={defaultProfileSettings.canvasNoise}
                onChange={(val) => updateDefaultProfileSetting('canvasNoise', val as CanvasNoiseMode)}
                options={[
                  { value: 'noise', label: 'Deterministic Seeded Noise (Recommended)' },
                  { value: 'block', label: 'Block Canvas Readout' },
                  { value: 'off', label: 'Off (Real Canvas)' },
                ]}
                triggerClassName="h-8.5 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {t.settings.defaultsBulkCount}
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={defaultProfileSettings.bulkDefaultCount}
                onChange={(e) =>
                  updateDefaultProfileSetting('bulkDefaultCount', Math.max(1, Math.min(100, Number(e.target.value) || 1)))
                }
                className="h-8.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {t.settings.defaultsBulkPrefix}
              </label>
              <Input
                value={defaultProfileSettings.bulkNamePrefix}
                onChange={(e) => updateDefaultProfileSetting('bulkNamePrefix', e.target.value)}
                placeholder="Profile"
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card/60">
              <span className="text-[11px] font-medium text-foreground pr-2">
                {t.settings.defaultsWebglAudio}
              </span>
              <Switch
                checked={defaultProfileSettings.webglNoise && defaultProfileSettings.audioNoise}
                onCheckedChange={(checked) => {
                  updateDefaultProfileSetting('webglNoise', checked);
                  updateDefaultProfileSetting('audioNoise', checked);
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60">
            <div className="space-y-0.5 pr-4">
              <span className="text-xs font-medium text-foreground block">
                {t.settings.defaultsBulkAutoProxy}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {language === 'pl'
                  ? 'Automatycznie zaznacza rozdzielanie dostępnych proxy w oknie Masowego Tworzenia.'
                  : 'Pre-checks round-robin proxy distribution inside the Bulk Generate dialog.'}
              </span>
            </div>
            <Switch
              checked={defaultProfileSettings.bulkAutoDistributeProxies}
              onCheckedChange={(checked) =>
                updateDefaultProfileSetting('bulkAutoDistributeProxies', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

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

      {/* Theme Accent Color */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4 text-foreground" />
              {t.settings.themeTitle}
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono flex items-center gap-1.5 px-2.5 py-0.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block border border-black/20"
                style={{ backgroundColor: THEME_OPTIONS.find((th) => th.id === themeColor)?.color || '#ffffff' }}
              />
              {t.settings[THEME_OPTIONS.find((th) => th.id === themeColor)?.nameKey || 'themeDefault']}
            </Badge>
          </div>
          <CardDescription className="text-[11px]">
            {t.settings.themeDesc}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {THEME_OPTIONS.map((theme) => {
              const isSelected = themeColor === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setThemeColor(theme.id)}
                  className={`group flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-all duration-150 ease-out active:scale-[0.96] hover:-translate-y-0.5 ${
                    isSelected
                      ? 'border-primary bg-muted/80 text-foreground ring-1 ring-primary shadow-xs font-semibold'
                      : 'border-border bg-card/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center border border-white/20 shadow-xs transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: theme.color }}
                  >
                    {isSelected && (
                      <Check className={`w-2.5 h-2.5 ${theme.id === 'default' ? 'text-black' : 'text-white'} stroke-[3] animate-checkbox-pop`} />
                    )}
                  </span>
                  <span className="truncate">{t.settings[theme.nameKey]}</span>
                </button>
              );
            })}
          </div>
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
