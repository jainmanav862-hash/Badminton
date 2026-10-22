import React, { useEffect, useState } from 'react';
import { ReplayFrame } from '../types/game';
import { FastForward, Play, RefreshCw } from 'lucide-react';

interface InstantReplayProps {
  frames: ReplayFrame[];
  onFinish: () => void;
}

export const InstantReplay: React.FC<InstantReplayProps> = ({ frames, onFinish }) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (frames.length === 0) {
      onFinish();
      return;
    }

    // Playback at 40% speed for dramatic slow-mo
    const interval = setInterval(() => {
      setFrameIndex((prev) => {
        if (prev >= frames.length - 1) {
          clearInterval(interval);
          setTimeout(onFinish, 600);
          return prev;
        }
        return prev + 1;
      });
    }, 45);

    return () => clearInterval(interval);
  }, [frames, onFinish]);

  return (
    <div className="absolute top-16 left-6 z-40 pointer-events-auto flex items-center gap-2">
      <div className="px-3 py-1.5 rounded-lg bg-rose-600/90 text-white border border-rose-400/80 backdrop-blur-md shadow-xl flex items-center gap-2 animate-pulse">
        <span className="w-2.5 h-2.5 rounded-full bg-white" />
        <span className="text-xs font-black font-athletic tracking-wider">SUPER SMASH SLOW-MO REPLAY</span>
      </div>

      <button
        onClick={onFinish}
        className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-xs text-slate-300 border border-slate-700 backdrop-blur-md transition-colors flex items-center gap-1 cursor-pointer"
      >
        <FastForward className="w-3.5 h-3.5" />
        <span>Skip</span>
      </button>
    </div>
  );
};
