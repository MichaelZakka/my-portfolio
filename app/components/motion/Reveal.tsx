'use client';

import { useEffect, useRef, type ElementType, type ReactNode, type CSSProperties } from 'react';

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  /** Position in a staggered group; each step adds 80ms delay. */
  index?: number;
  className?: string;
};

/** Fades content up 16px when it enters the viewport. Reduced-motion is handled in globals.css. */
export default function Reveal({ children, as: Tag = 'div', index = 0, className = '' }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add('is-visible');
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ '--reveal-i': index } as CSSProperties}>
      {children}
    </Tag>
  );
}
