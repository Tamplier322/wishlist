import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

type RevealFrom = 'up' | 'left' | 'right' | 'scale';

interface RevealProps {
  children: ReactNode;
  from?: RevealFrom;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}

export default function Reveal({
  children,
  from = 'up',
  delay = 0,
  className = '',
  as: Tag = 'div',
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-revealed');
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`reveal reveal-${from} ${className}`.trim()}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
