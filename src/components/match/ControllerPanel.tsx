import React, { useState, useEffect } from 'react';
import { Button, Card, CardContent, Dialog, Select, Input } from '../ui';
import { RotateCcw, AlertTriangle, CheckCircle, RefreshCw, ArrowRight } from 'lucide-react';

interface ControllerPanelProps {
  activePlayerName: string;
  activePlayerId: string;
  isController: boolean;
  currentColorOn: string | null;
  undoTimerActive: boolean;
  onRecordPot: (playerId: string, ball: string) => Promise<void>;
  onRecordFoul: (playerId: string, ball: string, points?: number) => Promise<void>;
  onRecordPass: (playerId: string) => Promise<void>;
  onUndo: () => Promise<void>;
  onResetFrame: () => Promise<void>;
  onEndFrame: (winnerId?: string, winnerTeam?: 'team_a' | 'team_b', notes?: string) => Promise<void>;
  players: { id: string; name: string; team_id?: 'team_a' | 'team_b' }[];
  mode: 'free_for_all' | 'team';
}

const BALL_DETAILS = [
  { name: 'red', gradient: 'bg-[radial-gradient(circle_at_35%_35%,#fca5a5_0%,#ef4444_40%,#b91c1c_85%,#7f1d1d_100%)]', text: 'text-white font-black', points: 1 },
  { name: 'yellow', gradient: 'bg-[radial-gradient(circle_at_35%_35%,#fef08a_0%,#facc15_40%,#ca8a04_85%,#854d0e_100%)]', text: 'text-zinc-950 font-black', points: 2 },
  { name: 'green', gradient: 'bg-[radial-gradient(circle_at_35%_35%,#bbf7d0_0%,#22c55e_40%,#15803d_85%,#14532d_100%)]', text: 'text-white font-black', points: 3 },
  { name: 'brown', gradient: 'bg-[radial-gradient(circle_at_35%_35%,#d97706_0%,#b45309_40%,#78350f_85%,#451a03_100%)]', text: 'text-white font-black', points: 4 },
  { name: 'blue', gradient: 'bg-[radial-gradient(circle_at_35%_35%,#93c5fd_0%,#3b82f6_40%,#1d4ed8_85%,#1e3a8a_100%)]', text: 'text-white font-black', points: 5 },
  { name: 'pink', gradient: 'bg-[radial-gradient(circle_at_35%_35%,#fbcfe8_0%,#ec4899_40%,#db2777_85%,#9d174d_100%)]', text: 'text-zinc-950 font-black', points: 6 },
  { name: 'black', gradient: 'bg-[radial-gradient(circle_at_35%_35%,#9ca3af_0%,#374151_40%,#111827_85%,#030712_100%)] border border-zinc-800/30', text: 'text-white font-black', points: 7 },
];

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
  
  // Custom foul input
  const [foulBall, setFoulBall] = useState<string>('red');
  const [customFoulPoints, setCustomFoulPoints] = useState<number>(4);

  // End Frame states
  const [frameWinnerId, setFrameWinnerId] = useState<string>(activePlayerId);
  const [frameWinnerTeam, setFrameWinnerTeam] = useState<'team_a' | 'team_b'>('team_a');
  const [frameNotes, setFrameNotes] = useState<string>('');

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

  if (!isController) {
    return (
      <div className="rounded-xl border border-amber-500/15 bg-amber-50/5 dark:bg-amber-950/5 p-3 text-center text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-2">
        <AlertTriangle size={14} className="text-amber-600" />
        <span>Spectator mode — score updates sync in real time.</span>
      </div>
    );
  }

  const handlePot = (ballName: string) => {
    setPoppedBall(ballName);
    setTimeout(() => setPoppedBall(null), 300);
    onRecordPot(activePlayerId, ballName);
  };

  const handleFoulSubmit = () => {
    onRecordFoul(activePlayerId, foulBall, customFoulPoints);
    setFoulDialogOpen(false);
  };

  const handleEndFrameSubmit = () => {
    onEndFrame(
      mode === 'team' ? undefined : frameWinnerId,
      mode === 'team' ? frameWinnerTeam : undefined,
      frameNotes
    );
    setEndFrameDialogOpen(false);
  };

  // Helper to determine if a ball is the current target
  const getIsMatch = (ballName: string) => {
    return currentColorOn === 'color' && ballName !== 'red' || currentColorOn === ballName;
  };

  return (
    <div className="space-y-4">
      
      {/* ======================================================== */}
      {/* 1. DESKTOP VIEW: Beautiful green felt snooker table     */}
      {/* ======================================================== */}
      <div className="hidden lg:block bg-gradient-to-b from-emerald-950 to-emerald-990 border-2 border-emerald-800 p-6 rounded-2xl relative shadow-[inset_0_4px_20px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Felt Texture Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.15),transparent_75%)] pointer-events-none" />
        
        <div className="flex gap-8 items-center justify-center relative z-10">
          {/* Primary Ball (Red) */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">Object Ball</span>
            {(() => {
              const redBall = BALL_DETAILS[0];
              const isMatch = getIsMatch('red');
              const isPopped = poppedBall === 'red';
              return (
                <button
                  onClick={() => handlePot('red')}
                  className={`w-18 h-18 rounded-full flex flex-col items-center justify-center select-none shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-all duration-200 active:scale-90 hover:scale-105 cursor-pointer border border-red-500/20 ${redBall.gradient} ${redBall.text} ${
                    isMatch
                      ? 'ring-4 ring-emerald-450 ring-offset-2 ring-offset-emerald-950 animate-pulse'
                      : ''
                  } ${isPopped ? 'animate-score-pop' : ''}`}
                >
                  <span className="text-xl font-extrabold">+1</span>
                  <span className="text-[9px] uppercase tracking-wider font-semibold opacity-70">Red</span>
                </button>
              );
            })()}
          </div>

          <div className="w-px h-24 bg-emerald-800/40" />

          {/* Color Balls */}
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-emerald-450 tracking-widest uppercase text-center">Colors</span>
            <div className="grid grid-cols-6 gap-3.5 justify-items-center">
              {BALL_DETAILS.slice(1).map(ball => {
                const isMatch = getIsMatch(ball.name);
                const isPopped = poppedBall === ball.name;
                return (
                  <button
                    key={ball.name}
                    onClick={() => handlePot(ball.name)}
                    className={`w-14 h-14 rounded-full flex flex-col items-center justify-center select-none shadow-[0_8px_16px_rgba(0,0,0,0.5)] transition-all duration-200 active:scale-90 hover:scale-105 cursor-pointer ${ball.gradient} ${ball.text} ${
                      isMatch
                        ? 'ring-4 ring-emerald-455 ring-offset-2 ring-offset-emerald-950 scale-105'
                        : ''
                    } ${isPopped ? 'animate-score-pop' : ''}`}
                  >
                    <span className="text-lg font-extrabold">+{ball.points}</span>
                    <span className="text-[8px] uppercase tracking-wider font-semibold opacity-85">{ball.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-px h-24 bg-emerald-800/40" />

          {/* Pass Visit Action */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">Pass</span>
            <button
              onClick={() => onRecordPass(activePlayerId)}
              className="w-15 h-15 rounded-full flex flex-col items-center justify-center select-none shadow-[0_8px_16px_rgba(0,0,0,0.4)] border border-emerald-700/60 bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 font-bold active:scale-90 hover:scale-105 transition-all cursor-pointer"
            >
              <ArrowRight size={22} className="text-emerald-450" />
              <span className="text-[8px] uppercase tracking-widest font-black opacity-80 mt-0.5">Pass</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MOBILE & LANDSCAPE VIEW: Compact Horizontal Ball Row  */}
      {/* ======================================================== */}
      <div className="lg:hidden flex flex-row gap-1.5 justify-between items-center w-full overflow-x-auto py-1 px-0.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 rounded-xl">
        {BALL_DETAILS.map(ball => {
          const isMatch = getIsMatch(ball.name);
          const isPopped = poppedBall === ball.name;
          return (
            <button
              key={ball.name}
              onClick={() => handlePot(ball.name)}
              className={`w-10 h-10 rounded-full flex flex-col items-center justify-center shrink-0 shadow-[0_3px_6px_rgba(0,0,0,0.3)] transition-all duration-200 active:scale-85 ${ball.gradient} ${ball.text} ${
                isMatch
                  ? 'ring-3 ring-emerald-500 ring-offset-1 dark:ring-offset-zinc-950 scale-[1.05]'
                  : ''
              } ${isPopped ? 'animate-score-pop' : ''}`}
            >
              <span className="text-[13px] font-black">+{ball.points}</span>
            </button>
          );
        })}

        {/* Pass Button for Mobile */}
        <button
          onClick={() => onRecordPass(activePlayerId)}
          className="w-10 h-10 rounded-full flex flex-col items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-650 dark:text-zinc-300 shadow-[0_3px_6px_rgba(0,0,0,0.15)] active:scale-85 transition-all"
        >
          <ArrowRight size={16} />
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3. Action Buttons Row (Undo, Foul, End Frame)           */}
      {/* ======================================================== */}
      <div className="grid grid-cols-3 gap-3">
        {/* Undo */}
        <Button
          onClick={onUndo}
          variant={undoTimerActive ? 'primary' : 'outline'}
          disabled={!undoTimerActive}
          className={`flex items-center justify-center gap-1.5 h-11 rounded-xl text-xs transition-all shadow-sm ${
            undoTimerActive ? 'bg-amber-600 hover:bg-amber-700 border-amber-600 text-white animate-pulse' : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
          }`}
        >
          <RotateCcw size={14} />
          <span className="font-bold uppercase tracking-wider">
            Undo {undoTimerActive && `(${countdown})`}
          </span>
        </Button>

        {/* Foul */}
        <Button
          onClick={() => setFoulDialogOpen(true)}
          variant="danger"
          className="flex items-center justify-center gap-1.5 h-11 rounded-xl text-xs shadow-sm bg-rose-600 hover:bg-rose-700 text-white"
        >
          <AlertTriangle size={14} />
          <span className="font-bold uppercase tracking-wider">Foul</span>
        </Button>

        {/* End Frame */}
        <Button
          onClick={() => setEndFrameDialogOpen(true)}
          variant="secondary"
          className="flex items-center justify-center gap-1.5 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs shadow-sm bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
        >
          <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">End Frame</span>
        </Button>
      </div>

      {/* Reset Frame Link */}
      <div className="flex justify-center pt-1">
        <button
          onClick={() => setResetDialogOpen(true)}
          className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1 opacity-50 hover:opacity-100 transition-all"
        >
          <RefreshCw size={10} />
          Reset Frame
        </button>
      </div>

      {/* FOUL DIALOG */}
      <Dialog isOpen={foulDialogOpen} onClose={() => setFoulDialogOpen(false)} title="Record Foul Shot">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-2">Foul Ball Involved</label>
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
                      ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-rose-750 dark:text-rose-450'
                      : 'border-zinc-255 dark:border-zinc-800 text-zinc-650 dark:text-zinc-450 bg-white dark:bg-zinc-950'
                  }`}
                >
                  {ball.name.toUpperCase()} (+{Math.max(4, ball.points)})
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-2">Custom Penalty Value</label>
            <div className="grid grid-cols-4 gap-2">
              {[4, 5, 6, 7].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCustomFoulPoints(val)}
                  className={`py-2.5 rounded-xl border font-mono text-center font-bold text-sm transition-all ${
                    customFoulPoints === val
                      ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-rose-750 dark:text-rose-450'
                      : 'border-zinc-255 dark:border-zinc-800 text-zinc-650 dark:text-zinc-450 bg-white dark:bg-zinc-950'
                  }`}
                >
                  {val} pts
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <Button variant="outline" className="grow" onClick={() => setFoulDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="grow flex gap-1.5 bg-rose-600 text-white" onClick={handleFoulSubmit}>
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
            <Button variant="outline" className="grow" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="grow bg-rose-600 text-white"
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
              <label className="block text-xs font-semibold uppercase text-zinc-450 mb-2">Winning Team</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFrameWinnerTeam('team_a')}
                  className={`py-3 rounded-xl border text-center font-bold text-sm transition-all ${
                    frameWinnerTeam === 'team_a'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400'
                      : 'border-zinc-255 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                  }`}
                >
                  TEAM A
                </button>
                <button
                  type="button"
                  onClick={() => setFrameWinnerTeam('team_b')}
                  className={`py-3 rounded-xl border text-center font-bold text-sm transition-all ${
                    frameWinnerTeam === 'team_b'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400'
                      : 'border-zinc-255 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                  }`}
                >
                  TEAM B
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-450 mb-2">Winner Player</label>
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
            <label className="block text-xs font-semibold uppercase text-zinc-450 mb-2">Frame Summary Notes</label>
            <Input
              placeholder="e.g. Black ball finish, Great comeback"
              value={frameNotes}
              onChange={e => setFrameNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <Button variant="outline" className="grow" onClick={() => setEndFrameDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="grow bg-emerald-700 hover:bg-emerald-800 text-white" onClick={handleEndFrameSubmit}>
              Save & Complete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
