import React from 'react';
import { PlayerProgress, TruckStats } from '../types';
import { UPGRADE_DATA, SKINS } from '../game/constants';
import { applyUpgrade } from '../game/rules';
import { soundManager } from '../game/audio';
import { X, Wrench, Shield, Zap, Sparkles, Check, ChevronRight } from 'lucide-react';

interface GarageModalProps {
  progress: PlayerProgress;
  onUpdateProgress: (newProgress: PlayerProgress) => void;
  onClose: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({ progress, onUpdateProgress, onClose }) => {
  const [activeTab, setActiveTab] = React.useState<'upgrades' | 'skins'>('upgrades');

  const handleUpgrade = (cat: 'engine' | 'plowWidth' | 'power' | 'boost') => {
    const res = applyUpgrade(progress.stats, cat, progress.coins);
    if (res.success) {
      soundManager.playCoinDing();
      onUpdateProgress({
        ...progress,
        coins: res.newCoins,
        stats: res.newStats,
      });
    } else {
      soundManager.playBump();
    }
  };

  const handleSelectSkin = (skinId: string) => {
    const skin = SKINS.find((s) => s.id === skinId);
    if (!skin) return;

    // Check if unlocked or cost
    if (progress.coins >= skin.cost || skin.cost === 0) {
      soundManager.playCoinDing();
      onUpdateProgress({
        ...progress,
        stats: {
          ...progress.stats,
          skinId,
        },
      });
    } else {
      soundManager.playBump();
    }
  };

  const upgradeKeys: Array<'engine' | 'plowWidth' | 'power' | 'boost'> = [
    'engine',
    'plowWidth',
    'power',
    'boost',
  ];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/70 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 border border-sky-400/30 rounded-2xl text-sky-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-white">WINTER RIG GARAGE</h2>
              <p className="text-xs text-slate-400">Upgrade your plow's performance and custom paint jobs</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-amber-500/40 px-3 py-1.5 rounded-xl text-amber-400 font-bold text-sm tabular-nums">
              <span>🪙</span>
              <span>{progress.coins.toLocaleString()}</span>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Garage"
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 my-4">
          <button
            onClick={() => setActiveTab('upgrades')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs tracking-wider transition cursor-pointer ${
              activeTab === 'upgrades'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            PERFORMANCE TUNING
          </button>
          <button
            onClick={() => setActiveTab('skins')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs tracking-wider transition cursor-pointer ${
              activeTab === 'skins'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            CUSTOM PAINT SKINS
          </button>
        </div>

        {/* Tab 1: Performance Upgrades */}
        {activeTab === 'upgrades' && (
          <div className="space-y-3.5 flex-1">
            {upgradeKeys.map((key) => {
              const data = UPGRADE_DATA[key];
              const levelKey = (key === 'engine'
                ? 'engineLevel'
                : key === 'plowWidth'
                ? 'plowWidthLevel'
                : key === 'power'
                ? 'powerLevel'
                : 'boostLevel') as keyof TruckStats;
              const currentLvl = progress.stats[levelKey] as number;
              const isMax = currentLvl >= data.maxLevel;
              const nextCost = isMax ? 0 : data.costs[currentLvl];
              const canAfford = !isMax && progress.coins >= nextCost;

              return (
                <div
                  key={key}
                  className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 max-w-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{data.name}</span>
                      <span className="text-[11px] font-semibold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-800">
                        Tier {currentLvl} / {data.maxLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{data.desc}</p>

                    {/* Tier Level Pips */}
                    <div className="flex gap-1.5 pt-1">
                      {Array.from({ length: data.maxLevel }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 flex-1 rounded-sm ${
                            i < currentLvl
                              ? 'bg-gradient-to-r from-sky-400 to-amber-400'
                              : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Buy / Max Button */}
                  <div className="shrink-0 self-end sm:self-center">
                    {isMax ? (
                      <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1.5">
                        <Check className="w-4 h-4" />
                        MAXED
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(key)}
                        disabled={!canAfford}
                        className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition cursor-pointer shadow-md active:scale-95 ${
                          canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                      >
                        <span>Upgrade</span>
                        <span className="flex items-center gap-1 font-mono">
                          🪙 {nextCost}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Custom Paint Skins */}
        {activeTab === 'skins' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {SKINS.map((skin) => {
              const isEquipped = progress.stats.skinId === skin.id;

              return (
                <div
                  key={skin.id}
                  onClick={() => handleSelectSkin(skin.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    isEquipped
                      ? 'bg-sky-600/20 border-sky-400 ring-2 ring-sky-500/40 text-white'
                      : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Swatch */}
                    <div
                      className="w-10 h-10 rounded-xl border border-white/20 shadow-inner flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: skin.color }}
                    >
                      {isEquipped && <Check className="w-5 h-5 text-slate-950" />}
                    </div>

                    <div>
                      <div className="font-bold text-sm text-white">{skin.name}</div>
                      <div className="text-xs text-slate-400">
                        {skin.cost === 0 ? 'Default Classic' : `${skin.cost} Coins`}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isEquipped ? (
                      <span className="text-xs font-black text-sky-400 uppercase tracking-wider">
                        Equipped
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-400 hover:underline">
                        Apply
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
