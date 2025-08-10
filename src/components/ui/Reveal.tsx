import type { CSSProperties, ReactNode } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

type Variant = 'up' | 'down' | 'left' | 'right' | 'fade';

interface RevealProps {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  delay?: number; // ms
  durationMs?: number; // ms
  once?: boolean;
  as?: React.ElementType;
}

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  variant = 'up',
  delay = 0,
  durationMs = 700,
  once = true,
  as = 'div',
}) => {
  const Comp: any = as || 'div';
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  const hiddenTransform = useMemo(() => {
    switch (variant) {
      case 'up':
        return 'translate-y-6';
      case 'down':
        return '-translate-y-6';
      case 'left':
        return '-translate-x-6';
      case 'right':
        return 'translate-x-6';
      case 'fade':
      default:
        return '';
    }
  }, [variant]);

  useEffect(() => {
    const node = ref.current as Element | null;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  const style: CSSProperties = {
    transitionDelay: `${delay}ms`,
    transitionDuration: `${durationMs}ms`,
  };

  return (
    <Comp
      ref={ref as any}
      style={style}
      className={cx(
        'will-change-[opacity,transform] transform transition-all ease-out',
        visible ? 'opacity-100 translate-x-0 translate-y-0' : cx('opacity-0', hiddenTransform),
        className
      )}
    >
      {children}
    </Comp>
  );
};

export default Reveal;
