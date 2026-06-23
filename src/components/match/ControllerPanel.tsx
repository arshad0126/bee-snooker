import React, { useState, useEffect } from 'react';
import { Button, Dialog, Input } from '../ui';
import { RotateCcw, AlertTriangle, ArrowRight, RefreshCw, Info } from 'lucide-react';

interface ControllerPanelProps {
  activePlayerId: string;
  isController: boolean;
  currentColorOn: string | null;
  undoTimerActive: boolean;
  onRecordPot: (playerId: string, ball: string) => Promise<void>;
  onRecordFoul: (playerId: string, ball: string, points?: number, metadata?: any) => Promise<void>;
  onRecordPass: (playerId: string) => Promise<void>;
  onUndo: () => Promise<void>;
  onResetFrame: () => Promise<void>;
  players: { id: string; name: string; team_id?: 'team_a' | 'team_b' }[];
  mode: 'free_for_all' | 'team';
}

const BALL_DETAILS = [
  { name: 'red', label: 'RED', points: 1, dotBg: 'bg-red-650 shadow-[0_0_8px_rgba(220,38,38,0.5)]' },
  { name: 'yellow', label: 'YEL', points: 2, dotBg: 'bg-yellow-450 border border-yellow-500/20 shadow-[0_0_8px_rgba(234,179,8,0.3)]' },
  { name: 'green', label: 'GRN', points: 3, dotBg: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
  { name: 'brown', label: 'BRN', points: 4, dotBg: 'bg-amber-700 shadow-[0_0_8px_rgba(180,83,9,0.4)]' },
  { name: 'blue', label: 'BLU', points: 5, dotBg: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' },
  { name: 'pink', label: 'PNK', points: 6, dotBg: 'bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.5)]' },
  { name: 'black', label: 'BLK', points: 7, dotBg: 'bg-zinc-850 dark:bg-zinc-200 shadow-[0_0_8px_rgba(161,161,170,0.4)]' },
];

const BALL_TILE_CLASSES: Record<string, { active: string; inactive: string }> = {
  red: {
    active: 'bg-red-500/15 border-red-500 text-red-650 dark:bg-red-950/30 dark:border-red-500 dark:text-red-400 ring-2 ring-red-500/20 scale-[1.02] shadow-[0_2px_8px_rgba(239,68,68,0.15)]',
    inactive: 'bg-red-500/5 border-red-200/50 text-red-650/60 dark:bg-red-950/10 dark:border-red-900/30 dark:text-red-400/50 opacity-60 hover:opacity-100 hover:bg-red-500/10 dark:hover:bg-red-950/20'
  },
  yellow: {
    active: 'bg-yellow-500/15 border-yellow-550 text-yellow-650 dark:bg-yellow-950/30 dark:border-yellow-500 dark:text-yellow-455 ring-2 ring-yellow-500/20 scale-[1.02] shadow-[0_2px_8px_rgba(234,179,8,0.15)]',
    inactive: 'bg-yellow-500/5 border-yellow-200/50 text-yellow-650/60 dark:bg-yellow-950/10 dark:border-yellow-900/30 dark:text-yellow-455/55 opacity-60 hover:opacity-100 hover:bg-yellow-500/10 dark:hover:bg-yellow-950/20'
  },
  green: {
    active: 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-500 dark:text-emerald-400 ring-2 ring-emerald-500/20 scale-[1.02] shadow-[0_2px_8px_rgba(16,185,129,0.15)]',
    inactive: 'bg-emerald-500/5 border-emerald-250/50 text-emerald-650/65 dark:bg-emerald-950/10 dark:border-emerald-900/30 dark:text-emerald-400/50 opacity-60 hover:opacity-100 hover:bg-emerald-500/10 dark:hover:bg-emerald-950/20'
  },
  brown: {
    active: 'bg-amber-700/15 border-amber-600 text-amber-850 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-450 ring-2 ring-amber-500/20 scale-[1.02] shadow-[0_2px_8px_rgba(180,83,9,0.15)]',
    inactive: 'bg-amber-700/5 border-amber-200/50 text-amber-700/60 dark:bg-amber-950/10 dark:border-amber-900/30 dark:text-amber-500/45 opacity-60 hover:opacity-100 hover:bg-amber-700/10 dark:hover:bg-amber-950/20'
  },
  blue: {
    active: 'bg-blue-500/15 border-blue-500 text-blue-700 dark:bg-blue-950/30 dark:border-blue-500 dark:text-blue-400 ring-2 ring-blue-500/20 scale-[1.02] shadow-[0_2px_8px_rgba(59,130,246,0.15)]',
    inactive: 'bg-blue-500/5 border-blue-200/50 text-blue-600/60 dark:bg-blue-950/10 dark:border-blue-900/30 dark:text-blue-500/40 opacity-60 hover:opacity-100 hover:bg-blue-500/10 dark:hover:bg-blue-950/20'
  },
  pink: {
    active: 'bg-pink-500/15 border-pink-500 text-pink-700 dark:bg-pink-950/30 dark:border-pink-500 dark:text-pink-400 ring-2 ring-pink-500/20 scale-[1.02] shadow-[0_2px_8px_rgba(236,72,153,0.15)]',
    inactive: 'bg-pink-500/5 border-pink-200/50 text-pink-650/60 dark:bg-pink-950/10 dark:border-pink-900/30 dark:text-pink-500/40 opacity-60 hover:opacity-100 hover:bg-pink-500/10 dark:hover:bg-pink-950/20'
  },
  black: {
    active: 'bg-zinc-800/15 border-zinc-700 text-zinc-850 dark:bg-zinc-200/15 dark:border-zinc-350 dark:text-zinc-200 ring-2 ring-zinc-500/20 scale-[1.02] shadow-[0_2px_8px_rgba(31,41,55,0.15)]',
    inactive: 'bg-zinc-100/40 border-zinc-200/60 text-zinc-600 dark:bg-zinc-800/20 dark:border-zinc-800 dark:text-zinc-400/50 opacity-60 hover:opacity-100 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/45'
  }
};

const triggerHapticFeedback = () => {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(12);
    } catch (e) {}
  }
};

