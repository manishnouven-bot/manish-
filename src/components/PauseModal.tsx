import React from 'react';
import { Play, RotateCcw, Wrench, Home } from 'lucide-react';
import { soundManager } from '../game/audio';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenGarage: () => void;
  onReturnTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenGarage,
  onReturnTitle,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center flex flex-col items-center">
        <h2 className="text-xl font-black tracking-wide text-white mb-1">GAME PAUSED</h2>
        <p className="text-xs text-slate-400 mb-6">Take a warm breath by the cabin stove</p>

        <div className="w-full space-y-2.5">
          <button
            onClick={() => {
              soundManager.resume();
              onResume();
            }}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME [ESC / P]</span>
          </button>

          <button
            onClick={() => {
              soundManager.resume();
              onRestart();
            }}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Stage</span>
          </button>

          <button
            onClick={() => {
              soundManager.resume();
              onOpenGarage();
            }}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            <span>Garage & Upgrades</span>
          </button>

          <button
            onClick={() => {
              soundManager.resume();
              onReturnTitle();
            }}
            className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-white font-medium text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Title Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
