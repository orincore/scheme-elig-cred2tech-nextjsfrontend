'use client';

import { useEffect, useRef, useState } from 'react';

interface TypewriterProps {
  text: string;
  /** ms per character */
  speed?: number;
  /** ms before typing starts */
  startDelay?: number;
  className?: string;
  /** show a blinking caret while typing */
  cursor?: boolean;
}

/**
 * Types out a string character-by-character with a blinking caret — a light,
 * professional "typing" reveal. Re-runs whenever `text` changes.
 */
export function Typewriter({ text, speed = 26, startDelay = 200, className = '', cursor = true }: TypewriterProps) {
  const [out, setOut] = useState('');
  const [done, setDone] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduced.current) {
      setOut(text);
      setDone(true);
      return;
    }

    setOut('');
    setDone(false);
    let i = 0;
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setOut(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return (
    <span className={className}>
      {out}
      {cursor && !done && (
        <span className="ml-0.5 inline-block w-[2px] -mb-0.5 h-[1em] translate-y-0.5 bg-current animate-pulse" aria-hidden />
      )}
    </span>
  );
}

export default Typewriter;