export const ControllerPanel: React.FC<ControllerPanelProps> = ({
  activePlayerId,
  isController,
  currentColorOn,
  undoTimerActive,
  onRecordPot,
  onRecordFoul,
  onRecordPass,
  onUndo,
  onResetFrame,
  players,
  mode,
}) => {
  const [foulDialogOpen, setFoulDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [foulCheckOpen, setFoulCheckOpen] = useState(false);
  
  const [foulBall, setFoulBall] = useState<string>('red');
  const [customFoulPoints, setCustomFoulPoints] = useState<number>(4);

  const [selectedColorBall, setSelectedColorBall] = useState<string | null>(null);
  const [redPocketedDuringFoul, setRedPocketedDuringFoul] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [poppedBall, setPoppedBall] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (undoTimerActive) {
      setCountdown(10);
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [undoTimerActive]);

  if (!isController) {
    return (
      <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-2 text-center text-xs text-zinc-500 dark:text-zinc-450 flex items-center justify-center gap-1.5 select-none">
        <AlertTriangle size={12} className="text-amber-600 dark:text-amber-500" />
        <span>Spectator Mode — score updates sync in real time.</span>
      </div>
    );
  }

  const handlePot = (ballName: string) => {
    triggerHapticFeedback();
    setPoppedBall(ballName);
    setTimeout(() => setPoppedBall(null), 250);

    if (ballName !== 'red' && currentColorOn === 'red') {
      setSelectedColorBall(ballName);
      setFoulCheckOpen(true);
    } else {
      onRecordPot(activePlayerId, ballName);
    }
  };

  const handleConfirmFoul = () => {
    triggerHapticFeedback();
    if (!selectedColorBall) return;
    const pts = Math.max(4, BALL_DETAILS.find(b => b.name === selectedColorBall)?.points || 0);
    onRecordFoul(activePlayerId, selectedColorBall, pts);
    setFoulCheckOpen(false);
    setSelectedColorBall(null);
  };

  const handleRegisterRedFirst = async () => {
    triggerHapticFeedback();
    if (!selectedColorBall) return;
    try {
      await onRecordPot(activePlayerId, 'red');
      await onRecordPot(activePlayerId, selectedColorBall);
    } catch (e) {
      console.error(e);
    }
    setFoulCheckOpen(false);
    setSelectedColorBall(null);
  };

  const handleFoulSubmit = () => {
    triggerHapticFeedback();
    onRecordFoul(activePlayerId, foulBall, customFoulPoints, { red_pocketed: redPocketedDuringFoul });
    setFoulDialogOpen(false);
    setRedPocketedDuringFoul(false);
  };

  const handlePass = () => {
    triggerHapticFeedback();
    onRecordPass(activePlayerId);
  };

  const handleUndo = () => {
    triggerHapticFeedback();
    onUndo();
  };

  const getIsMatch = (ballName: string) => {
    return (currentColorOn === 'color' && ballName !== 'red') || currentColorOn === ballName;
  };

  return (
    <div className="space-y-2 select-none font-sans">
      {/* 1. Ball Grid — 7-column inline row */}
      <div className="grid grid-cols-7 gap-1.5 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 p-1.5 rounded-xl shadow-sm">
        {BALL_DETAILS.map(ball => {
          const isMatch = getIsMatch(ball.name);
          const isPopped = poppedBall === ball.name;
          const style = BALL_TILE_CLASSES[ball.name];
          const tileClass = isMatch ? style.active : style.inactive;

          return (
            <button
              key={ball.name}
              onClick={() => handlePot(ball.name)}
              className={`h-[56px] rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer border active:scale-95 ${tileClass} ${isPopped ? 'animate-score-pop' : ''}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${ball.dotBg}`} />
              <span className="text-[8px] font-bold uppercase tracking-wider opacity-75">
                {ball.label}
              </span>
              <span className="text-xs font-black tracking-tight leading-none mt-0.5">
                +{ball.points}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Action Bar */}
      <div className="grid grid-cols-10 gap-1.5">
        {/* Undo - 3 columns */}
        <button
          onClick={handleUndo}
          disabled={!undoTimerActive}
          className={`col-span-3 flex flex-col items-center justify-center gap-0.5 h-11 rounded-lg text-[9px] font-black border transition-all duration-200 cursor-pointer active:scale-95 disabled:pointer-events-none disabled:active:scale-100 ${
            undoTimerActive
              ? 'bg-amber-600 hover:bg-amber-700 border-amber-600 text-white animate-pulse shadow-md shadow-amber-650/15'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-55 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-350 shadow-sm'
          }`}
        >
          <RotateCcw size={13} />
          <span className="uppercase tracking-wide">
            Undo {undoTimerActive && `(${countdown})`}
          </span>
        </button>

        {/* Foul - 3 columns */}
        <button
          onClick={() => setFoulDialogOpen(true)}
          className="col-span-3 flex flex-col items-center justify-center gap-0.5 h-11 rounded-lg text-[9px] font-black bg-rose-600 hover:bg-rose-705 text-white border border-rose-600 transition-all duration-200 cursor-pointer active:scale-95 shadow-md shadow-rose-600/15"
        >
          <AlertTriangle size={13} />
          <span className="uppercase tracking-wide">Foul</span>
        </button>

        {/* Pass - 4 columns (Largest) */}
        <button
          onClick={handlePass}
          className="col-span-4 flex items-center justify-center gap-1.5 h-11 rounded-lg text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-750 transition-all duration-200 cursor-pointer active:scale-95 shadow-md shadow-emerald-700/15"
        >
          <span className="uppercase tracking-widest font-black">PASS</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* 3. Reset Frame Link */}
      <div className="flex justify-center">
        <button
          onClick={() => setResetDialogOpen(true)}
          className="text-[9px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 opacity-40 hover:opacity-100 transition-all duration-200 cursor-pointer py-0.5 px-2 rounded"
        >
          <RefreshCw size={8} />
          Reset Frame
        </button>
      </div>

      {/* FOUL / RED CONFIRMATION DIALOG */}
      <Dialog isOpen={foulCheckOpen} onClose={() => { setFoulCheckOpen(false); setSelectedColorBall(null); }} title="Verify Pot Shot">
        <div className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-950/30 text-amber-600 rounded-full flex items-center justify-center">
            <Info size={24} />
          </div>
          <div>
            <h4 className="font-bold text-sm">You selected a {selectedColorBall?.toUpperCase()} ball</h4>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              The current ball on is <strong>Red</strong>. Did you legally pot a Red first, or was this a foul?
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button variant="primary" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white h-11" onClick={handleRegisterRedFirst}>
              Potted a Red First (+1 pt & Color)
            </Button>
            <Button variant="danger" className="w-full bg-rose-600 hover:bg-rose-700 text-white h-11" onClick={handleConfirmFoul}>
              It was a Foul (Penalty to opponents)
            </Button>
            <Button variant="outline" className="w-full h-10" onClick={() => { setFoulCheckOpen(false); setSelectedColorBall(null); }}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>

      {/* FOUL DIALOG */}
      <Dialog isOpen={foulDialogOpen} onClose={() => setFoulDialogOpen(false)} title="Record Foul Shot">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-zinc-400 mb-2">Foul Ball Involved</label>
            <div className="grid grid-cols-4 gap-2">
              {BALL_DETAILS.map(ball => (
                <button
                  key={ball.name}
                  type="button"
                  onClick={() => {
                    setFoulBall(ball.name);
                    setCustomFoulPoints(Math.max(4, ball.points));
                  }}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl border text-center transition-all ${
                    foulBall === ball.name
                      ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-rose-750 dark:text-rose-455'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 bg-white dark:bg-zinc-950'
                  }`}
                >
                  {ball.label} (+{Math.max(4, ball.points)})
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-zinc-400 mb-2">Custom Penalty Value</label>
            <div className="grid grid-cols-4 gap-2">
              {[4, 5, 6, 7].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCustomFoulPoints(val)}
                  className={`py-2 rounded-xl border font-mono text-center font-bold text-sm transition-all ${
                    customFoulPoints === val
                      ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-rose-750 dark:text-rose-455'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 bg-white dark:bg-zinc-950'
                  }`}
                >
                  {val} pts
                </button>
              ))}
            </div>
          </div>

          {currentColorOn === 'red' && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
              <input
                id="redPocketed"
                type="checkbox"
                checked={redPocketedDuringFoul}
                onChange={(e) => setRedPocketedDuringFoul(e.target.checked)}
                className="w-4 h-4 accent-rose-650 rounded cursor-pointer"
              />
              <label htmlFor="redPocketed" className="text-xs font-semibold text-zinc-650 dark:text-zinc-350 cursor-pointer select-none">
                A Red ball was pocketed (in-off / potted on foul)
              </label>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-zinc-150 dark:border-zinc-900">
            <Button variant="outline" className="grow h-11" onClick={() => setFoulDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="grow flex gap-1.5 bg-rose-600 text-white h-11" onClick={handleFoulSubmit}>
              <AlertTriangle size={14} />
              Confirm Foul
            </Button>
          </div>
        </div>
      </Dialog>

      {/* RESET FRAME CONFIRMATION */}
      <Dialog isOpen={resetDialogOpen} onClose={() => setResetDialogOpen(false)} title="Reset Frame">
        <div className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 bg-rose-100 dark:bg-rose-950/30 text-rose-600 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <p className="text-sm text-zinc-650 dark:text-zinc-450">
            Are you sure you want to reset this frame? All scored pots and fouls in this frame will be permanently deleted.
          </p>
          <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
            <Button variant="outline" className="grow h-11" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="grow bg-rose-600 text-white h-11"
              onClick={() => {
                onResetFrame();
                setResetDialogOpen(false);
              }}
            >
              Reset Frame
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
