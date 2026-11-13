import React, { useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../ui/Select';
import { useUIStore, PRESET_ZOOM_LEVELS } from '../../stores/uiStore';

export const ZoomController: React.FC = () => {
  const { zoomLevel, zoomIn, zoomOut, setZoom, resetZoom } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          resetZoom();
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          zoomIn();
        } else if (e.deltaY > 0) {
          zoomOut();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [zoomIn, zoomOut, resetZoom]);

  return (
    <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-lg p-0.5 text-xs select-none shadow-xs">
      <Button
        variant="ghost"
        size="icon"
        onClick={zoomOut}
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        title="Zoom Out (Ctrl + -)"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </Button>

      <SelectRoot
        value={String(zoomLevel)}
        onValueChange={(val) => setZoom(Number(val))}
      >
        <SelectTrigger className="h-7 px-2 border-0 bg-transparent text-xs font-mono font-medium shadow-none hover:bg-accent/40 w-[68px]">
          <SelectValue placeholder={`${zoomLevel}%`} />
        </SelectTrigger>
        <SelectContent align="end">
          {PRESET_ZOOM_LEVELS.map((lvl) => (
            <SelectItem key={lvl} value={String(lvl)}>
              {lvl}%
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>

      <Button
        variant="ghost"
        size="icon"
        onClick={zoomIn}
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        title="Zoom In (Ctrl + +)"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </Button>

      {zoomLevel !== 100 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={resetZoom}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Reset Zoom to 100% (Ctrl + 0)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
};
