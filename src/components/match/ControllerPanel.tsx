import React, { useState, useEffect } from 'react';
import { Button, Card, CardContent, Dialog, Select, Input } from '../ui';
import { RotateCcw, AlertTriangle, CheckCircle, RefreshCw, ArrowRight, Info } from 'lucide-react';

interface ControllerPanelProps {
  activePlayerName: string;
  activePlayerId: string;
  isController: boolean;
  currentColorOn: string | null;
  undoTimerActive: boolean;
  onRecordPot: (playerId: string, ball: string) => Promise<void>;
  onRecordFoul: (playerId: string, ball: string, points?: number, metadata?: any) => Promise<void>;
  onRecordPass: (playerId: string) => Promise<void>;
  onUndo: () => Promise<void>;
  onResetFrame: () => Promise<void>;
  onEndFrame: (winnerId?: string, winnerTeam?: 'team_a' | 'team_b', notes?: string) => Promise<void>;
  players: { id: string; name: string; team_id?: 'team_a' | 'team_b' }[];
  mode: 'free_for_all' | 'team';
}

const BALL_DETAILS = [
  { name: 'red', label: 'RED', points: 1, dotBg: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' },
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
    active: 'bg-yellow-500/15 border-yellow-550 text-yellow-650 dark:bg-yellow-950/30 dark:border-yellow-500 dark:text-yellow-450 ring-2 ring-yellow-500/20 scale-[1.02] shadow-[0_2px_8px_rgba(234,179,8,0.15)]',
    inactive: 'bg-yellow-500/5 border-yellow-200/50 text-yellow-650/60 dark:bg-yellow-950/10 dark:border-yellow-900/30 dark:text-yellow-450/55 opacity-60 hover:opacity-100 hover:bg-yellow-500/10 dark:hover:bg-yellow-950/20'
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
  activePlayerName,
  activePlayerId,
  isController,
  currentColorOn,
  undoTimerActive,
  onRecordPot,
  onRecordFoul,
  onRecordPass,
  onUndo,
  onResetFrame,
  onEndFrame,
  players,
  mode,
}) => {
  // Modal states
  const [foulDialogOpen, setFoulDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [endFrameDialogOpen, setEndFrameDialogOpen] = useState(false);
  const [foulCheckOpen, setFoulCheckOpen] = useState(false);
  
  // Custom foul input
  const [foulBall, setFoulBall] = useState<string>('red');
  const [customFoulPoints, setCustomFoulPoints] = useState<number>(4);

  // End Frame states
  const [frameWinnerId, setFrameWinnerId] = useState<string>(activePlayerId);
  const [frameWinnerTeam, setFrameWinnerTeam] = useState<'team_a' | 'team_b'>('team_a');
  const [frameNotes, setFrameNotes] = useState<string>('');

  // Red/Color confirmation helper state
  const [selectedColorBall, setSelectedColorBall] = useState<string | null>(null);
  const [redPocketedDuringFoul, setRedPocketedDuringFoul] = useState(false);

  // Undo Timer countdown visual helper
  const [countdown, setCountdown] = useState(10);

  // Pop animation tracking
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

  useEffect(() => {
    // Keep frameWinnerId updated with current active striker
    if (activePlayerId) {
      setFrameWinnerId(activePlayerId);
    }
  }, [activePlayerId]);

  if (!isController) {
    return (
      <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-3 text-center text-xs text-zinc-550 dark:text-zinc-400 flex items-center justify-center gap-2 select-none">
        <AlertTriangle size={14} className="text-amber-600 dark:text-amber-500" />
        <span>Spectator mode — score updates sync in real time.</span>
      </div>
    );
  }

  const handlePot = (ballName: string) => {
    triggerHapticFeedback();
    setPoppedBall(ballName);
    setTimeout(() => setPoppedBall(null), 250);

    // If potting a color when RED is on, verify if it was a foul or if they forgot to record a red
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

  const handleEndFrameSubmit = () => {
    onEndFrame(
      mode === 'team' ? undefined : frameWinnerId,
      mode === 'team' ? frameWinnerTeam : undefined,
      frameNotes
    );
    setEndFrameDialogOpen(false);
  };

  const getIsMatch = (ballName: string) => {
    return (currentColorOn === 'color' && ballName !== 'red') || currentColorOn === ballName;
  };

  // Split balls into rows for mobile: row1 = 4 balls, row2 = 3 balls
  const row1Balls = BALL_DETAILS.slice(0, 4); // red, yellow, green, brown
  const row2Balls = BALL_DETAILS.slice(4);     // blue, pink, black

  return (
    <div className="space-y-2.5 select-none font-sans">
      
      {/* 1. Panel Header: Striker & End Frame */}
      <div className="flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
            Active: <strong className="text-zinc-800 dark:text-zinc-100 ml-1">{activePlayerName}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setEndFrameDialogOpen(true)}
            className="border-rose-500/25 dark:border-rose-550/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/5 hover:text-rose-700 font-extrabold text-[11px] h-8 px-2.5 rounded-lg active:scale-95"
          >
            End Frame
          </Button>
        </div>
      </div>

      {/* 2. Ball Grid — 4+3 layout on mobile, 7-col on desktop */}
      <div className="bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/80 dark:border-zinc-800/80 p-2.5 sm:p-3 rounded-2xl shadow-sm">
        {/* Mobile: 4+3 rows */}
        <div className="sm:hidden space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {row1Balls.map(ball => {
              const isMatch = getIsMatch(ball.name);
              const isPopped = poppedBall === ball.name;
              const style = BALL_TILE_CLASSES[ball.name];
              const tileClass = isMatch ? style.active : style.inactive;

              return (
                <button
                  key={ball.name}
                  onClick={() => handlePot(ball.name)}
                  className={`h-[60px] rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer border font-sans active:scale-95 ${tileClass} ${isPopped ? 'animate-score-pop' : ''}`}
                >
                  <div className={`w-4 h-4 rounded-full ${ball.dotBg}`} />
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-sm font-extrabold">+{ball.points}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 mt-0.5">{ball.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {row2Balls.map(ball => {
              const isMatch = getIsMatch(ball.name);
              const isPopped = poppedBall === ball.name;
              const style = BALL_TILE_CLASSES[ball.name];
              const tileClass = isMatch ? style.active : style.inactive;

              return (
                <button
                  key={ball.name}
                  onClick={() => handlePot(ball.name)}
                  className={`h-[60px] rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer border font-sans active:scale-95 ${tileClass} ${isPopped ? 'animate-score-pop' : ''}`}
                >
                  <div className={`w-4 h-4 rounded-full ${ball.dotBg}`} />
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-sm font-extrabold">+{ball.points}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 mt-0.5">{ball.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop: 7-column grid */}
        <div className="hidden sm:grid grid-cols-7 gap-2">
          {BALL_DETAILS.map(ball => {
            const isMatch = getIsMatch(ball.name);
            const isPopped = poppedBall === ball.name;
            const style = BALL_TILE_CLASSES[ball.name];
            const tileClass = isMatch ? style.active : style.inactive;

            return (
              <button
                key={ball.name}
                onClick={() => handlePot(ball.name)}
                className={`h-16 sm:h-18 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer border font-sans active:scale-95 ${tileClass} ${isPopped ? 'animate-score-pop' : ''}`}
              >
                <div className={`w-3 h-3 rounded-full ${ball.dotBg}`} />
                <span className="text-sm font-extrabold tracking-tight">
                  +{ball.points}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Large Touch Target Action Bar */}
      <div className="grid grid-cols-10 gap-2 sm:gap-3">
        {/* Undo - 3 columns */}
        <button
          onClick={handleUndo}
          disabled={!undoTimerActive}
          className={`col-span-3 flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl text-[11px] font-bold border transition-all duration-200 cursor-pointer active:scale-95 disabled:pointer-events-none disabled:active:scale-100 ${
            undoTimerActive
              ? 'bg-amber-600 hover:bg-amber-700 border-amber-600 text-white animate-pulse shadow-md shadow-amber-600/15'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-350 shadow-sm'
          }`}
        >
          <RotateCcw size={15} />
          <span className="uppercase tracking-wide mt-0.5">
            Undo {undoTimerActive && `(${countdown})`}
          </span>
        </button>

        {/* Foul - 3 columns */}
        <button
          onClick={() => setFoulDialogOpen(true)}
          className="col-span-3 flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 transition-all duration-200 cursor-pointer active:scale-95 shadow-md shadow-rose-600/15"
        >
          <AlertTriangle size={15} />
          <span className="uppercase tracking-wide mt-0.5">Foul</span>
        </button>

        {/* Pass - 4 columns (Largest, most reachable) */}
        <button
          onClick={handlePass}
          className="col-span-4 flex items-center justify-center gap-1.5 h-14 rounded-xl text-sm font-black bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-750 transition-all duration-200 cursor-pointer active:scale-95 shadow-md shadow-emerald-700/15"
        >
          <span className="uppercase tracking-widest font-black">PASS</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* 4. Small Reset Frame Trigger */}
      <div className="flex justify-center pt-1">
        <button
          onClick={() => setResetDialogOpen(true)}
          className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-all duration-200 cursor-pointer py-1 px-3 rounded-lg"
        >
          <RefreshCw size={10} />
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

          <div className="flex flex-col gap-2.5 pt-2">
            <Button variant="primary" className="w-full bg-emerald-700 hover:bg-emerald-850 text-white h-12" onClick={handleRegisterRedFirst}>
              Potted a Red First (+1 pt & Color)
            </Button>
            <Button variant="danger" className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12" onClick={handleConfirmFoul}>
              It was a Foul (Penalty to opponents)
            </Button>
            <Button variant="outline" className="w-full h-11" onClick={() => { setFoulCheckOpen(false); setSelectedColorBall(null); }}>
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
                  className={`py-2.5 px-1 text-xs font-semibold rounded-xl border text-center transition-all ${
                    foulBall === ball.name
                      ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-rose-750 dark:text-rose-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950'
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
                  className={`py-2.5 rounded-xl border font-mono text-center font-bold text-sm transition-all ${
                    customFoulPoints === val
                      ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-rose-750 dark:text-rose-450'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 bg-white dark:bg-zinc-950'
                  }`}
                >
                  {val} pts
                </button>
              ))}
            </div>
          </div>

          {currentColorOn === 'red' && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
              <input
                id="redPocketed"
                type="checkbox"
                checked={redPocketedDuringFoul}
                onChange={(e) => setRedPocketedDuringFoul(e.target.checked)}
                className="w-5 h-5 accent-rose-650 rounded cursor-pointer"
              />
              <label htmlFor="redPocketed" className="text-xs font-semibold text-zinc-650 dark:text-zinc-350 cursor-pointer select-none">
                A Red ball was pocketed (in-off / potted on foul)
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-zinc-150 dark:border-zinc-900">
            <Button variant="outline" className="grow h-12" onClick={() => setFoulDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="grow flex gap-1.5 bg-rose-600 text-white h-12" onClick={handleFoulSubmit}>
              <AlertTriangle size={16} />
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
          <p className="text-sm text-zinc-650 dark:text-zinc-400">
            Are you sure you want to reset this frame? All scored pots and fouls in this frame will be permanently deleted.
          </p>
          <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <Button variant="outline" className="grow h-12" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="grow bg-rose-600 text-white h-12"
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

      {/* END FRAME CONFIRMATION */}
      <Dialog isOpen={endFrameDialogOpen} onClose={() => setEndFrameDialogOpen(false)} title="Complete Frame">
        <div className="space-y-4">
          {mode === 'team' ? (
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-450 mb-2">Winning Team</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFrameWinnerTeam('team_a')}
                  className={`py-3 rounded-xl border text-center font-bold text-sm transition-all ${
                    frameWinnerTeam === 'team_a'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-850 dark:text-emerald-400'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                  }`}
                >
                  TEAM A
                </button>
                <button
                  type="button"
                  onClick={() => setFrameWinnerTeam('team_b')}
                  className={`py-3 rounded-xl border text-center font-bold text-sm transition-all ${
                    frameWinnerTeam === 'team_b'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-855 dark:text-emerald-400'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                  }`}
                >
                  TEAM B
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-450 mb-2">Winner Player</label>
              <Select
                value={frameWinnerId}
                onChange={e => setFrameWinnerId(e.target.value)}
              >
                {players.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-zinc-450 mb-2">Frame Summary Notes</label>
            <Input
              placeholder="e.g. Black ball finish, Great comeback"
              value={frameNotes}
              onChange={e => setFrameNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <Button variant="outline" className="grow h-12" onClick={() => setEndFrameDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="grow bg-emerald-700 hover:bg-emerald-800 text-white h-12" onClick={handleEndFrameSubmit}>
              Save & Complete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
