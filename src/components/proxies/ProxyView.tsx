import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Zap,
  Globe,
  ClipboardPaste,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui/Table';
import { useTranslation } from '../../lib/i18n';
import { useProxyStore } from '../../stores/proxyStore';
import { parseProxyString } from '../../lib/proxyParser';
import { cn } from '../../lib/utils';
import type { ProxyProtocol } from '../../types/proxy';

export const ProxyView: React.FC = () => {
  const { t } = useTranslation();
  const {
    proxies,
    isLoading,
    isCheckingAll,
    checkingIds,
    activeModal,
    openCreateModal,
    openImportModal,
    closeModal,
    createProxy,
    bulkImportProxies,
    deleteProxy,
    checkProxy,
    checkAllProxies,
  } = useProxyStore();

  // Quick bar state
  const [quickProxyInput, setQuickProxyInput] = useState('');
  const [quickProtocol, setQuickProtocol] = useState<ProxyProtocol>('http');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Modal single proxy form state
  const [quickModalPaste, setQuickModalPaste] = useState('');
  const [title, setTitle] = useState('');
  const [protocol, setProtocol] = useState<ProxyProtocol>('http');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(8080);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk import state
  const [bulkText, setBulkText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'failed' | null>(null);

  // Quick Add handler (from toolbar input)
  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setQuickError(null);

    const parsed = parseProxyString(quickProxyInput, quickProtocol);
    if (!parsed) {
      setQuickError('Invalid format. Use: hostname:port:login:password or hostname:port');
      return;
    }

    setIsQuickAdding(true);
    try {
      const created = await createProxy({
        title: `${parsed.host}:${parsed.port}`,
        protocol: parsed.protocol,
        host: parsed.host,
        port: parsed.port,
        username: parsed.username,
        password: parsed.password,
      });
      setQuickProxyInput('');
      // Immediately test the connection
      if (created && created.id) {
        checkProxy(created.id);
      }
    } catch (err: any) {
      setQuickError(String(err));
    } finally {
      setIsQuickAdding(false);
    }
  };

  // Clipboard paste handler
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setQuickProxyInput(text.trim());
        const parsed = parseProxyString(text.trim(), quickProtocol);
        if (parsed) {
          setQuickProtocol(parsed.protocol);
        }
      }
    } catch (e) {
      console.error('Clipboard read failed:', e);
    }
  };

  // Single modal form quick parse
  const handleModalQuickPaste = (val: string) => {
    setQuickModalPaste(val);
    const parsed = parseProxyString(val, protocol);
    if (parsed) {
      setHost(parsed.host);
      setPort(parsed.port);
      setProtocol(parsed.protocol);
      setUsername(parsed.username || '');
      setPassword(parsed.password || '');
      if (!title) {
        setTitle(`${parsed.host}:${parsed.port}`);
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await createProxy({
        title: title || undefined,
        protocol,
        host,
        port,
        username: username || undefined,
        password: password || undefined,
      });
      closeModal();
      setTitle('');
      setHost('');
      setUsername('');
      setPassword('');
      setQuickModalPaste('');
      if (created && created.id) {
        checkProxy(created.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await bulkImportProxies(bulkText);
      closeModal();
      setBulkText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = proxies.filter((p) => p.status === 'active').length;
  const failedCount = proxies.filter((p) => p.status === 'failed').length;
  const avgLatency = (() => {
    const active = proxies.filter((p) => p.latencyMs && p.latencyMs > 0);
    if (active.length === 0) return '—';
    return `${Math.round(active.reduce((acc, p) => acc + (p.latencyMs || 0), 0) / active.length)} ms`;
  })();

  const displayedProxies = proxies.filter((p) => !statusFilter || p.status === statusFilter);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* 4 Metric Cards in dark theme with Satoshi typography and functional filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 px-5 sm:px-6 py-4 border-b border-[#1a1a1a] bg-[#0a0a0a] shrink-0">
        {/* Card 1: Configured Proxies */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#1e1e1e] bg-[#0e0e0e] hover:border-[#2a2a2a] transition-all shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 pb-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs sm:text-[13px] font-medium text-zinc-300">{t.cards.configuredProxies}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2.5 font-sans">
              {proxies.length}
            </div>
          </div>
          <div className="px-4 sm:px-5 py-2.5 border-t border-[#1a1a1a] flex items-center justify-end">
            <button
              onClick={() => setStatusFilter(null)}
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

        {/* Card 2: Online Proxies */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#1e1e1e] bg-[#0e0e0e] hover:border-[#2a2a2a] transition-all shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 pb-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs sm:text-[13px] font-medium text-zinc-300">{t.cards.onlineProxies}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2.5 font-sans flex items-center gap-2.5">
              <span>{activeCount}</span>
              {activeCount > 0 && (
                <span className="text-[11px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {t.cards.running}
                </span>
              )}
            </div>
          </div>
          <div className="px-4 sm:px-5 py-2.5 border-t border-[#1a1a1a] flex items-center justify-end">
            <button
              onClick={() => setStatusFilter(statusFilter === 'active' ? null : 'active')}
              className={cn(
                "h-7 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                statusFilter === 'active'
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-semibold"
                  : "border-[#2a2a2a] bg-[#141414] hover:bg-[#1c1c1c] text-zinc-300"
              )}
            >
              <span>{statusFilter === 'active' ? t.cards.filterApplied : t.cards.applyFilter}</span>
              <span className="text-zinc-400">→</span>
            </button>
          </div>
        </div>

        {/* Card 3: Offline / Failed */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#1e1e1e] bg-[#0e0e0e] hover:border-[#2a2a2a] transition-all shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 pb-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs sm:text-[13px] font-medium text-zinc-300">{t.cards.offlineProxies}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2.5 font-sans">
              {failedCount}
            </div>
          </div>
          <div className="px-4 sm:px-5 py-2.5 border-t border-[#1a1a1a] flex items-center justify-end">
            <button
              onClick={() => setStatusFilter(statusFilter === 'failed' ? null : 'failed')}
              className={cn(
                "h-7 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                statusFilter === 'failed'
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300 font-semibold"
                  : "border-[#2a2a2a] bg-[#141414] hover:bg-[#1c1c1c] text-zinc-300"
              )}
            >
              <span>{statusFilter === 'failed' ? t.cards.filterApplied : t.cards.applyFilter}</span>
              <span className="text-zinc-400">→</span>
            </button>
          </div>
        </div>

        {/* Card 4: Average Latency */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#1e1e1e] bg-[#0e0e0e] hover:border-[#2a2a2a] transition-all shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 pb-3">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs sm:text-[13px] font-medium text-zinc-300">{t.cards.averageLatency}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2.5 font-sans">
              {avgLatency}
            </div>
          </div>
          <div className="px-4 sm:px-5 py-2.5 border-t border-[#1a1a1a] flex items-center justify-end">
            <button
              onClick={checkAllProxies}
              className="h-7 px-3 rounded-md border border-[#2a2a2a] bg-[#141414] hover:bg-[#1c1c1c] text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{t.cards.testAll}</span>
              <span className="text-zinc-400">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Banner (hostname:port:login:password) */}
      <div className="px-5 sm:px-6 py-2.5 border-b border-border bg-card flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2 flex-1 min-w-[320px] max-w-2xl">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold shrink-0">
            <Zap className="w-4 h-4 text-amber-400 fill-current" />
            <span className="hidden sm:inline">{t.proxies.quickAdd}</span>
          </div>

          <div className="w-28 shrink-0">
            <Select
              value={quickProtocol}
              onChange={(val) => setQuickProtocol(val as ProxyProtocol)}
              options={[
                { value: 'http', label: 'HTTP' },
                { value: 'https', label: 'HTTPS' },
                { value: 'socks5', label: 'SOCKS5' },
              ]}
              triggerClassName="h-8 text-xs font-mono uppercase bg-background"
            />
          </div>

          <div className="relative flex-1">
            <Input
              type="text"
              value={quickProxyInput}
              onChange={(e) => {
                setQuickProxyInput(e.target.value);
                setQuickError(null);
              }}
              placeholder={t.proxies.quickAddPlaceholder}
              className="h-8 font-mono text-xs"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePasteClipboard}
            className="h-8 px-2.5 text-xs"
            title="Paste from Clipboard"
          >
            <ClipboardPaste className="w-3.5 h-3.5 mr-1" />
            <span className="hidden md:inline text-[11px]">{t.proxies.paste}</span>
          </Button>

          <Button
            type="submit"
            variant="default"
            size="sm"
            loading={isQuickAdding}
            className="h-8 px-3 text-xs font-semibold shrink-0"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {t.proxies.add}
          </Button>
        </form>

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={openCreateModal}
            className="h-8 text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Detailed Form
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={openImportModal}
            className="h-8 text-xs gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            Bulk Paste
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={checkAllProxies}
            loading={isCheckingAll}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Test All
          </Button>
        </div>
      </div>

      {/* Quick error notification */}
      {quickError && (
        <div className="px-6 py-2 bg-destructive/15 border-b border-destructive/30 text-destructive text-xs flex items-center justify-between">
          <span>{quickError}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQuickError(null)}
            className="h-5 w-5 text-destructive hover:bg-destructive/20"
          >
            ✕
          </Button>
        </div>
      )}

      {/* Proxy Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-5 w-60">Proxy Title</TableHead>
              <TableHead className="px-4 w-28">Protocol</TableHead>
              <TableHead className="px-4 w-64">Host & Port</TableHead>
              <TableHead className="px-4 w-36">Status</TableHead>
              <TableHead className="px-4 w-28">Latency</TableHead>
              <TableHead className="px-4 w-44">Public Exit IP</TableHead>
              <TableHead className="px-5 w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedProxies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-20 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
                      <ShieldCheck className="w-6 h-6 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {statusFilter ? `No ${statusFilter} proxies found` : 'No Proxies Configured'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {statusFilter
                          ? 'Try clearing the filter or checking other proxy statuses.'
                          : 'Use the Quick Add bar above or paste in format host:port:login:password'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {statusFilter ? (
                        <Button variant="outline" size="sm" onClick={() => setStatusFilter(null)}>
                          Clear Filter
                        </Button>
                      ) : (
                        <>
                          <Button variant="default" size="sm" onClick={openCreateModal}>
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Add Single Proxy
                          </Button>
                          <Button variant="outline" size="sm" onClick={openImportModal}>
                            <Upload className="w-3.5 h-3.5 mr-1" />
                            Bulk Import
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayedProxies.map((proxy) => {
                const isChecking = checkingIds.includes(proxy.id);
                return (
                  <TableRow key={proxy.id} className="transition-colors">
                    <TableCell className="px-5 py-3 font-semibold text-foreground">
                      {proxy.title || `${proxy.host}:${proxy.port}`}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="secondary" className="uppercase font-mono text-[10px]">
                        {proxy.protocol}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-foreground text-xs">
                      {proxy.host}:{proxy.port}
                      {proxy.username && (
                        <span className="text-[10px] text-muted-foreground ml-1.5 font-normal">
                          ({proxy.username})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {isChecking ? (
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Testing...</span>
                        </div>
                      ) : proxy.status === 'active' ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Connected</span>
                        </div>
                      ) : proxy.status === 'failed' ? (
                        <div className="flex items-center gap-1.5 text-destructive font-medium" title={proxy.errorMessage}>
                          <XCircle className="w-3.5 h-3.5 text-destructive" />
                          <span>Failed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Untested</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs">
                      {proxy.latencyMs ? (
                        <span
                          className={cn(
                            'font-semibold inline-flex items-center gap-1.5',
                            proxy.latencyMs < 150
                              ? 'text-emerald-400'
                              : proxy.latencyMs < 350
                              ? 'text-amber-400'
                              : 'text-orange-400'
                          )}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              proxy.latencyMs < 150
                                ? 'bg-emerald-400 animate-pulse'
                                : proxy.latencyMs < 350
                                ? 'bg-amber-400'
                                : 'bg-orange-400'
                            )}
                          />
                          {proxy.latencyMs} ms
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-mono text-xs text-foreground">
                      {proxy.exitIp ? (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-muted-foreground" />
                          <span>{proxy.exitIp}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs px-2.5 font-medium"
                          loading={isChecking}
                          onClick={() => checkProxy(proxy.id)}
                        >
                          Check
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteProxy(proxy.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete Proxy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add Single Proxy Modal */}
      <Modal
        isOpen={activeModal === 'create'}
        onClose={closeModal}
        title="Add Proxy"
        description="Paste hostname:port:login:password for instant autofill, or configure manually."
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {/* Quick string paste */}
          <div className="p-3.5 rounded-lg bg-card border border-border space-y-1.5">
            <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Quick Fill from String (host:port:login:password)
            </label>
            <Input
              value={quickModalPaste}
              onChange={(e) => handleModalQuickPaste(e.target.value)}
              placeholder="e.g. 185.220.101.5:9050:admin:secret123"
              className="font-mono text-xs bg-background"
            />
            {host && (
              <div className="text-[11px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
                <span>✓ Parsed:</span>
                <span className="font-semibold text-foreground">{host}:{port}</span>
                {username && <span className="text-muted-foreground">({username})</span>}
                <span className="text-muted-foreground uppercase">[{protocol}]</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Proxy Name (Optional)</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. US Residential 01"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Protocol</label>
              <Select
                value={protocol}
                onChange={(val) => setProtocol(val as ProxyProtocol)}
                options={[
                  { value: 'http', label: 'HTTP' },
                  { value: 'https', label: 'HTTPS' },
                  { value: 'socks5', label: 'SOCKS5' },
                ]}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1.5">Host / IP</label>
              <Input
                required
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="192.168.1.1 or proxy.net"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Port</label>
              <Input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Username (Optional)</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Password (Optional)</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="default" loading={isSubmitting}>
              Add Proxy
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={activeModal === 'import'}
        onClose={closeModal}
        title="Bulk Import Proxies"
        description="Paste multiple proxies, one per line. Format: hostname:port:login:password or hostname:port"
        maxWidth="lg"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <div>
            <textarea
              required
              rows={9}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`127.0.0.1:8080\n192.168.1.50:9050:myuser:mypass\nsocks5://admin:secret@proxy.com:1080\nproxy.residential.com:8000:client44:pass999`}
              className="w-full rounded-md bg-background border border-input p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="default" loading={isSubmitting}>
              Import Proxies
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
