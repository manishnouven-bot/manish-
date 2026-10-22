import React from 'react';
import { Mission } from '../types';
import { formatTime } from '../game/rules';
import { soundManager } from '../game/audio';
import { Volume2, VolumeX, Pause, Flame, Zap, Award, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface HUDProps {
  mission: Mission;
  clearedPercent: number;
  score: number;
  coins: number;
  combo: number;
  speed: number;
  boostFuel: number;
  timeRemaining: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onTouchInput: (steer: number, throttle: number, brake: boolean, boost: boolean) => void;
}

export const HUD: React.FC<HUDProps> = ({
  mission,
  clearedPercent,
  score,
  coins,
  combo,
  speed,
  boostFuel,
  timeRemaining,
  isMuted,
  onToggleMute,
  onPause,
  onTouchInput,
}) => {
  const kmh = Math.round(speed * 3.6);
  const targetMet = clearedPercent >= mission.targetPercent;
  const progressRatio = Math.min(100, (clearedPercent / mission.targetPercent) * 100);

  // Mobile virtual inputs state
  const [touchSteer, setTouchSteer] = React.useState(0);
  const [touchThrottle, setTouchThrottle] = React.useState(0);
  const [touchBrake, setTouchBrake] = React.useState(false);
  const [touchBoost, setTouchBoost] = React.useState(false);

  React.useEffect(() => {
    onTouchInput(touchSteer, touchThrottle, touchBrake, touchBoost);
  }, [touchSteer, touchThrottle, touchBrake, touchBoost, onTouchInput]);

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none z-10">
      {/* Top Perimeter Row */}
      <div className="flex flex-wrap sm:flex-nowrap items-start justify-between w-full gap-2">
        {/* Top-Left Cluster: Mission Objective & Progress */}
        <div className="pointer-events-auto bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-xl max-w-[210px] sm:max-w-sm">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold text-sky-400 truncate">
              {mission.title}
            </span>
            {mission.timeLimitSec > 0 && (
              <span
                className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded tabular-nums shrink-0 ${
                  timeRemaining < 30 ? 'bg-rose-500/30 text-rose-300 animate-pulse' : 'bg-slate-800 text-slate-300'
                }`}
              >
                ⏱ {formatTime(timeRemaining)}
              </span>
            )}
          </div>

          {/* Progress Bar toward Target */}
          <div className="space-y-1">
            <div className="flex items-baseline justify-between text-[11px] sm:text-xs">
              <span className="text-slate-300 font-medium">Road:</span>
              <span className={`font-black tabular-nums ${targetMet ? 'text-emerald-400' : 'text-sky-300'}`}>
                {clearedPercent}% <span className="text-[10px] text-slate-400 font-normal">/ {mission.targetPercent}%</span>
              </span>
            </div>

            <div className="w-full h-2 sm:h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  targetMet
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/50'
                    : 'bg-gradient-to-r from-sky-500 to-amber-400'
                }`}
                style={{ width: `${progressRatio}%` }}
              />
            </div>
          </div>
        </div>

        {/* Floating Upper Notification for Combos (Safe from blocking the truck) */}
        {combo > 1.0 && (
          <div className="pointer-events-none self-center order-3 sm:order-2 my-1 sm:my-0 transition-all transform animate-bounce">
            <div className="bg-amber-500 border border-amber-300 px-3.5 py-1 rounded-full shadow-xl shadow-amber-500/40 flex items-center gap-1.5 text-slate-950 font-black text-xs sm:text-sm tracking-wider">
              <Flame className="w-3.5 h-3.5 fill-current text-rose-950" />
              <span>{combo.toFixed(1)}x COMBO PLOW!</span>
            </div>
          </div>
        )}

        {/* Top-Right Cluster: Score, Coins & Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 order-2 sm:order-3 ml-auto">
          {/* Score & Coins Card */}
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 shadow-xl">
            <div className="flex flex-col text-right">
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-400">Score</span>
              <span className="text-xs sm:text-sm font-black text-white tabular-nums tracking-wide">{score.toLocaleString()}</span>
            </div>

            <div className="h-5 sm:h-6 w-px bg-slate-700/80" />

            <div className="flex items-center gap-1 text-amber-300 font-black text-xs sm:text-sm tabular-nums">
              <span>🪙</span>
              <span>{coins}</span>
            </div>
          </div>

          {/* Mute [M] */}
          <button
            onClick={() => {
              soundManager.resume();
              onToggleMute();
            }}
            aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-2 sm:p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-slate-300 hover:text-white transition cursor-pointer shadow-xl active:scale-95"
            title="Toggle Mute [M]"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Pause [P] */}
          <button
            onClick={() => {
              soundManager.resume();
              onPause();
            }}
            aria-label="Pause Game"
            className="p-2 sm:p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-slate-300 hover:text-white transition cursor-pointer shadow-xl active:scale-95"
            title="Pause Game [Esc / P]"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Perimeter: Vehicle Instrument Cluster & Touch Controls */}
      <div className="w-full flex items-end justify-between">
        {/* Left Mobile Touch D-Pad */}
        <div className="pointer-events-auto sm:hidden flex flex-col items-center gap-1.5 opacity-80">
          <button
            onPointerDown={() => setTouchThrottle(1)}
            onPointerUp={() => setTouchThrottle(0)}
            onPointerCancel={() => setTouchThrottle(0)}
            aria-label="Drive Forward"
            className="w-13 h-13 bg-slate-900/85 border border-sky-400/50 rounded-2xl flex items-center justify-center active:bg-sky-600 text-white shadow-lg"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            <button
              onPointerDown={() => setTouchSteer(1)}
              onPointerUp={() => setTouchSteer(0)}
              onPointerCancel={() => setTouchSteer(0)}
              aria-label="Steer Left"
              className="w-13 h-13 bg-slate-900/85 border border-sky-400/50 rounded-2xl flex items-center justify-center active:bg-sky-600 text-white shadow-lg"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button
              onPointerDown={() => setTouchThrottle(-1)}
              onPointerUp={() => setTouchThrottle(0)}
              onPointerCancel={() => setTouchThrottle(0)}
              aria-label="Drive Reverse"
              className="w-13 h-13 bg-slate-900/85 border border-sky-400/50 rounded-2xl flex items-center justify-center active:bg-sky-600 text-white shadow-lg"
            >
              <ArrowDown className="w-6 h-6" />
            </button>
            <button
              onPointerDown={() => setTouchSteer(-1)}
              onPointerUp={() => setTouchSteer(0)}
              onPointerCancel={() => setTouchSteer(0)}
              aria-label="Steer Right"
              className="w-13 h-13 bg-slate-900/85 border border-sky-400/50 rounded-2xl flex items-center justify-center active:bg-sky-600 text-white shadow-lg"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Unified Bottom Center Instrument Dock (Zero Occlusion) */}
        <div className="pointer-events-auto mx-auto bg-slate-900/85 border border-slate-700/80 rounded-2xl px-5 py-2.5 shadow-xl flex items-center gap-6">
          {/* Speedometer */}
          <div className="flex flex-col items-center">
            <div className="text-xl sm:text-2xl font-black text-white tabular-nums tracking-tighter">
              {kmh}
            </div>
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">KM/H</span>
          </div>

          <div className="h-8 w-px bg-slate-700/80" />

          {/* Nitro Turbo Gauge */}
          <div className="flex flex-col w-28 sm:w-36">
            <div className="flex items-center justify-between text-[10px] font-bold mb-1">
              <span className="flex items-center gap-1 text-cyan-300">
                <Zap className="w-3 h-3 fill-current" />
                NITRO BOOST
              </span>
              <span className="text-slate-400 text-[9px] font-medium">[SHIFT]</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-75"
                style={{ width: `${Math.min(100, (boostFuel / 100) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Mobile Touch Buttons (Handbrake & Boost) */}
        <div className="pointer-events-auto sm:hidden flex flex-col gap-2 opacity-80">
          <button
            onPointerDown={() => setTouchBoost(true)}
            onPointerUp={() => setTouchBoost(false)}
            onPointerCancel={() => setTouchBoost(false)}
            aria-label="Nitro Boost"
            className="w-13 h-13 bg-cyan-600 border border-cyan-300 rounded-2xl flex items-center justify-center active:scale-95 text-white shadow-lg"
          >
            <Zap className="w-6 h-6 fill-current" />
          </button>
          <button
            onPointerDown={() => setTouchBrake(true)}
            onPointerUp={() => setTouchBrake(false)}
            onPointerCancel={() => setTouchBrake(false)}
            aria-label="Handbrake"
            className="w-13 h-13 bg-rose-600/90 border border-rose-300 rounded-2xl flex items-center justify-center active:scale-95 text-white shadow-lg text-xs font-black"
          >
            STOP
          </button>
        </div>
      </div>
    </div>
  );
};
