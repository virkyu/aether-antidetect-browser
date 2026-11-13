import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dices, Monitor, Globe, Cpu, Zap, X, Plus } from 'lucide-react';
import gsap from 'gsap';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { useTranslation } from '../../lib/i18n';
import { useProfileStore } from '../../stores/profileStore';
import { useProxyStore } from '../../stores/proxyStore';
import { cn } from '../../lib/utils';
import {
  generateRandomFingerprint,
  SCREEN_RESOLUTIONS,
  TIMEZONE_LOCALES,
} from '../../lib/fingerprintGenerator';
import { parseProxyString } from '../../lib/proxyParser';
import type {
  CreateProfileInput,
  UpdateProfileInput,
  FingerprintConfig,
  OsType,
  BrowserType,
  WebRtcPolicy,
  CanvasNoiseMode,
} from '../../types/profile';

export const ProfileModal: React.FC = () => {
  const { profiles, activeModal, editingProfile, closeModal, createProfile, updateProfile } = useProfileStore();
  const { proxies, createProxy } = useProxyStore();
  const { t } = useTranslation();

  const isOpen = activeModal === 'create' || activeModal === 'edit';
  const isEditing = activeModal === 'edit' && !!editingProfile;

  const [activeTab, setActiveTab] = useState<string>('general');

  // Form state
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [proxyId, setProxyId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [quickProxyInput, setQuickProxyInput] = useState('');
  const [isAttachingProxy, setIsAttachingProxy] = useState(false);

  // Existing tags across all profiles for suggestion/quick-select
  const existingTags = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => {
      (p.tags || []).forEach((tag) => {
        const clean = tag.trim();
        if (clean) set.add(clean);
      });
    });
    return Array.from(set).sort();
  }, [profiles]);

  // Current parsed tags
  const currentTagList = useMemo(() => {
    return tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tags]);

  const toggleTag = (tagToToggle: string) => {
    const trimmed = tagToToggle.trim();
    if (!trimmed) return;
    if (currentTagList.includes(trimmed)) {
      const remaining = currentTagList.filter((t) => t !== trimmed);
      setTags(remaining.join(', '));
    } else {
      const updated = [...currentTagList, trimmed];
      setTags(updated.join(', '));
    }
  };

  // Fingerprint state
  const [osType, setOsType] = useState<OsType>('windows');
  const [browserType, setBrowserType] = useState<BrowserType>('chrome');
  const [screenWidth, setScreenWidth] = useState(1920);
  const [screenHeight, setScreenHeight] = useState(1080);
  const [webrtcPolicy, setWebrtcPolicy] = useState<WebRtcPolicy>('disable_non_proxied_udp');
  const [canvasNoise, setCanvasNoise] = useState<CanvasNoiseMode>('noise');
  const [webglNoise, setWebglNoise] = useState(true);
  const [audioNoise, setAudioNoise] = useState(true);
  const [hardwareConcurrency, setHardwareConcurrency] = useState(8);
  const [deviceMemoryGb, setDeviceMemoryGb] = useState(16);
  const [language, setLanguage] = useState('en-US,en;q=0.9');
  const [timezone, setTimezone] = useState('America/New_York');
  const [userAgent, setUserAgent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const previewCardRef = useRef<HTMLDivElement>(null);
  const diceRef = useRef<HTMLSpanElement>(null);

  const handleRandomizeFingerprint = () => {
    if (diceRef.current) {
      gsap.to(diceRef.current, {
        rotation: '+=360',
        duration: 0.45,
        ease: 'back.out(2)',
      });
    }

    if (previewCardRef.current) {
      gsap.fromTo(
        previewCardRef.current,
        { scale: 0.98 },
        { scale: 1, duration: 0.3, ease: 'power2.out' }
      );
    }

    const randomFp = generateRandomFingerprint(
      osType,
      browserType,
      { w: screenWidth, h: screenHeight },
      timezone
    );

    // Screen resolution and timezone are preserved (do not change during randomization)
    setUserAgent(randomFp.userAgent);
    setLanguage(randomFp.language);
    setHardwareConcurrency(randomFp.hardwareConcurrency);
    setDeviceMemoryGb(randomFp.deviceMemoryGb);
  };

  useEffect(() => {
    setSubmitError(null);
    if (isEditing && editingProfile) {
      setName(editingProfile.name);
      setTags(editingProfile.tags.join(', '));
      setProxyId(editingProfile.proxyId || '');
      setNotes(editingProfile.notes || '');
      setOsType(editingProfile.fingerprint.osType);
      setBrowserType(editingProfile.fingerprint.browserType);
      setScreenWidth(editingProfile.fingerprint.screenWidth);
      setScreenHeight(editingProfile.fingerprint.screenHeight);
      setWebrtcPolicy(editingProfile.fingerprint.webrtcPolicy);
      setCanvasNoise(editingProfile.fingerprint.canvasNoise);
      setWebglNoise(editingProfile.fingerprint.webglNoise);
      setAudioNoise(editingProfile.fingerprint.audioNoise);
      setHardwareConcurrency(editingProfile.fingerprint.hardwareConcurrency);
      setDeviceMemoryGb(editingProfile.fingerprint.deviceMemoryGb);
      setLanguage(editingProfile.fingerprint.language);
      setTimezone(editingProfile.fingerprint.timezone);
      setUserAgent(editingProfile.fingerprint.userAgent);
    } else {
      const defaultName = `Profile ${Math.floor(1000 + Math.random() * 9000)}`;
      setName(defaultName);
      setTags('work');
      setProxyId('');
      setNotes('');

      const randomFp = generateRandomFingerprint('windows', 'brave');
      setOsType(randomFp.osType);
      setBrowserType('brave');
      setScreenWidth(randomFp.screenWidth);
      setScreenHeight(randomFp.screenHeight);
      setWebrtcPolicy(randomFp.webrtcPolicy);
      setCanvasNoise(randomFp.canvasNoise);
      setWebglNoise(randomFp.webglNoise);
      setAudioNoise(randomFp.audioNoise);
      setHardwareConcurrency(randomFp.hardwareConcurrency);
      setDeviceMemoryGb(randomFp.deviceMemoryGb);
      setLanguage(randomFp.language);
      setTimezone(randomFp.timezone);
      setUserAgent(randomFp.userAgent);
    }
  }, [isOpen, isEditing, editingProfile]);

  if (!isOpen) return null;

  const handleQuickAttachProxy = async () => {
    const parsed = parseProxyString(quickProxyInput);
    if (!parsed) return;
    setIsAttachingProxy(true);
    try {
      const created = await createProxy({
        title: `${parsed.host}:${parsed.port}`,
        protocol: parsed.protocol,
        host: parsed.host,
        port: parsed.port,
        username: parsed.username,
        password: parsed.password,
      });
      if (created && created.id) {
        setProxyId(created.id);
        setQuickProxyInput('');
      }
    } catch (e) {
      console.error('Failed to attach proxy:', e);
    } finally {
      setIsAttachingProxy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const fpData: FingerprintConfig = {
        userAgent: userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        osType,
        browserType,
        browserVersion: '133.0.0.0',
        screenWidth,
        screenHeight,
        devicePixelRatio: 1.0,
        language: language || 'en-US,en;q=0.9',
        timezone: timezone || 'America/New_York',
        geolocation: {
          mode: 'auto',
        },
        webrtcPolicy,
        canvasNoise,
        webglNoise,
        audioNoise,
        hardwareConcurrency,
        deviceMemoryGb,
        doNotTrack: false,
      };

      if (isEditing && editingProfile) {
        const input: UpdateProfileInput = {
          id: editingProfile.id,
          name,
          tags: tagArray,
          notes: notes || undefined,
          proxyId: proxyId || undefined,
          fingerprint: fpData,
        };
        await updateProfile(input);
        closeModal();
      } else {
        const input: CreateProfileInput = {
          name,
          tags: tagArray,
          notes: notes || undefined,
          proxyId: proxyId || undefined,
          fingerprint: fpData,
        };
        await createProfile(input);
        closeModal();
      }
    } catch (err: any) {
      console.error('Create/Update profile error:', err);
      setSubmitError(typeof err === 'string' ? err : err?.message || 'Failed to save profile. Please check parameters.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={isEditing ? `${t.modal.editTitle} — ${editingProfile.name}` : t.modal.createTitle}
      description="Each profile runs in a completely separate process with independent storage, cookies, and fingerprint."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center justify-between">
            <span>{submitError}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSubmitError(null)}
              className="h-5 w-5 text-destructive hover:bg-destructive/20"
            >
              ✕
            </Button>
          </div>
        )}

        {/* Live Fingerprint Overview & Quick Randomize Bar */}
        <div
          ref={previewCardRef}
          className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between gap-3 shadow-xs transition-all"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-mono">{screenWidth} × {screenHeight}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-mono">{timezone}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-mono">{hardwareConcurrency} Cores / {deviceMemoryGb}GB RAM</span>
            </div>

            <Badge variant="outline" className="uppercase font-mono text-[10px]">
              {browserType}
            </Badge>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRandomizeFingerprint}
            className="text-xs h-7.5 px-3 shrink-0"
          >
            <span ref={diceRef} className="inline-flex mr-1.5">
              <Dices className="w-3.5 h-3.5" />
            </span>
            {t.modal.randomizeFp}
          </Button>
        </div>

        {/* Resolution note */}
        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 px-1 pb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span>{t.modal.resolutionLockedHint}</span>
        </div>

        {/* shadcn Tabs Component */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="general">1. {t.modal.tabGeneral}</TabsTrigger>
            <TabsTrigger value="proxy">2. {t.modal.tabProxy}</TabsTrigger>
            <TabsTrigger value="fingerprint">3. {t.modal.tabFingerprint}</TabsTrigger>
          </TabsList>

          {/* Tab 1: General */}
          <TabsContent value="general" className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">{t.modal.profileName}</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.modal.profileNamePlaceholder}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-foreground">
                {t.modal.tagsLabel}
              </label>

              {/* Text Input for custom tags */}
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t.modal.tagsPlaceholder}
                className="h-8.5 text-xs font-mono"
              />

              {/* Selected tags badges with quick remove */}
              {currentTagList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {currentTagList.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[11px] font-mono py-0.5 pl-2 pr-1.5 flex items-center gap-1 bg-zinc-800 border border-zinc-700 text-zinc-200"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="text-zinc-400 hover:text-white rounded-full p-0.5 hover:bg-zinc-700 cursor-pointer transition-colors"
                        title="Remove tag"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Existing tags suggestions (as requested: "dodajac tagi do przegladarki mozesz wybrac takie co juz byly") */}
              {existingTags.length > 0 && (
                <div className="pt-1.5">
                  <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    {t.modal.existingTagsLabel}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-lg border border-border/60 bg-muted/20">
                    {existingTags.map((tag) => {
                      const isSelected = currentTagList.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={cn(
                            "h-6 px-2 rounded-md text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer border",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                              : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-accent border-border"
                          )}
                        >
                          <Plus className={cn("w-2.5 h-2.5 transition-transform", isSelected && "rotate-45")} />
                          <span>#{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">{t.modal.notesLabel}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t.modal.notesPlaceholder}
                className="w-full rounded-md bg-background border border-input p-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </TabsContent>

          {/* Tab 2: Proxy */}
          <TabsContent value="proxy" className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Select Existing Proxy</label>
              <Select
                value={proxyId}
                onChange={(val) => setProxyId(val)}
                options={[
                  { value: '', label: 'Direct Connection (No Proxy)' },
                  ...proxies.map((p) => ({
                    value: p.id,
                    label: `${p.title || `${p.host}:${p.port}`} (${p.protocol.toUpperCase()})`,
                    badge: p.countryCode ? p.countryCode : undefined,
                  })),
                ]}
              />
            </div>

            <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-2">
              <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                Or Quick Add & Attach Proxy (hostname:port:login:password)
              </label>
              <div className="flex gap-2">
                <Input
                  value={quickProxyInput}
                  onChange={(e) => setQuickProxyInput(e.target.value)}
                  placeholder="e.g. 192.168.1.1:8080:user:pass"
                  className="font-mono text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAttachProxy();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={isAttachingProxy}
                  onClick={handleQuickAttachProxy}
                  className="shrink-0 text-xs font-semibold px-3"
                >
                  Attach
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Instantly parses hostname, port, username, and password, creates the proxy and assigns it to this profile.
              </p>
            </div>
          </TabsContent>

          {/* Tab 3: Fingerprint & Engine */}
          <TabsContent value="fingerprint" className="space-y-4 pt-2 max-h-[50vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Operating System</label>
                <Select
                  value={osType}
                  onChange={(val) => setOsType(val as OsType)}
                  options={[
                    { value: 'windows', label: 'Windows 10/11' },
                    { value: 'macos', label: 'macOS (Apple Silicon / Intel)' },
                    { value: 'linux', label: 'Linux (Ubuntu / Debian)' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Browser Engine</label>
                <Select
                  value={browserType}
                  onChange={(val) => setBrowserType(val as BrowserType)}
                  options={[
                    { value: 'brave', label: 'Brave Browser', badge: 'Recommended' },
                    { value: 'chrome', label: 'Google Chrome' },
                    { value: 'edge', label: 'Microsoft Edge' },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Screen Resolution</label>
                <Select
                  value={`${screenWidth}x${screenHeight}`}
                  onChange={(val) => {
                    const [w, h] = String(val).split('x').map(Number);
                    setScreenWidth(w);
                    setScreenHeight(h);
                  }}
                  options={SCREEN_RESOLUTIONS.map((s) => ({
                    value: `${s.w}x${s.h}`,
                    label: s.label,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Timezone</label>
                <Select
                  value={timezone}
                  onChange={(val) => {
                    setTimezone(val);
                    const match = TIMEZONE_LOCALES.find((l) => l.tz === val);
                    if (match) setLanguage(match.lang);
                  }}
                  options={TIMEZONE_LOCALES.map((l) => ({
                    value: l.tz,
                    label: l.label,
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">CPU Hardware Concurrency</label>
                <Select
                  value={hardwareConcurrency}
                  onChange={(val) => setHardwareConcurrency(Number(val))}
                  options={[
                    { value: 4, label: '4 Cores' },
                    { value: 6, label: '6 Cores' },
                    { value: 8, label: '8 Cores (Standard)' },
                    { value: 12, label: '12 Cores' },
                    { value: 16, label: '16 Cores' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Device Memory (RAM)</label>
                <Select
                  value={deviceMemoryGb}
                  onChange={(val) => setDeviceMemoryGb(Number(val))}
                  options={[
                    { value: 4, label: '4 GB' },
                    { value: 8, label: '8 GB' },
                    { value: 16, label: '16 GB (Recommended)' },
                    { value: 32, label: '32 GB' },
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">User Agent String</label>
              <Input
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
                placeholder="Mozilla/5.0..."
                className="font-mono text-xs"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={closeModal} className="text-xs h-8.5 px-3">
            {t.modal.cancel}
          </Button>
          <Button type="submit" variant="default" loading={isSubmitting} className="text-xs h-8.5 px-4 font-semibold">
            {isEditing ? t.modal.save : t.modal.save}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
