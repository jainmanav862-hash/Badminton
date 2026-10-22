import React, { useEffect, useState } from 'react';
import { HawkEyeReview } from '../types/game';
import { Eye, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { sound } from '../utils/audio';

interface HawkEyeModalProps {
  review: HawkEyeReview;
  onFinishReview: (overturned: boolean) => void;
}

export const HawkEyeModal: React.FC<HawkEyeModalProps> = ({ review, onFinishReview }) => {
  const [animationStep, setAnimationStep] = useState<'scanning' | 'zooming' | 'decision'>('scanning');

  useEffect(() => {
    // Sound effect: Hawk-Eye sonar scan / heartbeat suspense
    sound.playStadiumChime();

    const t1 = setTimeout(() => {
      setAnimationStep('zooming');
    }, 1400);

    const t2 = setTimeout(() => {
      setAnimationStep('decision');
      if (review.overturned) {
        sound.playCrowdCheer('medium');
      } else {
        sound.playWhistle();
      }
    }, 2800);

    const t3 = setTimeout(() => {
      onFinishReview(review.overturned);
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [review, onFinishReview]);

  if (!review.isOpen) return null;

  const isCallIn = review.reviewedCall === 'IN';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-emerald-500/50 rounded-2xl shadow-2xl overflow-hidden p-6 text-center">
        {/* BWF Official Banner */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Eye className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-xs font-black tracking-widest uppercase text-white font-athletic">
                BWF INSTANT REVIEW SYSTEM
              </div>
              <div className="text-[10px] text-slate-400">Official Computer Vision Replay</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Challenger</div>
            <div className="text-xs font-bold text-emerald-400">
              {review.challengerTeam === 'teamA' ? 'Team Blue' : 'Team Red'}
            </div>
          </div>
        </div>

        {/* 3D Virtual Hawk-Eye Court Line Simulation */}
        <div className="relative h-48 bg-emerald-950/70 border border-emerald-800/60 rounded-xl overflow-hidden flex items-center justify-center mb-4">
          {/* Laser Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#05966915_1px,transparent_1px),linear-gradient(to_bottom,#05966915_1px,transparent_1px)] bg-[size:16px_16px]" />

          {/* Court White Line (40mm) */}
          <div className="absolute inset-y-0 w-8 bg-white/95 shadow-[0_0_15px_rgba(255,255,255,0.8)] flex items-center justify-center">
            <span className="text-[9px] font-black tracking-tighter text-slate-900 -rotate-90">
              BWF LINE
            </span>
          </div>

          {/* Shuttlecock Impact Spot */}
          <div
            style={{
              transform: `translate(${isCallIn ? '8px' : '36px'}, 0px) scale(${animationStep === 'scanning' ? 0.8 : 1.2})`,
              transition: 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="absolute z-10 flex flex-col items-center"
          >
            {/* Rubberized cork impact mark */}
            <div
              className={`w-12 h-12 rounded-full border-2 ${
                isCallIn
                  ? 'bg-emerald-500/80 border-emerald-300 shadow-[0_0_20px_#10b981]'
                  : 'bg-rose-500/80 border-rose-300 shadow-[0_0_20px_#ef4444]'
              } flex items-center justify-center`}
            >
              <div className="w-4 h-4 rounded-full bg-white animate-ping" />
            </div>
            <span className="text-[9px] font-bold text-white mt-1 px-1.5 py-0.5 rounded bg-slate-900/80">
              {review.distanceFromLineMm.toFixed(1)} mm
            </span>
          </div>

          {/* Scanning radar laser */}
          {animationStep === 'scanning' && (
            <div className="absolute inset-x-0 h-1 bg-cyan-400 shadow-[0_0_12px_#38bdf8] animate-pulse" />
          )}
        </div>

        {/* Decision Result Card */}
        <div className="mb-4">
          {animationStep === 'decision' ? (
            <div className="animate-fadeIn">
              <div className="text-4xl font-black font-athletic tracking-widest uppercase mb-1 flex items-center justify-center gap-2">
                {isCallIn ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    <span className="text-emerald-400">IN!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-rose-500" />
                    <span className="text-rose-500">OUT!</span>
                  </>
                )}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {review.overturned ? (
                  <span className="text-amber-400">Decision Overturned by {review.distanceFromLineMm.toFixed(1)}mm!</span>
                ) : (
                  <span className="text-slate-400">Original Call Stands!</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-cyan-400 font-mono tracking-wider animate-pulse flex items-center justify-center gap-2 py-3">
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>COMPUTING CALIBRATED TRAJECTORY...</span>
            </div>
          )}
        </div>

        {/* Challenges remaining counter */}
        <div className="flex items-center justify-around bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-400">
          <div>
            Team Blue Challenges: <span className="font-bold text-white">{review.challengesRemainingA}</span>
          </div>
          <span aria-hidden="true">·</span>
          <div>
            Team Red Challenges: <span className="font-bold text-white">{review.challengesRemainingB}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
