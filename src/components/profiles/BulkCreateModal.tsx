import React, { useState, useMemo } from 'react';
import { Dices, X, Plus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { useTranslation } from '../../lib/i18n';
import { useProfileStore } from '../../stores/profileStore';
import { useProxyStore } from '../../stores/proxyStore';
import { cn } from '../../lib/utils';
import type { OsType, BrowserType } from '../../types/profile';

export const BulkCreateModal: React.FC = () => {
  const { profiles, activeModal, closeModal, bulkCreateProfiles } = useProfileStore();
  const { proxies } = useProxyStore();
  const { t } = useTranslation();

  const isOpen = activeModal === 'bulk_create';

  const [count, setCount] = useState(5);
  const [namePrefix, setNamePrefix] = useState('Profile');
  const [osType, setOsType] = useState<OsType>('windows');
  const [browserType, setBrowserType] = useState<BrowserType>('brave');
  const [tags, setTags] = useState('fleet');
  const [useProxies, setUseProxies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Existing tags across all profiles
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const proxyIds = useProxies && proxies.length > 0 ? proxies.map((p) => p.id) : undefined;

      await bulkCreateProfiles({
        count,
        namePrefix,
        osType,
        browserType,
        tags: tagArray,
        proxyIds,
      });
      closeModal();
    } catch (err: any) {
      console.error('Bulk create profiles failed:', err);
      setSubmitError(typeof err === 'string' ? err : err?.message || 'Bulk generation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Bulk Generate Browser Profiles"
      description="Quickly generate multiple isolated profiles with unique hardware fingerprints and proxy distribution."
      maxWidth="md"
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Number of Profiles</label>
            <Input
              type="number"
              min={1}
              max={100}
              required
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Name Prefix</label>
            <Input
              required
              value={namePrefix}
              onChange={(e) => setNamePrefix(e.target.value)}
              placeholder="e.g. Profile"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Base OS Target</label>
            <Select
              value={osType}
              onChange={(val) => setOsType(val as OsType)}
              options={[
                { value: 'windows', label: 'Windows 10/11' },
                { value: 'macos', label: 'macOS (Apple)' },
                { value: 'linux', label: 'Linux (Ubuntu)' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Browser Engine</label>
            <Select
              value={browserType}
              onChange={(val) => setBrowserType(val as BrowserType)}
              options={[
                { value: 'brave', label: 'Brave Browser', badge: 'Active' },
                { value: 'chrome', label: 'Google Chrome' },
                { value: 'edge', label: 'Microsoft Edge' },
              ]}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-foreground">
            {t.modal.tagsLabel}
          </label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t.modal.tagsPlaceholder}
            className="h-8.5 text-xs font-mono"
          />

          {/* Selected tags badges with remove */}
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

          {/* Existing tags suggestions */}
          {existingTags.length > 0 && (
            <div className="pt-1">
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

        {proxies.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="useProxies"
              checked={useProxies}
              onCheckedChange={(checked) => setUseProxies(!!checked)}
            />
            <label htmlFor="useProxies" className="text-xs text-muted-foreground cursor-pointer select-none">
              Distribute round-robin across {proxies.length} available proxies
            </label>
          </div>
        )}

        <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground flex items-center gap-2">
          <Dices className="w-4 h-4 text-foreground shrink-0" />
          <span>
            Every profile automatically receives unique screen metrics, randomized User-Agents, and isolated directory storage.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={closeModal} className="text-xs h-8.5 px-3">
            Cancel
          </Button>
          <Button type="submit" variant="default" loading={isSubmitting} className="text-xs h-8.5 px-4 font-semibold">
            Generate {count} Profiles
          </Button>
        </div>
      </form>
    </Modal>
  );
};
