import React, { useState, useEffect } from 'react';
import { Folder as FolderIcon, Trash2, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTranslation } from '../../lib/i18n';
import { useFolderStore, FOLDER_COLOR_PRESETS, type Folder } from '../../stores/folderStore';
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
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(folderToEdit);

  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name);
      setSelectedColor(folderToEdit.color || FOLDER_COLOR_PRESETS[0].hex);
    } else {
      setName('');
      setSelectedColor(FOLDER_COLOR_PRESETS[0].hex);
    }
    setError(null);
  }, [folderToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.folders.folderName + ' jest wymagana');
      return;
    }

    if (isEditing && folderToEdit) {
      updateFolder(folderToEdit.id, trimmed, selectedColor);
    } else {
      createFolder(trimmed, selectedColor);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!folderToEdit) return;
    if (window.confirm(t.folders.confirmDelete)) {
      // Unassign profiles that belong to this folder
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
          ? 'Zmień nazwę lub kolor wybranego folderu profili.'
          : 'Utwórz nowy folder, aby grupować profile według projektów lub kategorii.'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            {t.folders.folderName}
          </label>
          <Input
            required
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder={t.folders.folderPlaceholder}
            className="h-9 text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1.5">
            {t.folders.folderColor}
          </label>
          <div className="flex items-center gap-2.5 flex-wrap">
            {FOLDER_COLOR_PRESETS.map((preset) => {
              const isSelected = selectedColor.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedColor(preset.hex)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
                    isSelected
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 border-white/40'
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
        </div>

        {/* Live Preview Card */}
        <div className="p-3 rounded-lg border border-border bg-card/60 flex items-center gap-2.5">
          <span className="text-xs text-muted-foreground">Podgląd:</span>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border"
            style={{
              backgroundColor: `${selectedColor}18`,
              borderColor: `${selectedColor}40`,
              color: selectedColor,
            }}
          >
            <FolderIcon className="w-3.5 h-3.5" />
            <span>{name.trim() || 'Nazwa folderu'}</span>
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
            <Button type="submit" variant="default" size="sm" className="text-xs px-4">
              {isEditing ? 'Zapisz zmiany' : t.folders.createFolder}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
