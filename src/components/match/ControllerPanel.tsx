import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, CardContent, Dialog, Select, Input } from '../ui';
import { RotateCcw, AlertTriangle, CheckCircle, RefreshCw, XCircle, ArrowRight } from 'lucide-react';

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

const BALL_COLORS = [
  { name: 'red', bg: 'bg-red-600', hoverBg: 'hover:bg-red-700', text: 'text-white', points: 1 },
  { name: 'yellow', bg: 'bg-yellow-500', hoverBg: 'hover:bg-yellow-600', text: 'text-zinc-950', points: 2 },
  { name: 'green', bg: 'bg-emerald-600', hoverBg: 'hover:bg-emerald-700', text: 'text-white', points: 3 },
  { name: 'brown', bg: 'bg-amber-800', hoverBg: 'hover:bg-amber-900', text: 'text-white', points: 4 },
  { name: 'blue', bg: 'bg-blue-600', hoverBg: 'hover:bg-blue-700', text: 'text-white', points: 5 },
  { name: 'pink', bg: 'bg-pink-400', hoverBg: 'hover:bg-pink-500', text: 'text-zinc-950', points: 6 },
  { name: 'black', bg: 'bg-zinc-900 dark:bg-zinc-800', hoverBg: 'hover:bg-zinc-800 dark:hover:bg-zinc-700', text: 'text-white', points: 7 },
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

  return (
    <div className="space-y-2.5">
      
      {/* ===== Scoring Buttons — Single Horizontal Row ===== */}
      <div className="flex flex-row gap-1.5 overflow-x-auto pb-0.5">
        {BALL_COLORS.map(ball => {
          const isMatch = currentColorOn === 'color' && ball.name !== 'red' || 
                          currentColorOn === ball.name;
          const isPopped = poppedBall === ball.name;

          return (
            <button
              key={ball.name}
              onClick={() => handlePot(ball.name)}
              className={`flex-1 min-w-[52px] flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl transition-all duration-200 active:scale-95 ${ball.bg} ${ball.hoverBg} ${ball.text} ${
                isMatch 
                  ? 'ring-2 ring-offset-1 ring-emerald-500 dark:ring-offset-zinc-950 scale-[1.03]' 
                  : 'opacity-85 hover:opacity-100'
              } ${isPopped ? 'animate-score-pop' : ''}`}
            >
              <span className="font-bold text-sm">+{ball.points}</span>
              <span className="text-[9px] uppercase font-bold tracking-wide opacity-80 hidden sm:inline">{ball.name}</span>
            </button>
          );
        })}

        {/* End Visit / Pass Turn */}
        <button
          onClick={() => onRecordPass(activePlayerId)}
          className="flex-1 min-w-[52px] flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 active:scale-95 transition-all duration-200"
        >
          <ArrowRight size={14} />
          <span className="text-[9px] uppercase font-bold tracking-wide hidden sm:inline">Pass</span>
        </button>
      </div>

      {/* ===== Action Buttons Row ===== */}
      <div className="grid grid-cols-3 gap-2">
        {/* Undo */}
        <Button
          onClick={onUndo}
          variant={undoTimerActive ? 'primary' : 'outline'}
          disabled={!undoTimerActive}
          className={`flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs transition-all ${
            undoTimerActive ? 'bg-amber-600 hover:bg-amber-700 border-amber-600 text-white animate-pulse' : ''
          }`}
        >
          <RotateCcw size={14} />
          <span className="font-bold uppercase tracking-wide">
            Undo {undoTimerActive && `(${countdown})`}
          </span>
        </Button>

        {/* Foul */}
        <Button
          onClick={() => setFoulDialogOpen(true)}
          variant="danger"
          className="flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs"
        >
          <AlertTriangle size={14} />
          <span className="font-bold uppercase tracking-wide">Foul</span>
        </Button>

        {/* End Frame */}
        <Button
          onClick={() => setEndFrameDialogOpen(true)}
          variant="secondary"
          className="flex items-center justify-center gap-1.5 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs"
        >
          <CheckCircle size={14} className="text-emerald-700 dark:text-emerald-400" />
          <span className="font-bold uppercase tracking-wide">End Frame</span>
        </Button>
      </div>

      {/* Reset Frame link */}
      <div className="flex justify-center">
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
              {BALL_COLORS.map(ball => (
                <button
                  key={ball.name}
                  type="button"
                  onClick={() => {
                    setFoulBall(ball.name);
                    setCustomFoulPoints(Math.max(4, ball.points));
                  }}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl border text-center transition-all ${
                    foulBall === ball.name
                      ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
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
                      ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
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
            <Button variant="danger" className="grow flex gap-1.5" onClick={handleFoulSubmit}>
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
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Are you sure you want to reset this frame? All scored pots and fouls in this frame will be permanently deleted.
          </p>
          <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <Button variant="outline" className="grow" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="grow"
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
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-2">Winning Team</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFrameWinnerTeam('team_a')}
                  className={`py-3 rounded-xl border text-center font-bold text-sm transition-all ${
                    frameWinnerTeam === 'team_a'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400'
                      : 'border-zinc-200 dark:border-zinc-800'
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
                      : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  TEAM B
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-2">Winner Player</label>
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
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-2">Frame Summary Notes</label>
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
            <Button variant="primary" className="grow" onClick={handleEndFrameSubmit}>
              Save & Complete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
