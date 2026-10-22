import React, { useEffect, useRef, useState } from 'react';
import { GameState, Mission, PlayerProgress, TruckStats } from './types';
import { MISSIONS } from './game/constants';
import { GameEngine } from './game/engine';
import { soundManager } from './game/audio';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { GarageModal } from './components/GarageModal';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';

const DEFAULT_STATS: TruckStats = {
  engineLevel: 1,
  plowWidthLevel: 1,
  powerLevel: 1,
  boostLevel: 1,
  skinId: 'yellow',
};

const DEFAULT_PROGRESS: PlayerProgress = {
  coins: 80,
  highScore: 0,
  stats: DEFAULT_STATS,
  completedMissions: {},
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Persistent Player Progress
  const [progress, setProgress] = useState<PlayerProgress>(() => {
    try {
      const saved = localStorage.getItem('frostplow_progress');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return DEFAULT_PROGRESS;
  });

  const [selectedMission, setSelectedMission] = useState<Mission>(MISSIONS[0]);
  const [gameState, setGameState] = useState<GameState>('title');
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => soundManager.getMuted());

  // Real-time HUD states
  const [hudData, setHudData] = useState({
    clearedPercent: 0,
    score: 0,
    coins: 0,
    combo: 1.0,
    speed: 0,
    boostFuel: 100,
    timeRemaining: 180,
  });

  // End of run victory / gameover snapshot
  const [endRunData, setEndRunData] = useState<{
    clearedPercent: number;
    score: number;
    coinsEarned: number;
    timeSpent: number;
    stars: number;
  }>({
    clearedPercent: 0,
    score: 0,
    coinsEarned: 0,
    timeSpent: 0,
    stars: 0,
  });

  // Save progress changes
  useEffect(() => {
    try {
      localStorage.setItem('frostplow_progress', JSON.stringify(progress));
    } catch {
      // Ignore
    }
  }, [progress]);

  // Mount 3D Game Engine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const autostart = urlParams.get('autostart') === '1';

    const engine = new GameEngine(
      canvasMountRef.current,
      selectedMission,
      progress.stats,
      {
        onProgressUpdate: (data) => {
          setHudData(data);
        },
        onMissionVictory: (data) => {
          setEndRunData(data);
          setGameState('victory');

          // Record completion and rewards
          setProgress((prev) => {
            const prevMissionData = prev.completedMissions[selectedMission.id];
            const bestStars = Math.max(prevMissionData?.stars || 0, data.stars);
            const bestPercent = Math.max(prevMissionData?.bestPercent || 0, data.clearedPercent);
            const bestTime = prevMissionData ? Math.min(prevMissionData.bestTime, data.timeSpent) : data.timeSpent;

            return {
              ...prev,
              coins: prev.coins + data.coinsEarned,
              highScore: Math.max(prev.highScore, data.score),
              completedMissions: {
                ...prev.completedMissions,
                [selectedMission.id]: {
                  stars: bestStars,
                  bestTime,
                  bestPercent,
                },
              },
            };
          });
        },
        onGameOver: (data) => {
          setEndRunData({
            ...data,
            coinsEarned: 0,
            stars: 0,
          });
          setGameState('gameover');
        },
      }
    );

    engineRef.current = engine;

    if (autostart) {
      engine.setGameState('playing');
      setGameState('playing');
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []); // Run once

  // Sync state transitions to engine
  const handleStartGame = () => {
    if (!engineRef.current) return;
    engineRef.current.loadMission(selectedMission, progress.stats);
    engineRef.current.setGameState('playing');
    setGameState('playing');
  };

  const handlePause = () => {
    if (!engineRef.current) return;
    engineRef.current.setGameState('paused');
    setGameState('paused');
  };

  const handleResume = () => {
    if (!engineRef.current) return;
    engineRef.current.setGameState('playing');
    setGameState('playing');
  };

  const handleRestart = () => {
    if (!engineRef.current) return;
    engineRef.current.restartCurrentMission();
    setGameState('playing');
  };

  const handleReturnTitle = () => {
    if (!engineRef.current) return;
    engineRef.current.loadMission(selectedMission, progress.stats);
    engineRef.current.setGameState('title');
    setGameState('title');
  };

  const handleNextMission = () => {
    const currentIdx = MISSIONS.findIndex((m) => m.id === selectedMission.id);
    const nextMission = MISSIONS[(currentIdx + 1) % MISSIONS.length];
    setSelectedMission(nextMission);
    if (engineRef.current) {
      engineRef.current.loadMission(nextMission, progress.stats);
      engineRef.current.setGameState('playing');
      setGameState('playing');
    }
  };

  const handleSelectMission = (m: Mission) => {
    setSelectedMission(m);
    if (engineRef.current) {
      engineRef.current.loadMission(m, progress.stats);
    }
  };

  const handleUpdateProgress = (newProg: PlayerProgress) => {
    setProgress(newProg);
    if (engineRef.current) {
      engineRef.current.loadMission(selectedMission, newProg.stats);
    }
  };

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleTouchInput = (steer: number, throttle: number, brake: boolean, boost: boolean) => {
    if (engineRef.current) {
      engineRef.current.setTouchInputs(steer, throttle, brake, boost);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas isolated mount container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && !isGarageOpen && (
        <TitleScreen
          progress={progress}
          selectedMission={selectedMission}
          onSelectMission={handleSelectMission}
          onStartGame={handleStartGame}
          onOpenGarage={() => setIsGarageOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Active Playing HUD */}
      {gameState === 'playing' && (
        <HUD
          mission={selectedMission}
          clearedPercent={hudData.clearedPercent}
          score={hudData.score}
          coins={hudData.coins}
          combo={hudData.combo}
          speed={hudData.speed}
          boostFuel={hudData.boostFuel}
          timeRemaining={hudData.timeRemaining}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onTouchInput={handleTouchInput}
        />
      )}

      {/* Pause Menu Modal */}
      {gameState === 'paused' && !isGarageOpen && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onOpenGarage={() => setIsGarageOpen(true)}
          onReturnTitle={handleReturnTitle}
        />
      )}

      {/* Victory / Defeat Modal */}
      {(gameState === 'victory' || gameState === 'gameover') && !isGarageOpen && (
        <GameOverModal
          isVictory={gameState === 'victory'}
          mission={selectedMission}
          clearedPercent={endRunData.clearedPercent}
          score={endRunData.score}
          coinsEarned={endRunData.coinsEarned}
          timeSpent={endRunData.timeSpent}
          stars={endRunData.stars}
          onRestart={handleRestart}
          onNextMission={gameState === 'victory' ? handleNextMission : undefined}
          onOpenGarage={() => setIsGarageOpen(true)}
          onReturnTitle={handleReturnTitle}
        />
      )}

      {/* Truck Customization & Upgrades Garage Modal */}
      {isGarageOpen && (
        <GarageModal
          progress={progress}
          onUpdateProgress={handleUpdateProgress}
          onClose={() => setIsGarageOpen(false)}
        />
      )}
    </div>
  );
}
