import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  User,
  ShieldCheck,
  Zap,
  Layers,
  Puzzle,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  PlusSquare,
  PlusCircle,
  Plus,
  Star,
  Radio,
  Cpu,
  Copy,
  Globe,
} from 'lucide-react';
import gsap from 'gsap';
import aetherLogo from '../../assets/logo.png';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useTranslation } from '../../lib/i18n';
import { useProfileStore } from '../../stores/profileStore';
import { useProxyStore } from '../../stores/proxyStore';
import { useUserStore } from '../../stores/userStore';
import { cn } from '../../lib/utils';

export type NavTab = 
  | 'profiles'
  | 'proxies'
  | 'automation'
  | 'synchronizer'
  | 'extensions'
  | 'activity'
  | 'settings';

interface AppShellProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    profiles,
    openCreateModal,
    openBulkCreateModal,
    setSelectedProfileId,
    setStatusFilter,
    statusFilter,
  } = useProfileStore();
  const { proxies } = useProxyStore();
  const { name, openNamePrompt } = useUserStore();
  const mainContentRef = useRef<HTMLDivElement>(null);

  const runningCount = profiles.filter((p) => p.status === 'running').length;
  const idleCount = profiles.filter((p) => p.status === 'idle' || !p.status).length;
  const errorCount = profiles.filter((p) => p.status === 'error').length;
  const activeProxiesCount = proxies.filter((p) => p.status === 'active').length;

  // GSAP tab switch transition
  useEffect(() => {
    if (mainContentRef.current) {
      gsap.fromTo(
        mainContentRef.current,
        { opacity: 0, y: 4 },
        { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' }
      );
    }
  }, [currentTab]);

  const favoriteCount = profiles.filter((p) => p.isFavorite).length;
  const proxiedCount = profiles.filter((p) => !!p.proxyId).length;
  const { t, language, setLanguage } = useTranslation();

  const navItems = [
    { id: 'profiles' as NavTab, label: t.nav.allProfiles, icon: Users, count: profiles.length },
    { id: 'favorites' as any, label: t.nav.favorites, icon: Star, count: favoriteCount },
    { id: 'proxies' as NavTab, label: t.nav.proxies, icon: ShieldCheck, count: proxies.length },
    { id: 'synchronizer' as NavTab, label: t.nav.synchronizer, icon: Layers },
    { id: 'automation' as NavTab, label: t.nav.automation, icon: Zap },
    { id: 'extensions' as NavTab, label: t.nav.extensions, icon: Puzzle },
    { id: 'activity' as NavTab, label: t.nav.activity, icon: History },
    { id: 'settings' as NavTab, label: t.nav.settings, icon: Settings },
  ];

  return (
    <div className="fixed inset-0 w-full h-full flex overflow-hidden bg-[#0a0a0a] text-foreground select-none">
      {/* Canonical dark sidebar matching mockup */}
      <aside
        className={`flex flex-col border-r border-[#1a1a1a] bg-[#0a0a0a] transition-all duration-200 z-20 shrink-0 ${
          collapsed ? 'w-16' : 'w-60 xl:w-64'
        }`}
      >
        {/* Brand / Logo lockup matching user image */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-3.5 overflow-hidden">
            <img
              src={aetherLogo}
              alt="Aether"
              className={cn(
                "object-contain shrink-0 drop-shadow-md select-none transition-all",
                collapsed ? "h-10 w-10 mx-auto" : "h-13 w-13"
              )}
            />
            {!collapsed && (
              <div className="flex flex-col truncate select-none">
                <span className="text-[20px] font-black tracking-wider text-white uppercase leading-none font-sans">
                  Aether
                </span>
                <span className="text-[11.5px] font-extrabold text-white tracking-[0.28em] uppercase leading-none mt-2 opacity-95">
                  Antidetect
                </span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-[#181818] shrink-0 ml-1"
            title={collapsed ? 'Rozwiń pasek boczny' : 'Zwiń pasek boczny'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Prominent White "Create Profile" button matching user image */}
        <div className="px-3 pb-3.5 pt-1 shrink-0">
          <button
            onClick={openCreateModal}
            className="w-full h-10 rounded-lg bg-white hover:bg-zinc-100 active:scale-[0.98] text-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer select-none px-2"
            title="Create Profile"
          >
            <PlusCircle className="w-5 h-5 text-black stroke-[2.5] shrink-0" />
            {!collapsed && (
              <span className="truncate text-[15.5px] font-black tracking-tight leading-none text-black">
                Create Profile
              </span>
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2.5 py-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isFav = item.id === ('favorites' as any);
            const active = isFav
              ? currentTab === 'profiles' && statusFilter === 'favorites'
              : currentTab === item.id && statusFilter !== 'favorites';

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isFav) {
                    onTabChange('profiles');
                    setSelectedProfileId(null);
                    setStatusFilter('favorites');
                  } else {
                    onTabChange(item.id as NavTab);
                    if (item.id === 'profiles') {
                      setSelectedProfileId(null);
                      setStatusFilter(null);
                    }
                  }
                }}
                className={cn(
                  'flex items-center w-full h-8.5 px-3 rounded-md text-xs font-medium justify-start transition-colors cursor-pointer',
                  active
                    ? 'bg-[#181818] text-white font-semibold border border-[#2a2a2a]'
                    : 'text-zinc-400 hover:text-white hover:bg-[#141414]'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-zinc-500')} />
                {!collapsed && (
                  <span className="ml-2.5 truncate text-left flex-1">{item.label}</span>
                )}
                {!collapsed && item.count !== undefined && (
                  <span className="ml-auto text-[11px] font-mono text-zinc-500 font-medium">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom System Monitor */}
        {!collapsed && (
          <div className="p-3 border-t border-[#1a1a1a] bg-[#0a0a0a] space-y-1.5 shrink-0">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                Active Sessions
              </span>
              <span className="font-mono text-foreground font-semibold">{runningCount}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Proxies Alive
              </span>
              <span className="font-mono text-foreground font-semibold">{activeProxiesCount}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] overflow-hidden">
        {/* Top Header */}
        <header className="h-14 px-5 sm:px-6 border-b border-[#1a1a1a] flex items-center justify-between shrink-0 bg-[#0a0a0a]/90 backdrop-blur-xs gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {collapsed ? (
              <img
                src={aetherLogo}
                alt="Aether"
                className="h-8 w-8 object-contain shrink-0 drop-shadow-sm select-none"
              />
            ) : null}
            <h1 className="text-sm sm:text-base font-bold text-foreground uppercase tracking-wider truncate">
              {currentTab === 'profiles'
                ? t.nav.allProfiles
                : currentTab === 'proxies'
                ? t.nav.proxies
                : currentTab === 'automation'
                ? t.nav.automation
                : currentTab === 'synchronizer'
                ? t.nav.synchronizer
                : currentTab === 'extensions'
                ? t.nav.extensions
                : currentTab === 'activity'
                ? t.nav.activity
                : t.nav.settings}
            </h1>
            {runningCount > 0 && (
              <Badge variant="success" className="shrink-0 text-[10px] px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                {runningCount} {t.nav.activeSessionsBadge}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* User Name Pill */}
            <Button
              variant="outline"
              size="sm"
              onClick={openNamePrompt}
              className="h-8 gap-2 text-xs font-medium border-border hover:bg-secondary/60 transition-colors"
              title={t.nav.changeName}
            >
              <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold text-[10px]">
                {name ? name.charAt(0).toUpperCase() : <User className="w-3 h-3 text-muted-foreground" />}
              </div>
              <span className="max-w-[110px] truncate text-foreground">
                {name || t.nav.enterName}
              </span>
            </Button>

            {/* Language Switcher */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(language === 'pl' ? 'en' : 'pl')}
              className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-border hover:bg-secondary/60 transition-colors"
              title={language === 'pl' ? 'Switch to English' : 'Przełącz na polski'}
            >
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-mono text-[11px] font-bold text-foreground">
                {language.toUpperCase()}
              </span>
            </Button>

            {currentTab === 'profiles' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openBulkCreateModal}
                  className="h-8 text-xs gap-1.5 font-medium"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">{t.nav.bulkGenerate}</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={openCreateModal}
                  className="h-8 text-xs gap-1.5 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.nav.newProfile}</span>
                </Button>
              </div>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main ref={mainContentRef} className="flex-1 overflow-hidden relative flex flex-col min-w-0 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
};
