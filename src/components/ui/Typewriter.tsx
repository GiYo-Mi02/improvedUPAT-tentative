import React, { useEffect, useMemo, useState } from 'react';

type Props = {
  text: string;
  speedMs?: number; // typing speed per character
  startDelayMs?: number;
  showCaret?: boolean;
  ariaLabel?: string;
  resetKey?: string | number; // change to restart typing
  className?: string;
};

const Typewriter: React.FC<Props> = ({
  text,
  speedMs = 100,
  startDelayMs = 200,
  showCaret = true,
  ariaLabel,
  resetKey,
  className,
}) => {
  const [output, setOutput] = useState('');
  const total = text?.length ?? 0;
  const safeText = useMemo(() => text || '', [text]);

  useEffect(() => {
    let cancelled = false;
    let i = 0;
    setOutput('');
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setOutput(safeText);
      return () => { /* no timers */ };
    }
    const startTimer = window.setTimeout(() => {
      const id = window.setInterval(() => {
        if (cancelled) return;
        i += 1;
        setOutput(safeText.slice(0, i));
        if (i >= total) {
          window.clearInterval(id);
        }
      }, Math.max(10, speedMs));
    }, Math.max(0, startDelayMs));

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
    };
  }, [safeText, total, speedMs, startDelayMs, resetKey]);

  return (
    <span aria-label={ariaLabel} aria-live="polite" className={className}>
      {output}
      {showCaret && (
        <span className="ml-1 inline-block w-[2px] h-[1em] align-[-0.15em] bg-luxury-gold animate-[blink_1s_steps(1,end)_infinite]" />
      )}
    </span>
  );
};

export default Typewriter;
