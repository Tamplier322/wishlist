import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useT } from '../i18n';

export const PULL_THRESHOLD = 70;

export function usePullToRefresh(
  onRefresh: () => Promise<unknown> | unknown,
  enabled = true,
): { pull: number; refreshing: boolean } {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return undefined;

    function handleStart(event: TouchEvent): void {
      if (refreshingRef.current) return;
      if (window.scrollY > 0 || event.touches.length !== 1) return;
      startYRef.current = event.touches[0].clientY;
    }

    function handleMove(event: TouchEvent): void {
      if (startYRef.current === null) return;
      const delta = event.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const value = Math.min(delta * 0.5, 96);
      pullRef.current = value;
      setPull(value);
      if (value > 8 && event.cancelable) event.preventDefault();
    }

    async function handleEnd(): Promise<void> {
      if (startYRef.current === null) return;
      const shouldRefresh = pullRef.current >= PULL_THRESHOLD;
      startYRef.current = null;
      if (!shouldRefresh) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      refreshingRef.current = true;
      setRefreshing(true);
      setPull(PULL_THRESHOLD);
      try {
        await refreshRef.current();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
        pullRef.current = 0;
        setPull(0);
      }
    }

    window.addEventListener('touchstart', handleStart, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);
    return () => {
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [enabled]);

  return { pull, refreshing };
}

export function PullToRefreshIndicator({ pull, refreshing }: { pull: number; refreshing: boolean }) {
  const { t } = useT();
  if (pull <= 0) return null;

  const ready = pull >= PULL_THRESHOLD;
  return (
    <div
      className={`ptr-indicator ${refreshing ? 'is-refreshing' : ''} ${ready ? 'is-ready' : ''}`}
      style={{ height: pull, opacity: Math.min(1, pull / 40) }}
      role="status"
      aria-live="polite"
    >
      <span className="ptr-icon">
        <Icon name="retry" size={16} />
      </span>
      <span>{refreshing ? t('ptr.refreshing') : ready ? t('ptr.release') : t('ptr.pull')}</span>
    </div>
  );
}
