import React from 'react';
import { Mission } from '../types';
import { formatTime } from '../game/rules';
import { soundManager } from '../game/audio';
import { Trophy, RotateCcw, ArrowRight, Wrench, Home, AlertCircle } from 'lucide-react';

interface GameOverModalProps {
  isVictory: boolean;
  mission: Mission;
  clearedPercent: number;
  score: number;
  coinsEarned: number;
  timeSpent: number;
  stars: number;
  onRestart: () => void;
  onNextMission?: () => void;
  onOpenGarage: () => void;
  onReturnTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isVictory,
  mission,
  clearedPercent,
  score,
  coinsEarned,
  timeSpent,
  stars,
  onRestart,
  onNextMission,
  onOpenGarage,
  onReturnTitle,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl text-center flex flex-col items-center">
        {/* Top Status Icon */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${
            isVictory
              ? 'bg-amber-500/20 border border-amber-400/40 text-amber-400 shadow-amber-500/20'
              : 'bg-rose-500/20 border border-rose-400/40 text-rose-400 shadow-rose-500/20'
          }`}
        >
          {isVictory ? <Trophy className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black tracking-wide text-white mb-1">
          {isVictory ? 'ROADS CLEARED!' : 'BLIZZARD OVERTAKEN!'}
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          {isVictory
            ? `${mission.title} is now safe for morning traffic and travelers.`
            : `Time expired before clearing ${mission.targetPercent}% of the road network.`}
        </p>

        {/* Star Rating on Victory */}
        {isVictory && (
          <div className="flex items-center gap-2 mb-5">
            {[1, 2, 3].map((s) => (
              <span
                key={s}
                className={`text-3xl transition transform duration-300 ${
                  s <= stars
                    ? 'text-yellow-400 drop-shadow-[0_2px_8px_rgba(250,204,21,0.6)] scale-110'
                    : 'text-slate-700'
                }`}
              >
                ★
              </span>
            ))}
          </div>
        )}

        {/* 3 Metric Tiles with tabular-nums */}
        <div className="grid grid-cols-3 gap-2.5 w-full mb-6">
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Clearance</span>
            <span
              className={`text-lg font-black tabular-nums mt-0.5 ${
                clearedPercent >= mission.targetPercent ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {clearedPercent}%
            </span>
            <span className="text-[9px] text-slate-500">Goal: {mission.targetPercent}%</span>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Time</span>
            <span className="text-lg font-black text-sky-300 tabular-nums mt-0.5">
              {formatTime(timeSpent)}
            </span>
            <span className="text-[9px] text-slate-500">
              {mission.timeLimitSec ? `Limit: ${formatTime(mission.timeLimitSec)}` : 'Untimed'}
            </span>
          </div>

          <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-3 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Coins</span>
            <span className="text-lg font-black text-amber-300 tabular-nums mt-0.5">
              +{coinsEarned}
            </span>
            <span className="text-[9px] text-slate-500">🪙 Earned</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          {isVictory && onNextMission ? (
            <button
              data-start="true"
              onClick={() => {
                soundManager.resume();
                onNextMission();
              }}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-95 text-slate-950 font-black text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
            >
              <span>NEXT MISSION</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              data-start="true"
              onClick={() => {
                soundManager.resume();
                onRestart();
              }}
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isVictory ? 'PLAY AGAIN' : 'TRY AGAIN'}</span>
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                soundManager.resume();
                onOpenGarage();
              }}
              className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Wrench className="w-4 h-4" />
              <span>Garage</span>
            </button>

            <button
              onClick={() => {
                soundManager.resume();
                onReturnTitle();
              }}
              className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              <span>Title Menu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
