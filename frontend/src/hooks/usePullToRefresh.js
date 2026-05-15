import { useState, useRef, useCallback, useEffect } from 'react';

const THRESHOLD = 80;
const MAX_PULL = 120;

export function usePullToRefresh(onRefresh, { enabled = true } = {}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (!enabled || refreshing) return;
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [enabled, refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!pulling.current || !enabled || refreshing) return;
    if (window.scrollY > 0) {
      pulling.current = false;
      setPullDistance(0);
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      // Dampen the pull (logarithmic feel)
      const dampened = Math.min(MAX_PULL, delta * 0.4);
      setPullDistance(dampened);
    }
  }, [enabled, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD && onRefresh) {
      setRefreshing(true);
      setPullDistance(THRESHOLD); // Hold at threshold during refresh
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh]);

  useEffect(() => {
    if (!enabled) return;
    const opts = { passive: true };
    document.addEventListener('touchstart', handleTouchStart, opts);
    document.addEventListener('touchmove', handleTouchMove, opts);
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(1, pullDistance / THRESHOLD);

  return { pullDistance, refreshing, progress };
}
