import { useEffect, useRef, useState, type ReactNode } from 'react';

interface StaggerChildrenProps {
  children: ReactNode;
  stagger?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
}

export function StaggerChildren({
  children,
  stagger = 60,
  className,
  style,
  as = 'div',
}: StaggerChildrenProps) {
  // Widening to ElementType avoids TS2590 (union too complex) on the JSX below.
  const Tag = as as React.ElementType;
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        ...style,
        '--stagger': `${stagger}ms`,
        '--visible': visible ? '1' : '0',
      } as React.CSSProperties}
      data-stagger-visible={visible || undefined}
    >
      {children}
    </Tag>
  );
}
