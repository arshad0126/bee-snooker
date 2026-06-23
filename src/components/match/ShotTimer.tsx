import React, { useEffect, useState, useRef } from 'react';

interface ShotTimerProps {
  lastActionAt: string | null;
  isActive: boolean;
}

export const ShotTimer: React.FC<ShotTimerProps> = ({ lastActionAt, isActive }) => {
  const [timeText, setTimeText] = useState('00:00.00');
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || !lastActionAt) {
      setTimeText('00:00.00');
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      return;
    }

    const startTime = new Date(lastActionAt).getTime();

    const updateTimer = () => {
      const elapsedMs = Date.now() - startTime;
      const totalSeconds = Math.max(0, elapsedMs / 1000);
      
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60);
      const centiseconds = Math.floor((totalSeconds % 1) * 100);

      const mStr = String(minutes).padStart(2, '0');
      const sStr = String(seconds).padStart(2, '0');
      const cStr = String(centiseconds).padStart(2, '0');

      setTimeText(`${mStr}:${sStr}.${cStr}`);
      requestRef.current = requestAnimationFrame(updateTimer);
    };

    requestRef.current = requestAnimationFrame(updateTimer);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [lastActionAt, isActive]);

  if (!isActive) return null;

  return (
    <span className="font-mono tabular-nums text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/15 tracking-wide select-none">
      {timeText}
    </span>
  );
};
