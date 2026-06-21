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
  { name: 'red', points: 1, dotBg: 'bg-red-500' },
  { name: 'yellow', points: 2, dotBg: 'bg-yellow-400 border border-yellow-500/20' },
  { name: 'green', points: 3, dotBg: 'bg-emerald-500' },
  { name: 'brown', points: 4, dotBg: 'bg-amber-700' },
  { name: 'blue', points: 5, dotBg: 'bg-blue-500' },
  { name: 'pink', points: 6, dotBg: 'bg-pink-400' },
  { name: 'black', points: 7, dotBg: 'bg-zinc-800 dark:bg-zinc-200' },
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
      <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-3 text-center text-xs text-zinc-550 dark:text-zinc-400 flex items-center justify-center gap-2">
        <AlertTriangle size={14} className="text-amber-600 dark:text-amber-500" />
        <span>Spectator mode — score updates sync in real time.</span>
      </div>
    );
  }

  const handlePot = (ballName: string) => {
    setPoppedBall(ballName);
    setTimeout(() => setPoppedBall(null), 250);
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

  const getIsMatch = (ballName: string) => {
    return currentColorOn === 'color' && ballName !== 'red' || currentColorOn === ballName;
  };

  return (
    <div className="space-y-4">
      {/* ======================================================== */}
      {/* Scoring Buttons Grid — Minimalist Apple-inspired style   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-8 gap-2 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/80 dark:border-zinc-800/80 p-3 rounded-2xl shadow-sm">
        {BALL_DETAILS.map(ball => {
          const isMatch = getIsMatch(ball.name);
          const isPopped = poppedBall === ball.name;
          return (
            <button
              key={ball.name}
              onClick={() => handlePot(ball.name)}
              className={`h-15 sm:h-17 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer select-none border font-sans ${
                isMatch
                  ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 scale-[1.03] shadow-[0_2px_8px_rgba(16,185,129,0.08)]'
                  : 'border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-200'
              } ${isPopped ? 'animate-score-pop' : ''}`}
            >
              {/* Minimalist Solid Color Dot */}
              <div className={`w-2.5 h-2.5 rounded-full ${ball.dotBg}`} />
              
              {/* Points Value */}
              <span className="text-sm sm:text-base font-extrabold tracking-tight">
                +{ball.points}
              </span>
            </button>
          );
        })}

        {/* Pass Button */}
        <button
          onClick={() => onRecordPass(activePlayerId)}
          className="h-15 sm:h-17 rounded-xl flex flex-col items-center justify-center gap-1 border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-500 dark:text-zinc-400 transition-all duration-200 cursor-pointer"
        >
          <ArrowRight size={15} className="text-zinc-400 dark:text-zinc-550" />
          <span className="text-[9px] uppercase font-bold tracking-widest mt-0.5">Pass</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* Action Buttons (Undo, Foul, End Frame)                   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-3 gap-3">
        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!undoTimerActive}
          className={`flex items-center justify-center gap-1.5 h-11 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer ${
            undoTimerActive
              ? 'bg-amber-600 hover:bg-amber-700 border-amber-600 text-white animate-pulse shadow-sm'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-650 dark:text-zinc-300'
          }`}
        >
          <RotateCcw size={13} />
          <span className="uppercase tracking-wider">
            Undo {undoTimerActive && `(${countdown})`}
          </span>
        </button>

        {/* Foul */}
        <button
          onClick={() => setFoulDialogOpen(true)}
          className="flex items-center justify-center gap-1.5 h-11 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-all duration-200 cursor-pointer shadow-sm"
        >
          <AlertTriangle size={13} />
          <span className="uppercase tracking-wider">Foul</span>
        </button>

        {/* End Frame */}
        <button
          onClick={() => setEndFrameDialogOpen(true)}
          className="flex items-center justify-center gap-1.5 h-11 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-650 dark:text-zinc-300 transition-all duration-200 cursor-pointer"
        >
          <CheckCircle size={13} className="text-emerald-600 dark:text-emerald-450" />
          <span className="uppercase tracking-wider">End Frame</span>
        </button>
      </div>

      {/* Reset Frame */}
      <div className="flex justify-center pt-1">
        <button
          onClick={() => setResetDialogOpen(true)}
          className="text-[10px] text-rose-500 hover:text-rose-750 font-semibold flex items-center gap-1 opacity-50 hover:opacity-100 transition-all duration-250 cursor-pointer"
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
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-450 bg-white dark:bg-zinc-950'
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
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-450 bg-white dark:bg-zinc-950'
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
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
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
