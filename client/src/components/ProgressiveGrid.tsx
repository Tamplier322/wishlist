import { useEffect, useRef, useState, type ReactNode } from 'react';

interface ProgressiveGridProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  className?: string;
  pageSize?: number;
}

export default function ProgressiveGrid<T>({
  items,
  renderItem,
  className = 'wish-grid',
  pageSize = 60,
}: ProgressiveGridProps<T>) {
  const [limit, setLimit] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLimit(pageSize);
  }, [items, pageSize]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || limit >= items.length) return;
    if (typeof IntersectionObserver === 'undefined') {
      setLimit(items.length);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLimit((current) => Math.min(items.length, current + pageSize));
        }
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, limit, pageSize]);

  const visible = items.slice(0, limit);

  return (
    <>
      <div className={className}>{visible.map((item) => renderItem(item))}</div>
      {limit < items.length && <div ref={sentinelRef} className="progressive-sentinel" aria-hidden />}
    </>
  );
}
