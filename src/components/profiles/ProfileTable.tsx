import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  Search,
  Play,
  Square,
  Edit2,
  Trash2,
  Star,
  Pin,
  Globe,
  Monitor,
  Shield,
  Layers,
  Dices,
  Sparkles,
  Plus,
  ArrowRight,
  LayoutGrid,
  List,
  Cpu,
  Clock,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import gsap from 'gsap';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../ui/Table';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../ui/Card';
import { useProfileStore } from '../../stores/profileStore';
import { useProxyStore } from '../../stores/proxyStore';
import { cn, formatDuration, formatTimeAgo } from '../../lib/utils';
import { generateRandomFingerprint } from '../../lib/fingerprintGenerator';
import { useTranslation } from '../../lib/i18n';
import { ProfileDetailView } from './ProfileDetailView';
import type { Profile } from '../../types/profile';

export const ProfileTable: React.FC = () => {
  const { t } = useTranslation();
  const {
    profiles,
    selectedIds,
    searchQuery,
    statusFilter,
    tagFilter,
    sortField,
    sortOrder,
    isLoading,
    selectedProfileId,
    setSelectedProfileId,
    setSearchQuery,
    setStatusFilter,
    setTagFilter,
    setSorting,
    toggleSelectProfile,
    selectAll,
    deselectAll,
    startProfile,
    stopProfile,
    bulkStartProfiles,
    bulkStopProfiles,
    deleteProfile,
    bulkDeleteProfiles,
    toggleFavorite,
    openCreateModal,
    openEditModal,
    updateProfile,
    seedSampleProfiles,
  } = useProfileStore();

  const { proxies } = useProxyStore();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const proxyMap = useMemo(() => {
    const map = new Map();
    proxies.forEach((p) => map.set(p.id, p));
    return map;
  }, [proxies]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    profiles.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [profiles]);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const emptyHeroRef = useRef<HTMLDivElement>(null);

  // Selected single profile view
  const activeDetailProfile = useMemo(() => {
    if (!selectedProfileId) return null;
    return profiles.find((p) => p.id === selectedProfileId) || null;
  }, [selectedProfileId, profiles]);

  // Entrance animations
  useEffect(() => {
    if (emptyHeroRef.current) {
      gsap.fromTo(
        emptyHeroRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }
      );
    }
  }, [profiles.length]);

  // Filtered and sorted profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesTags = p.tags.some((t) => t.toLowerCase().includes(query));
        const proxy = p.proxyId ? proxyMap.get(p.proxyId) : null;
        const matchesProxy = proxy
          ? `${proxy.host}:${proxy.port}`.toLowerCase().includes(query) ||
            proxy.title.toLowerCase().includes(query)
          : false;

        if (!matchesName && !matchesTags && !matchesProxy) return false;
      }

      if (statusFilter === 'favorites') {
        if (!p.isFavorite) return false;
      } else if (statusFilter === 'proxied') {
        if (!p.proxyId) return false;
      } else if (statusFilter && p.status !== statusFilter) {
        if (statusFilter === 'idle' && !p.status) {
          // treat undefined status as idle
        } else {
          return false;
        }
      }

      if (tagFilter && !p.tags.includes(tagFilter)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Pinned always first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // Favorites second
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      let valA: any = (a as any)[sortField];
      let valB: any = (b as any)[sortField];

      if (sortField === 'proxyId') {
        const pA = a.proxyId ? proxyMap.get(a.proxyId) : null;
        const pB = b.proxyId ? proxyMap.get(b.proxyId) : null;
        valA = pA ? `${pA.host}:${pA.port}` : '';
        valB = pB ? `${pB.host}:${pB.port}` : '';
      }

      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [profiles, searchQuery, statusFilter, tagFilter, sortField, sortOrder, proxyMap]);

  const allSelected =
    filteredProfiles.length > 0 &&
    filteredProfiles.every((p) => selectedIds.includes(p.id));

  const handleQuickRandomize = async (profile: Profile, e: React.MouseEvent) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    gsap.to(btn, { rotation: '+=360', duration: 0.45, ease: 'back.out(2)' });
    const freshFp = generateRandomFingerprint(
      profile.fingerprint.osType,
      profile.fingerprint.browserType,
      { w: profile.fingerprint.screenWidth, h: profile.fingerprint.screenHeight },
      profile.fingerprint.timezone
    );
    await updateProfile({
      id: profile.id,
      fingerprint: freshFp,
    });
  };

  // If viewing details of a profile
  if (activeDetailProfile) {
    return <ProfileDetailView profile={activeDetailProfile} />;
  }

  // Empty state
  if (profiles.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto bg-background">
        <div ref={emptyHeroRef} className="max-w-xl w-full flex flex-col items-center text-center space-y-6 my-auto">
          <Badge variant="outline" className="gap-2 px-3 py-1 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>TypeUI Architecture • 100% Isolated & Private</span>
          </Badge>

          <div className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center text-foreground shadow-xs relative">
            <Monitor className="w-8 h-8 text-foreground" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              No Browser Profiles Found
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Launch fully isolated Chromium & Brave browser profiles with independent fingerprints, dedicated cookies, custom proxies, and isolated cache.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="default"
              size="default"
              onClick={openCreateModal}
              className="gap-2 font-semibold px-4"
            >
              <Plus className="w-4 h-4" />
              <span>Create Profile</span>
            </Button>

            <Button
              variant="secondary"
              size="default"
              onClick={() => seedSampleProfiles()}
              className="gap-2 font-semibold px-4"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Load 3 Demo Profiles</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left pt-3">
            <Card>
              <CardHeader className="p-4 space-y-1">
                <CardTitle className="text-xs flex items-center gap-1.5 font-semibold text-foreground">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Deep Fingerprints
                </CardTitle>
                <CardDescription className="text-[11px] leading-relaxed">
                  Canvas noise, audio context, WebRTC leak shield, and WebGL spoofing.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="p-4 space-y-1">
                <CardTitle className="text-xs flex items-center gap-1.5 font-semibold text-foreground">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Process Isolation
                </CardTitle>
                <CardDescription className="text-[11px] leading-relaxed">
                  Independent user-data-dir, separate cache, and dedicated cookies.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="p-4 space-y-1">
                <CardTitle className="text-xs flex items-center gap-1.5 font-semibold text-foreground">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  Proxy Engine
                </CardTitle>
                <CardDescription className="text-[11px] leading-relaxed">
                  Auto-authentication extension for HTTP/SOCKS5 proxies with leak protection.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const runningCount = profiles.filter((p) => p.status === 'running').length;
  const proxiesCount = profiles.filter((p) => Boolean(p.proxyId)).length;
  const favoriteCount = profiles.filter((p) => p.isFavorite).length;

  return (
    <div ref={tableContainerRef} className="flex flex-col h-full overflow-hidden bg-background min-w-0">
      {/* 4 Metric Cards in dark theme with Satoshi typography and functional filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 px-5 sm:px-6 py-4 border-b border-[#1a1a1a] bg-[#0a0a0a] shrink-0">
        {/* Card 1: Total Profiles */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#1e1e1e] bg-[#0e0e0e] hover:border-[#2a2a2a] transition-all shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 pb-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs sm:text-[13px] font-medium text-zinc-300">{t.cards.totalProfiles}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2.5 font-sans">
              {profiles.length}
            </div>
          </div>
          <div className="px-4 sm:px-5 py-2.5 border-t border-[#1a1a1a] flex items-center justify-end">
            <button
              onClick={() => {
                setSelectedProfileId(null);
                setStatusFilter(null);
              }}
              className={cn(
                "h-7 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                statusFilter === null
                  ? "border-white/20 bg-white/10 text-white font-semibold"
                  : "border-[#2a2a2a] bg-[#141414] hover:bg-[#1c1c1c] text-zinc-300"
              )}
            >
              <span>{statusFilter === null ? t.cards.filterApplied : t.cards.applyFilter}</span>
              <span className="text-zinc-400">→</span>
            </button>
          </div>
        </div>

        {/* Card 2: Active Sessions */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#1e1e1e] bg-[#0e0e0e] hover:border-[#2a2a2a] transition-all shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 pb-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs sm:text-[13px] font-medium text-zinc-300">{t.cards.activeSessions}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2.5 font-sans flex items-center gap-2.5">
              <span>{runningCount}</span>
              {runningCount > 0 && (
                <span className="text-[11px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t.cards.running}
                </span>
              )}
            </div>
          </div>
          <div className="px-4 sm:px-5 py-2.5 border-t border-[#1a1a1a] flex items-center justify-end">
            <button
              onClick={() => {
                setSelectedProfileId(null);
                setStatusFilter(statusFilter === 'running' ? null : 'running');
              }}
              className={cn(
                "h-7 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                statusFilter === 'running'
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-semibold"
                  : "border-[#2a2a2a] bg-[#141414] hover:bg-[#1c1c1c] text-zinc-300"
              )}
            >
              <span>{statusFilter === 'running' ? t.cards.filterApplied : t.cards.applyFilter}</span>
              <span className="text-zinc-400">→</span>
            </button>
          </div>
        </div>

        {/* Card 3: Proxied Profiles */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#1e1e1e] bg-[#0e0e0e] hover:border-[#2a2a2a] transition-all shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 pb-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs sm:text-[13px] font-medium text-zinc-300">{t.cards.proxiedProfiles}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2.5 font-sans">
              {proxiesCount}
            </div>
          </div>
          <div className="px-4 sm:px-5 py-2.5 border-t border-[#1a1a1a] flex items-center justify-end">
            <button
              onClick={() => {
                setSelectedProfileId(null);
                setStatusFilter(statusFilter === 'proxied' ? null : 'proxied');
              }}
              className={cn(
                "h-7 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                statusFilter === 'proxied'
                  ? "border-white/20 bg-white/10 text-white font-semibold"
                  : "border-[#2a2a2a] bg-[#141414] hover:bg-[#1c1c1c] text-zinc-300"
              )}
            >
              <span>{statusFilter === 'proxied' ? t.cards.filterApplied : t.cards.applyFilter}</span>
              <span className="text-zinc-400">→</span>
            </button>
          </div>
        </div>

        {/* Card 4: Favorite Profiles */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#1e1e1e] bg-[#0e0e0e] hover:border-[#2a2a2a] transition-all shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 pb-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs sm:text-[13px] font-medium text-zinc-300">{t.cards.favoriteProfiles}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2.5 font-sans flex items-center gap-2">
              <span>{favoriteCount}</span>
              {favoriteCount > 0 && (
                <Star className="w-4 h-4 fill-amber-400 text-amber-400 inline" />
              )}
            </div>
          </div>
          <div className="px-4 sm:px-5 py-2.5 border-t border-[#1a1a1a] flex items-center justify-end">
            <button
              onClick={() => {
                setSelectedProfileId(null);
                setStatusFilter(statusFilter === 'favorites' ? null : 'favorites');
              }}
              className={cn(
                "h-7 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                statusFilter === 'favorites'
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300 font-semibold"
                  : "border-[#2a2a2a] bg-[#141414] hover:bg-[#1c1c1c] text-zinc-300"
              )}
            >
              <span>{statusFilter === 'favorites' ? t.cards.filterApplied : t.cards.applyFilter}</span>
              <span className="text-zinc-400">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-5 sm:px-6 py-2.5 border-b border-border bg-card/60 flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          <Input
            icon={<Search className="w-3.5 h-3.5 text-muted-foreground" />}
            placeholder={t.profiles.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-52 sm:w-64 h-8 text-xs"
          />

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md border border-border text-xs shrink-0">
            {[
              { id: 'all', label: t.profiles.filterAll },
              { id: 'running', label: t.profiles.filterRunning },
              { id: 'idle', label: t.profiles.filterIdle },
              { id: 'error', label: t.profiles.filterError },
            ].map(({ id: st, label }) => {
              const isSelected = (statusFilter === null && st === 'all') || statusFilter === st;
              return (
                <Button
                  key={st}
                  variant={isSelected ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(st === 'all' ? null : st)}
                  className={cn(
                    'h-7 px-2.5 text-xs capitalize font-medium',
                    isSelected && 'bg-background text-foreground shadow-xs'
                  )}
                >
                  {label}
                </Button>
              );
            })}
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="w-36 shrink-0">
              <Select
                value={tagFilter || 'all'}
                onChange={(val) => setTagFilter(val === 'all' ? null : val)}
                options={[
                  { value: 'all', label: 'All Tags' },
                  ...allTags.map((t) => ({ value: t, label: `#${t}` })),
                ]}
                triggerClassName="h-8 text-xs"
              />
            </div>
          )}
        </div>

        {/* View Mode Switcher and Counts */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('table')}
              className={cn('h-7 w-7', viewMode === 'table' && 'bg-background shadow-xs text-foreground')}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className={cn('h-7 w-7', viewMode === 'grid' && 'bg-background shadow-xs text-foreground')}
              title="Bento Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            <strong className="text-foreground">{filteredProfiles.length}</strong> / {profiles.length}
          </div>
        </div>
      </div>

      {/* Bulk Action Banner */}
      {selectedIds.length > 0 && (
        <div className="px-5 sm:px-6 py-2 bg-muted/70 border-b border-border flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-foreground">
              {selectedIds.length} {selectedIds.length === 1 ? 'profile' : 'profiles'} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={deselectAll}
              className="h-7 text-xs px-2.5"
            >
              Deselect All
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => bulkStartProfiles(selectedIds)}
              className="h-7 text-xs text-emerald-400 hover:bg-emerald-500/10 px-3 gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Selected
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => bulkStopProfiles(selectedIds)}
              className="h-7 text-xs px-3 gap-1.5"
            >
              <Square className="w-3.5 h-3.5" />
              Stop Selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => bulkDeleteProfiles(selectedIds)}
              className="h-7 text-xs px-2.5 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Content Rendering: Bento Grid or Standard Table */}
      {viewMode === 'grid' ? (
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {filteredProfiles.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Search className="w-8 h-8 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">No profiles match criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProfiles.map((profile) => {
                const isSelected = selectedIds.includes(profile.id);
                const isRunning = profile.status === 'running';
                const proxy = profile.proxyId ? proxyMap.get(profile.proxyId) : null;

                return (
                  <Card
                    key={profile.id}
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={cn(
                      'group relative transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden',
                      'hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5',
                      isSelected && 'border-primary ring-1 ring-primary'
                    )}
                  >
                    <div className="p-4 space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectProfile(profile.id)}
                            />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {profile.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {profile.fingerprint.browserType} • {profile.fingerprint.osType}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleFavorite(profile.id)}
                            className={cn(
                              'h-6 w-6 p-0 hover:bg-transparent',
                              profile.isFavorite
                                ? 'text-amber-400'
                                : 'text-muted-foreground/40 hover:text-muted-foreground'
                            )}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </Button>
                        </div>
                      </div>

                      {/* Status and Specs Bento Strip */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div className="p-2 rounded-md bg-muted/50 border border-border flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Status</span>
                          {isRunning ? (
                            <span className="text-emerald-400 font-semibold font-mono text-xs flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Running
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs mt-0.5">Idle</span>
                          )}
                        </div>

                        <div className="p-2 rounded-md bg-muted/50 border border-border flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">Screen</span>
                          <span className="font-mono text-xs text-foreground mt-0.5">
                            {profile.fingerprint.screenWidth}×{profile.fingerprint.screenHeight}
                          </span>
                        </div>
                      </div>

                      {/* Proxy Pill */}
                      <div className="p-2 rounded-md bg-muted/30 border border-border text-[11px] font-mono flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-foreground truncate">
                          <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {proxy ? `${proxy.host}:${proxy.port}` : 'Direct Network'}
                          </span>
                        </div>
                        {proxy?.latencyMs && (
                          <span className="text-emerald-400 font-bold shrink-0">{proxy.latencyMs}ms</span>
                        )}
                      </div>

                      {/* Tags */}
                      {profile.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {profile.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-3 bg-muted/40 border-t border-border flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleQuickRandomize(profile, e)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Randomize Fingerprint"
                        >
                          <Dices className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(profile)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteProfile(profile.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete Profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {isRunning ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => stopProfile(profile.id)}
                          className="h-7 px-3 text-xs gap-1.5 font-medium"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          Stop
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => startProfile(profile.id)}
                          className="h-7 px-3 text-xs gap-1.5 font-semibold"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          Launch
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="flex-1 overflow-auto">
          <Table className="min-w-[840px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 px-4">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => (checked ? selectAll() : deselectAll())}
                  />
                </TableHead>
                <TableHead className="w-8 px-1 text-center">★</TableHead>
                <TableHead className="min-w-[200px]">Profile Name</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-40">Tags</TableHead>
                <TableHead className="w-48">Proxy</TableHead>
                <TableHead className="w-40">Fingerprint</TableHead>
                <TableHead className="w-32">Last Active</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Search className="w-8 h-8 text-muted-foreground/60" />
                      <p className="text-sm font-semibold text-foreground">No profiles found</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search query or filter parameters.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter(null);
                          setTagFilter(null);
                        }}
                        className="mt-2 text-xs"
                      >
                        Reset Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProfiles.map((profile) => {
                  const isSelected = selectedIds.includes(profile.id);
                  const isRunning = profile.status === 'running';
                  const proxy = profile.proxyId ? proxyMap.get(profile.proxyId) : null;

                  return (
                    <TableRow
                      key={profile.id}
                      onClick={() => setSelectedProfileId(profile.id)}
                      className="cursor-pointer group"
                      data-state={isSelected ? 'selected' : undefined}
                    >
                      {/* Checkbox */}
                      <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectProfile(profile.id)}
                        />
                      </TableCell>

                      {/* Star / Favorite */}
                      <TableCell className="px-1 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavorite(profile.id)}
                          className={cn(
                            'h-6 w-6 p-0 hover:bg-transparent',
                            profile.isFavorite
                              ? 'text-amber-400 hover:text-amber-300'
                              : 'text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover:opacity-100'
                          )}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </Button>
                      </TableCell>

                      {/* Name + Engine info */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col truncate max-w-[240px]">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate">
                                {profile.name}
                              </span>
                              {profile.isPinned && (
                                <Pin className="w-3 h-3 text-muted-foreground fill-current shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground font-mono truncate">
                              <span className="capitalize">{profile.fingerprint.osType}</span>
                              <span>•</span>
                              <span className="capitalize text-foreground font-medium">{profile.fingerprint.browserType}</span>
                              {profile.debuggingPort && (
                                <>
                                  <span>•</span>
                                  <span className="text-muted-foreground">:{profile.debuggingPort}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {isRunning ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-emerald-400 font-semibold text-xs">Running</span>
                            {profile.totalRuntimeSec > 0 && (
                              <span className="text-xs font-mono text-muted-foreground">
                                ({formatDuration(profile.totalRuntimeSec)})
                              </span>
                            )}
                          </div>
                        ) : profile.status === 'stopping' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-spin" />
                            <span className="text-amber-400 text-xs">Stopping...</span>
                          </div>
                        ) : profile.status === 'error' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-destructive" />
                            <span className="text-destructive text-xs">Failed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                            <span className="text-xs">Idle</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Tags */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5 items-center max-w-[160px]">
                          {profile.tags.length > 0 ? (
                            profile.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs py-0.5 px-2">
                                #{tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground/60 text-xs">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Proxy */}
                      <TableCell>
                        {proxy ? (
                          <div className="flex flex-col font-mono text-xs truncate max-w-[180px]">
                            <div className="flex items-center gap-1.5 text-foreground truncate">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  proxy.status === 'active'
                                    ? 'bg-emerald-400'
                                    : proxy.status === 'failed'
                                    ? 'bg-destructive'
                                    : 'bg-muted-foreground'
                                }`}
                              />
                              <span className="truncate font-medium">{proxy.host}:{proxy.port}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground uppercase mt-0.5">
                              <span>{proxy.protocol}</span>
                              {proxy.latencyMs && (
                                <span className="text-emerald-400 font-semibold">{proxy.latencyMs}ms</span>
                              )}
                              {proxy.countryCode && (
                                <span>[{proxy.countryCode}]</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs flex items-center gap-1.5 font-medium">
                            <Globe className="w-3.5 h-3.5 text-muted-foreground/70" />
                            Direct Network
                          </span>
                        )}
                      </TableCell>

                      {/* Fingerprint summary */}
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        <div className="text-foreground font-medium">{profile.fingerprint.screenWidth}×{profile.fingerprint.screenHeight}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[130px]">
                          {profile.fingerprint.timezone.replace('America/', '').replace('Europe/', '')}
                        </div>
                      </TableCell>

                      {/* Last active */}
                      <TableCell className="text-muted-foreground text-xs">
                        {formatTimeAgo(profile.lastLaunchedAt)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isRunning ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 px-2.5 text-amber-400 hover:bg-amber-500/10 text-xs font-semibold gap-1"
                              onClick={() => stopProfile(profile.id)}
                              title="Stop Profile"
                            >
                              <Square className="w-3 h-3 fill-current" />
                              Stop
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 px-2.5 text-emerald-400 hover:bg-emerald-500/10 font-semibold text-xs gap-1"
                              onClick={() => startProfile(profile.id)}
                              title="Start Profile"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Start
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleQuickRandomize(profile, e)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Quick Randomize Resolution & Timezone"
                          >
                            <Dices className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(profile)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Edit Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteProfile(profile.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete Profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedProfileId(profile.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="View Profile Details"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
