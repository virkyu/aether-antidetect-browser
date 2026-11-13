import React, { useState } from 'react';
import {
  ArrowLeft,
  Star,
  Edit2,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Play,
  Square,
  ShieldCheck,
  Globe,
  Sliders,
  Dices,
  Monitor,
  Clock,
  User,
  Key,
  MapPin,
  Sparkles,
} from 'lucide-react';
import gsap from 'gsap';
import { Button } from '../ui/Button';
import { useProfileStore } from '../../stores/profileStore';
import { useProxyStore } from '../../stores/proxyStore';
import { generateRandomFingerprint } from '../../lib/fingerprintGenerator';
import type { Profile } from '../../types/profile';

interface ProfileDetailViewProps {
  profile: Profile;
}

export const ProfileDetailView: React.FC<ProfileDetailViewProps> = ({ profile }) => {
  const {
    setSelectedProfileId,
    openEditModal,
    deleteProfile,
    startProfile,
    stopProfile,
    toggleFavorite,
    updateProfile,
  } = useProfileStore();

  const { proxies } = useProxyStore();
  const proxy = profile.proxyId ? proxies.find((p) => p.id === profile.proxyId) : null;

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isRunning = profile.status === 'running';

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField((curr) => (curr === fieldName ? null : curr));
    }, 1800);
  };

  const handleRandomize = async (e: React.MouseEvent) => {
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

  const formattedDate = new Date(profile.updatedAt || profile.createdAt).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const proxyHostPort = proxy ? `${proxy.host}:${proxy.port}` : 'Direct Network (Brak proxy)';
  const proxyUser = proxy?.username || 'Brak autoryzacji';
  const proxyPass = proxy?.password || '••••••••••••';

  const fullSpecs = `Screen: ${profile.fingerprint.screenWidth}×${profile.fingerprint.screenHeight}\nTimezone: ${profile.fingerprint.timezone} (${profile.fingerprint.language})\nCPU: ${profile.fingerprint.hardwareConcurrency} Cores | RAM: ${profile.fingerprint.deviceMemoryGb} GB\nUser Agent: ${profile.fingerprint.userAgent}`;

  const postalFormatSummary = `Rozdzielczość: ${profile.fingerprint.screenWidth}×${profile.fingerprint.screenHeight} | Strefa: ${profile.fingerprint.timezone} (${profile.fingerprint.language})
Rdzenie CPU: ${profile.fingerprint.hardwareConcurrency} Cores | RAM: ${profile.fingerprint.deviceMemoryGb} GB | Skala: ${profile.fingerprint.devicePixelRatio}x
${profile.fingerprint.userAgent}`;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a] text-[#f4f4f5] p-5 sm:p-7 space-y-5 select-none font-sans">
      {/* Top Header: Back Arrow, Profile Name, Star, Meta details, Edit & Delete */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1e1e1e]">
        <div className="flex items-start gap-3.5 min-w-0">
          <button
            onClick={() => setSelectedProfileId(null)}
            className="h-9 w-9 rounded-lg bg-[#141414] border border-[#242424] text-zinc-400 hover:text-white hover:bg-[#1c1c1c] transition-colors flex items-center justify-center shrink-0 mt-0.5 cursor-pointer"
            title="Wróć do listy profili"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                {profile.name}
              </h1>
              <button
                onClick={() => toggleFavorite(profile.id)}
                className={`h-7 w-7 rounded-md transition-colors flex items-center justify-center cursor-pointer ${
                  profile.isFavorite
                    ? 'text-amber-400'
                    : 'text-zinc-600 hover:text-zinc-300'
                }`}
                title="Dodaj do ulubionych"
              >
                <Star className={`w-4 h-4 ${profile.isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                {profile.name}
              </span>
              <span className="text-zinc-700">•</span>
              <span className="flex items-center gap-1.5 font-mono text-zinc-400">
                <Monitor className="w-3.5 h-3.5 text-zinc-500" />
                {profile.fingerprint.browserType.toUpperCase()} ({profile.fingerprint.screenWidth}×{profile.fingerprint.screenHeight})
              </span>
              <span className="text-zinc-700">•</span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                Modyfikacja: {formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <button
            onClick={() => openEditModal(profile)}
            className="h-8.5 px-3.5 rounded-lg bg-[#161616] hover:bg-[#1f1f1f] border border-[#242424] text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edytuj profil</span>
          </button>

          <button
            onClick={async () => {
              if (window.confirm(`Czy na pewno chcesz usunąć profil "${profile.name}"?`)) {
                await deleteProfile(profile.id);
                setSelectedProfileId(null);
              }
            }}
            className="h-8.5 px-3.5 rounded-lg bg-[#c53030] hover:bg-[#a82525] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Usuń</span>
          </button>
        </div>
      </div>

      {/* SECTION 0: Status konta i postęp (5 Tiles Row) */}
      <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between pb-1 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-semibold text-white">Status konta i postęp</span>
          </div>
          <span className="text-xs text-zinc-500 hidden sm:inline">
            Kliknij kafel, aby natychmiast zmienić status
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* Tile 1: Status procesu */}
          <div
            onClick={() => (isRunning ? stopProfile(profile.id) : startProfile(profile.id))}
            className="p-3 rounded-lg bg-[#161616] hover:bg-[#1c1c1c] border border-[#242424] hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between min-h-[76px]"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
                {isRunning ? (
                  <Square className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                )}
                <span className="truncate">Status procesu</span>
              </div>
            </div>
            <div className="text-xs font-semibold truncate mt-1.5">
              {isRunning ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Uruchomiony
                </span>
              ) : (
                <span className="text-zinc-500">Zatrzymany (Start)</span>
              )}
            </div>
          </div>

          {/* Tile 2: Połączenie Proxy */}
          <div
            onClick={() => openEditModal(profile)}
            className="p-3 rounded-lg bg-[#161616] hover:bg-[#1c1c1c] border border-[#242424] hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between min-h-[76px]"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                <span className="truncate">Połączenie proxy</span>
              </div>
            </div>
            <div className="text-xs font-semibold truncate text-zinc-200 mt-1.5">
              {proxy ? `${proxy.host}:${proxy.port}` : 'Direct Network'}
            </div>
          </div>

          {/* Tile 3: Tarcza WebRTC */}
          <div className="p-3 rounded-lg bg-[#161616] hover:bg-[#1c1c1c] border border-[#242424] transition-all cursor-pointer flex flex-col justify-between min-h-[76px]">
            <div className="flex items-center justify-between text-zinc-400">
              <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate">Tarcza WebRTC</span>
              </div>
            </div>
            <div className="text-xs font-semibold truncate text-emerald-400 mt-1.5">
              Ochrona aktywna
            </div>
          </div>

          {/* Tile 4: Antidetect Noise */}
          <div
            onClick={handleRandomize}
            className="p-3 rounded-lg bg-[#161616] hover:bg-[#1c1c1c] border border-[#242424] hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between min-h-[76px]"
            title="Kliknij, aby przelosować odciski Canvas, WebGL i audio"
          >
            <div className="flex items-center justify-between text-zinc-400">
              <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
                <Dices className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">Canvas & WebGL</span>
              </div>
            </div>
            <div className="text-xs font-semibold truncate text-amber-400 mt-1.5">
              Aktywny szum (Losuj)
            </div>
          </div>

          {/* Tile 5: Silnik przeglądarki */}
          <div className="p-3 rounded-lg bg-[#161616] hover:bg-[#1c1c1c] border border-[#242424] transition-all cursor-pointer flex flex-col justify-between min-h-[76px]">
            <div className="flex items-center justify-between text-zinc-400">
              <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
                <Monitor className="w-3.5 h-3.5 text-zinc-400" />
                <span className="truncate">Silnik</span>
              </div>
            </div>
            <div className="text-xs font-semibold truncate text-zinc-200 mt-1.5 uppercase">
              {profile.fingerprint.browserType} v128
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: 1. Dane osobowe / Dane profilu */}
      <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#1e1e1e] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#181818] border border-[#242424] flex items-center justify-center text-zinc-300 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight">
                1. Dane osobowe i profil
              </div>
              <div className="text-xs text-zinc-400">
                Imię, silnik, parametry z szybkim kopiowaniem do formularzy
              </div>
            </div>
          </div>

          <button
            onClick={() => handleCopy(`${profile.name} | ${profile.fingerprint.browserType} | ${profile.fingerprint.osType}`, 'fullNameSpecs')}
            className="h-8 px-3.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            {copiedField === 'fullNameSpecs' ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>Kopiuj imię i specyfikację</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Box 1: Imię profilu */}
          <div className="p-3.5 rounded-lg bg-[#161616] border border-[#242424] flex items-center justify-between hover:border-zinc-700 transition-colors">
            <div className="space-y-1 truncate pr-2">
              <div className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">
                NAZWA PROFILU / IMIĘ
              </div>
              <div className="text-sm font-semibold text-zinc-100 truncate">
                {profile.name}
              </div>
            </div>
            <button
              onClick={() => handleCopy(profile.name, 'nameField')}
              className="h-7 w-7 rounded-md text-zinc-500 hover:text-white hover:bg-[#242424] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              title="Kopiuj nazwę"
            >
              {copiedField === 'nameField' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Box 2: Silnik */}
          <div className="p-3.5 rounded-lg bg-[#161616] border border-[#242424] flex items-center justify-between hover:border-zinc-700 transition-colors">
            <div className="space-y-1 truncate pr-2">
              <div className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">
                SILNIK PRZEGLĄDARKI
              </div>
              <div className="text-sm font-semibold text-zinc-100 truncate capitalize">
                {profile.fingerprint.browserType} Browser (v128)
              </div>
            </div>
            <button
              onClick={() => handleCopy(`${profile.fingerprint.browserType} Browser`, 'engineField')}
              className="h-7 w-7 rounded-md text-zinc-500 hover:text-white hover:bg-[#242424] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              title="Kopiuj silnik"
            >
              {copiedField === 'engineField' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Box 3: System operacyjny */}
          <div className="p-3.5 rounded-lg bg-[#161616] border border-[#242424] flex items-center justify-between hover:border-zinc-700 transition-colors">
            <div className="space-y-1 truncate pr-2">
              <div className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">
                SYSTEM OPERACYJNY / PESEL
              </div>
              <div className="text-sm font-mono font-semibold text-zinc-100 truncate capitalize">
                {profile.fingerprint.osType} 64-bit
              </div>
            </div>
            <button
              onClick={() => handleCopy(`${profile.fingerprint.osType} 64-bit`, 'osField')}
              className="h-7 w-7 rounded-md text-zinc-500 hover:text-white hover:bg-[#242424] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              title="Kopiuj system"
            >
              {copiedField === 'osField' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: 2. Dane logowania / Dane sieciowe i proxy */}
      <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-3 pb-2 border-b border-[#1e1e1e]">
          <div className="w-9 h-9 rounded-xl bg-[#181818] border border-[#242424] flex items-center justify-center text-zinc-300 shrink-0">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight">
              2. Dane logowania i proxy
            </div>
            <div className="text-xs text-zinc-400">
              Zaszyfrowane hasła i e-mail / serwery proxy (odkrywanie z automatycznym ukrywaniem)
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {/* Row 1: Adres E-mail / Proxy Host */}
          <div className="p-3.5 rounded-lg bg-[#161616] border border-[#242424] flex items-center justify-between hover:border-zinc-700 transition-colors">
            <div className="space-y-1 truncate pr-2">
              <div className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">
                ADRES PROXY / SERWER HOST:PORT
              </div>
              <div className="text-sm font-mono font-semibold text-zinc-100 truncate">
                {proxyHostPort}
              </div>
            </div>
            <button
              onClick={() => handleCopy(proxyHostPort, 'proxyHostField')}
              className="h-7 w-7 rounded-md text-zinc-500 hover:text-white hover:bg-[#242424] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              title="Kopiuj serwer"
            >
              {copiedField === 'proxyHostField' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Row 2: Użytkownik Proxy / Login */}
          <div className="p-3.5 rounded-lg bg-[#161616] border border-[#242424] flex items-center justify-between hover:border-zinc-700 transition-colors">
            <div className="space-y-1 truncate pr-2">
              <div className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">
                LOGIN / UŻYTKOWNIK PROXY
              </div>
              <div className="text-sm font-mono font-semibold text-zinc-100 truncate">
                {proxyUser}
              </div>
            </div>
            {proxy?.username && (
              <button
                onClick={() => handleCopy(proxy.username || '', 'proxyUserField')}
                className="h-7 w-7 rounded-md text-zinc-500 hover:text-white hover:bg-[#242424] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                title="Kopiuj login"
              >
                {copiedField === 'proxyUserField' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Row 3: Hasło Proxy / Hasło drugorzędne */}
          <div className="p-3.5 rounded-lg bg-[#161616] border border-[#242424] flex items-center justify-between hover:border-zinc-700 transition-colors">
            <div className="space-y-1 truncate pr-2">
              <div className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">
                HASŁO PROXY / DRUGORZĘDNE
              </div>
              <div className="text-sm font-mono text-zinc-100 truncate">
                {showPassword ? proxy?.password || 'Brak hasła' : proxyPass}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="h-7 px-2.5 rounded-md bg-[#242424] hover:bg-[#292c36] text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Ukryj' : 'Pokaż'}</span>
              </button>
              {proxy?.password && (
                <button
                  onClick={() => handleCopy(proxy.password || '', 'proxyPassField')}
                  className="h-7 w-7 rounded-md text-zinc-500 hover:text-white hover:bg-[#242424] flex items-center justify-center cursor-pointer transition-colors"
                  title="Kopiuj hasło"
                >
                  {copiedField === 'proxyPassField' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Adres zamieszkania / Fingerprint */}
      <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#1e1e1e] gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#181818] border border-[#242424] flex items-center justify-center text-zinc-300 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight">
                Adres zamieszkania i odcisk palca
              </div>
              <div className="text-xs text-zinc-400">
                Rozbite pola adresowe i hardware z natychmiastowym kopiowaniem
              </div>
            </div>
          </div>

          <button
            onClick={() => handleCopy(postalFormatSummary, 'fullSpecsField')}
            className="h-8 px-3.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            {copiedField === 'fullSpecsField' ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>Kopiuj cały adres i specyfikację</span>
          </button>
        </div>

        {/* Podgląd formatu pocztowego */}
        <div className="p-3.5 rounded-lg bg-[#161616] border border-[#242424] flex items-start justify-between hover:border-zinc-700 transition-colors">
          <div className="space-y-1.5 pr-2">
            <div className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">
              PODGLĄD FORMATU POCZTOWEGO / PARAMETRÓW
            </div>
            <div className="text-xs font-mono text-zinc-200 space-y-1">
              <div>
                Rozdzielczość: <strong className="text-white">{profile.fingerprint.screenWidth}×{profile.fingerprint.screenHeight}</strong> | Strefa: <strong className="text-white">{profile.fingerprint.timezone}</strong> ({profile.fingerprint.language})
              </div>
              <div className="text-zinc-400">
                Rdzenie CPU: <strong className="text-zinc-200">{profile.fingerprint.hardwareConcurrency}</strong> | RAM: <strong className="text-zinc-200">{profile.fingerprint.deviceMemoryGb} GB</strong> | Skala ekranu: <strong className="text-zinc-200">{profile.fingerprint.devicePixelRatio}x</strong>
              </div>
              <div className="text-[11px] text-zinc-500 break-all pt-1 font-mono">
                {profile.fingerprint.userAgent}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleCopy(postalFormatSummary, 'postalField')}
            className="h-7 w-7 rounded-md text-zinc-500 hover:text-white hover:bg-[#242424] flex items-center justify-center shrink-0 cursor-pointer transition-colors mt-0.5"
            title="Kopiuj podgląd formatu"
          >
            {copiedField === 'postalField' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
