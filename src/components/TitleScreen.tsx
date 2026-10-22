import React from 'react';
import { Mission, PlayerProgress } from '../types';
import { MISSIONS } from '../game/constants';
import { soundManager } from '../game/audio';
import { Volume2, VolumeX, Wrench, Trophy, Sparkles, Play } from 'lucide-react';

interface TitleScreenProps {
  progress: PlayerProgress;
  selectedMission: Mission;
  onSelectMission: (m: Mission) => void;
  onStartGame: () => void;
  onOpenGarage: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  progress,
  selectedMission,
  onSelectMission,
  onStartGame,
  onOpenGarage,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 select-none z-20">
      {/* Top Header Row */}
      <div className="flex items-center justify-between w-full">
        {/* Coin & Garage Pill */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/85 border border-amber-500/40 px-3.5 py-1.5 rounded-xl shadow-lg backdrop-blur-none text-amber-400">
            <span className="text-lg">🪙</span>
            <span className="font-bold text-sm tracking-wide tabular-nums text-amber-300">
              {progress.coins.toLocaleString()}
            </span>
            <span className="text-xs text-amber-500/80 uppercase font-semibold">Coins</span>
          </div>

          <button
            onClick={() => {
              soundManager.resume();
              onOpenGarage();
            }}
            className="flex items-center gap-2 bg-slate-900/85 hover:bg-slate-800 text-sky-300 hover:text-white border border-sky-500/40 px-3.5 py-1.5 rounded-xl transition cursor-pointer shadow-lg active:scale-95"
            title="Open Garage & Upgrades"
          >
            <Wrench className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Garage</span>
          </button>
        </div>

        {/* Mute button */}
        <div className="pointer-events-auto">
          <button
            onClick={() => {
              soundManager.resume();
              onToggleMute();
            }}
            aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-2.5 bg-slate-900/85 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition cursor-pointer shadow-lg active:scale-95"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Center Hero Lockup & Mission Selection */}
      <div className="flex flex-col items-center max-w-xl mx-auto w-full text-center">
        {/* Dark High-Contrast Hero Card */}
        <div className="pointer-events-auto bg-slate-950/85 border border-slate-700/80 rounded-3xl p-5 sm:p-6 mb-4 shadow-2xl flex flex-col items-center w-full">
          {/* Bespoke Inline SVG Logo */}
          <div className="mb-2">
            <svg className="w-64 sm:w-80 h-auto filter drop-shadow-xl" viewBox="0 0 340 90" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="snowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#bae6fd" />
                </linearGradient>
                <linearGradient id="bladeGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              {/* Mountain Snow Peaks */}
              <path d="M40 50L65 15L90 50Z" fill="#38bdf8" opacity="0.6" />
              <path d="M55 28L65 15L75 28L70 25L65 30L60 25Z" fill="#ffffff" />
              <path d="M75 50L105 10L135 50Z" fill="#0284c7" opacity="0.8" />
              <path d="M93 26L105 10L117 26L111 22L105 28L99 22Z" fill="#ffffff" />
              {/* Stylized Plow Angle */}
              <path d="M22 66L70 46L66 40L18 60Z" fill="url(#bladeGrad)" />
              {/* Title Text */}
              <text x="145" y="44" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="34" fill="url(#snowGrad)" letterSpacing="2">
                FROST
              </text>
              <text x="255" y="44" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="34" fill="#f59e0b" letterSpacing="1">
                PLOW
              </text>
              <text x="146" y="66" fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="12" fill="#7dd3fc" letterSpacing="4">
                3D WINTER EXPEDITION
              </text>
            </svg>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wide max-w-md">
            Clear the snow-drifted streets, driveways, and town squares. Upgrade your rig and restore warmth to the winter valley.
          </p>
        </div>

        {/* Mission Select Grid */}
        <div className="pointer-events-auto w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-4 mb-4 shadow-2xl">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Select Mission
            </span>
            <span className="text-[11px] text-sky-400 font-semibold">
              Mission {MISSIONS.findIndex((m) => m.id === selectedMission.id) + 1} of {MISSIONS.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MISSIONS.map((m, idx) => {
              const isSelected = m.id === selectedMission.id;
              const completedData = progress.completedMissions[m.id];
              const stars = completedData ? completedData.stars : 0;

              return (
                <button
                  key={m.id}
                  onClick={() => {
                    soundManager.resume();
                    onSelectMission(m);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-sky-600/30 border-sky-400 text-white shadow-md ring-2 ring-sky-500/50'
                      : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/70 text-slate-300'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-sky-400 mb-0.5">Stage {idx + 1}</div>
                  <div className="text-xs font-bold truncate mb-1">{m.title}</div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-400 font-semibold">+{m.rewardCoins}🪙</span>
                    <span className="text-yellow-300 font-bold tracking-tighter">
                      {'★'.repeat(stars) || '☆☆☆'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Mission Details Banner */}
          <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between text-left text-xs">
            <div>
              <div className="font-semibold text-slate-200">{selectedMission.subtitle}</div>
              <div className="text-[11px] text-slate-400">{selectedMission.description}</div>
            </div>
            <div className="text-right pl-3 shrink-0">
              <div className="text-[11px] text-slate-400">Target</div>
              <div className="font-bold text-sky-300 text-sm tabular-nums">{selectedMission.targetPercent}% Road</div>
            </div>
          </div>
        </div>

        {/* Primary Start CTA */}
        <div className="pointer-events-auto flex items-center gap-3 w-full sm:w-auto">
          <button
            data-start="true"
            onClick={() => {
              soundManager.resume();
              onStartGame();
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-sm sm:text-base px-8 py-3.5 rounded-2xl shadow-xl shadow-amber-500/25 transition cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START PLOWING</span>
            <span className="hidden sm:inline text-xs font-bold opacity-75 border-l border-slate-950/30 pl-2">
              [SPACE / ENTER]
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Safe Control Hints wrapped in high-contrast pill */}
      <div className="flex justify-center pointer-events-auto">
        <div className="bg-slate-900/90 border border-slate-700/80 px-4 py-1.5 rounded-full text-slate-300 text-[11px] font-medium shadow-lg flex flex-wrap items-center justify-center gap-1.5 sm:gap-3">
          <span>WASD / Arrows Drive</span>
          <span>·</span>
          <span>Space Brake</span>
          <span>·</span>
          <span>Shift Nitro Boost</span>
          <span>·</span>
          <span>Esc / P Pause</span>
          <span>·</span>
          <span>M Mute</span>
        </div>
      </div>
    </div>
  );
};
