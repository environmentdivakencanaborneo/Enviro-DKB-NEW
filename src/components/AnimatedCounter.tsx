import { useEffect, useState, useRef } from 'react';
import { useReducedMotion, useInView } from 'motion/react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  format?: (val: number) => string | React.ReactNode;
}

export default function AnimatedCounter({ value, duration = 0.5, format = (v) => v.toString() }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    if (!isInView) return;

    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setDisplayValue(easeProgress * value);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [value, duration, isInView, prefersReducedMotion]);

  return <span ref={ref}>{format(displayValue)}</span>;
}
