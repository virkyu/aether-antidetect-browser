import React, { useState, useEffect } from 'react';
import { Folder as FolderIcon, Trash2, Check, Pipette, Sparkles } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTranslation } from '../../lib/i18n';
import {
  useFolderStore,
  FOLDER_COLOR_PRESETS,
  FOLDER_ICON_PRESETS,
  type Folder,
} from '../../stores/folderStore';
import { useProfileStore } from '../../stores/profileStore';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderToEdit?: Folder | null;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  folderToEdit,
}) => {
  const { t } = useTranslation();
  const { createFolder, updateFolder, deleteFolder } = useFolderStore();
  const { profiles, moveProfilesToFolder } = useProfileStore();

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLOR_PRESETS[0].hex);
  const [selectedIcon, setSelectedIcon] = useState('📁');
  const [hexInput, setHexInput] = useState(FOLDER_COLOR_PRESETS[0].hex);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(folderToEdit);

  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name);
      const color = folderToEdit.color || FOLDER_COLOR_PRESETS[0].hex;
      setSelectedColor(color);
      setHexInput(color);
      setSelectedIcon(folderToEdit.icon || '📁');
    } else {
      setName('');
      setSelectedColor(FOLDER_COLOR_PRESETS[0].hex);
      setHexInput(FOLDER_COLOR_PRESETS[0].hex);
      setSelectedIcon('📁');
    }
    setError(null);
  }, [folderToEdit, isOpen]);

  if (!isOpen) return null;

  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    setHexInput(newColor);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('#') && val.length > 0) {
      val = '#' + val;
    }
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setSelectedColor(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.folders.folderName + ' jest wymagana');
      return;
    }

    const finalColor = selectedColor || FOLDER_COLOR_PRESETS[0].hex;

    if (isEditing && folderToEdit) {
      updateFolder(folderToEdit.id, trimmed, finalColor, selectedIcon);
    } else {
      createFolder(trimmed, finalColor, selectedIcon);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!folderToEdit) return;
    if (window.confirm(t.folders.confirmDelete)) {
      const profilesInFolder = profiles.filter((p) => p.groupId === folderToEdit.id);
      if (profilesInFolder.length > 0) {
        moveProfilesToFolder(
          profilesInFolder.map((p) => p.id),
          null,
          undefined
        );
      }
      deleteFolder(folderToEdit.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t.folders.editFolder : t.folders.createFolder}
      description={
        isEditing
          ? 'Dostosuj nazwę, własny kolor oraz ikonę folderu profili.'
          : 'Utwórz nowy folder z własnym kolorem i ikoną, aby wygodnie grupować profile.'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs">
            {error}
          </div>
        )}

        {/* Folder Name & Icon Selector */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            {t.folders.folderName} & Ikona
          </label>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-9 rounded-lg border border-border bg-muted/40 text-lg shrink-0">
              {selectedIcon}
            </div>
            <Input
              required
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t.folders.folderPlaceholder}
              className="h-9 text-xs flex-1"
            />
          </div>

          {/* Quick Icon Selector */}
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
            {FOLDER_ICON_PRESETS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setSelectedIcon(icon)}
                className={`w-7 h-7 rounded-md flex items-center justify-center text-sm cursor-pointer transition-all border ${
                  selectedIcon === icon
                    ? 'border-primary bg-primary/20 scale-110 shadow-xs'
                    : 'border-border/60 hover:bg-muted/60 opacity-80 hover:opacity-100'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Color Palette & Custom Hex/Picker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-foreground">
              {t.folders.folderColor}
            </label>
            <span className="text-[11px] font-mono text-muted-foreground uppercase">
              {selectedColor}
            </span>
          </div>

          {/* Preset Swatches */}
          <div className="flex items-center gap-2 flex-wrap">
            {FOLDER_COLOR_PRESETS.map((preset) => {
              const isSelected = selectedColor.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleColorChange(preset.hex)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                    isSelected
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 border-white/50 shadow-md'
                      : 'border-white/10 hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              );
            })}
          </div>

          {/* Real Custom Color Picker & HEX input */}
          <div className="flex items-center gap-2.5 pt-1">
            <label
              className="relative w-8 h-8 rounded-lg border border-border flex items-center justify-center cursor-pointer overflow-hidden shadow-xs hover:border-primary/60 transition-colors"
              title="Wybierz dowolny własny kolor (Color Picker)"
              style={{ backgroundColor: selectedColor }}
            >
              <Pipette className="w-3.5 h-3.5 text-white mix-blend-difference" />
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
            </label>

            <div className="flex-1 flex items-center gap-2">
              <Input
                value={hexInput}
                onChange={handleHexInputChange}
                placeholder="#3B82F6"
                maxLength={7}
                className="h-8 text-xs font-mono uppercase"
              />
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                Dowolny HEX
              </span>
            </div>
          </div>
        </div>

        {/* Live Preview Card with Real Glow Effect */}
        <div className="p-3.5 rounded-xl border border-border bg-[#0e0e0e] flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground font-medium">Podgląd:</span>
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold border transition-all"
              style={{
                backgroundColor: `${selectedColor}18`,
                borderColor: `${selectedColor}50`,
                color: selectedColor,
                boxShadow: `0 0 12px ${selectedColor}25`,
              }}
            >
              <span>{selectedIcon}</span>
              <span>{name.trim() || 'Nazwa folderu'}</span>
            </span>
          </div>

          <span className="text-[10px] font-mono text-zinc-500">
            3 profile
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          {isEditing ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-xs text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t.folders.deleteFolder}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Anuluj
            </Button>
            <Button type="submit" variant="default" size="sm" className="text-xs px-4 font-semibold">
              {isEditing ? 'Zapisz zmiany' : t.folders.createFolder}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
