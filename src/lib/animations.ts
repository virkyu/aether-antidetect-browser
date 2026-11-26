import { useEffect, type DependencyList, type RefObject } from 'react';
import gsap from 'gsap';

export interface StaggerOptions {
  y?: number;
  x?: number;
  duration?: number;
  stagger?: number;
  maxItems?: number;
}

/**
 * Animates matching descendant elements with a smooth GPU-composited GSAP stagger,
 * clearing inline transform/opacity upon completion so fixed/sticky layouts stay intact.
 */
export function useStaggerEntrance(
  containerRef: RefObject<HTMLElement | null>,
  selector: string,
  deps: DependencyList = [],
  options: StaggerOptions = {}
): void {
  const { y = 10, x = 0, duration = 0.26, stagger = 0.03, maxItems = 24 } = options;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = Array.from(container.querySelectorAll(selector)).slice(0, maxItems);
    if (elements.length === 0) return;

    gsap.killTweensOf(elements);
    gsap.fromTo(
      elements,
      { opacity: 0, y, x },
      {
        opacity: 1,
        y: 0,
        x: 0,
        duration,
        stagger,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
