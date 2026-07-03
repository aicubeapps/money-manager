import { useRef, useState } from 'react';

const PULL_TRIGGER_THRESHOLD_PX = 70;
const MAX_PULL_PX = 100;

/**
 * Lightweight touch-based pull-to-refresh. No native browser support is
 * relied on, and no physics/elasticity beyond a linear-with-cap pull
 * distance — a functional, simple version is enough for a personal app.
 * Only activates when the gesture starts at the top of the scrollable
 * container (scrollTop === 0), so it doesn't fight normal scrolling.
 */
export const usePullToRefresh = (onRefresh: () => Promise<void> | void) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);

  const onTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (refreshing) return;
    const target = e.currentTarget;
    if (target.scrollTop > 0) {
      startY.current = null;
      return;
    }
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  };

  const onTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (!pulling.current || startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    // Only take over the gesture (and block native scroll) once it's
    // clearly a downward pull from the top, not an incidental touch.
    if (delta > 4) e.preventDefault();
    setPullDistance(Math.min(delta, MAX_PULL_PX));
  };

  const onTouchEnd = async () => {
    pulling.current = false;
    startY.current = null;
    if (pullDistance >= PULL_TRIGGER_THRESHOLD_PX) {
      setRefreshing(true);
      setPullDistance(PULL_TRIGGER_THRESHOLD_PX);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  return {
    pullDistance,
    refreshing,
    triggerThreshold: PULL_TRIGGER_THRESHOLD_PX,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
};
