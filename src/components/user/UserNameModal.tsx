import React, { useState, useEffect } from 'react';
import { User, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { useUserStore } from '../../stores/userStore';
import aetherLogo from '../../assets/logo.png';

export const UserNameModal: React.FC = () => {
  const {
    name,
    askOnStartup,
    isNamePromptOpen,
    setName,
    setAskOnStartup,
    closeNamePrompt,
  } = useUserStore();

  const [inputVal, setInputVal] = useState(name);
  const [askStartupLocal, setAskStartupLocal] = useState(askOnStartup);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens or global state changes
  useEffect(() => {
    if (isNamePromptOpen) {
      setInputVal(name);
      setAskStartupLocal(askOnStartup);
      setError(null);
    }
  }, [isNamePromptOpen, name, askOnStartup]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = inputVal.trim();
    if (!trimmed) {
      setError('Wpisz swoje imię, aby kontynuować');
      return;
    }

    setAskOnStartup(askStartupLocal);
    setName(trimmed);
  };

  return (
    <Dialog
      open={isNamePromptOpen}
      onOpenChange={(open) => {
        if (!open && name) {
          closeNamePrompt();
        }
      }}
    >
      <DialogContent className="max-w-md p-6 bg-card border-border shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#141414] border border-[#242424] p-1.5 shrink-0 shadow-xs">
                <img src={aetherLogo} alt="Aether" className="w-full h-full object-contain" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  Jak masz na imię?
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Witaj w Aether Antidetect Suite! Podaj swoje imię, aby rozpocząć pracę.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <label className="text-xs font-medium text-foreground block">
              Twoje imię
            </label>
            <Input
              autoFocus
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                if (error) setError(null);
              }}
              placeholder="np. Kuba, Alex, Michał..."
              icon={<User className="w-4 h-4" />}
              error={error ?? undefined}
              className="h-10 text-xs bg-background"
            />

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="askStartup"
                checked={askStartupLocal}
                onCheckedChange={(checked) => setAskStartupLocal(Boolean(checked))}
              />
              <label
                htmlFor="askStartup"
                className="text-[11px] text-muted-foreground cursor-pointer select-none leading-none"
              >
                Pytaj o imię przy każdym uruchomieniu aplikacji
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            {name ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeNamePrompt}
                className="h-9 text-xs"
              >
                Anuluj
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={!inputVal.trim()}
              className="h-9 px-5 text-xs font-semibold"
            >
              Zatwierdź
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
