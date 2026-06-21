import React, { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Badge } from '../ui';
import { Player } from '../../lib/store';
import { Plus, Play, ArrowUp, ArrowDown, User, Check, RefreshCw } from 'lucide-react';

interface SetupFlowProps {
  availablePlayers: Player[];
  onAddPlayer: (name: string) => Promise<Player>;
  onStartMatch: (config: {
    redsCount: number;
    mode: 'free_for_all' | 'team';
    players: { id: string; play_order: number; team_id?: 'team_a' | 'team_b'; is_breaker: boolean }[];
  }) => void;
}

export const SetupFlow: React.FC<SetupFlowProps> = ({
  availablePlayers,
  onAddPlayer,
  onStartMatch,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  
  // State for config
  const [mode, setMode] = useState<'free_for_all' | 'team'>('free_for_all');
  const [redsCount, setRedsCount] = useState<number>(15);
  const [customReds, setCustomReds] = useState<string>('');
  
  // Selected players
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  
  // Playing order & team designations
  const [playerOrder, setPlayerOrder] = useState<
    { id: string; name: string; team_id?: 'team_a' | 'team_b'; is_breaker: boolean }[]
  >([]);

  // Step 1: Mode & Reds validation
  const nextToStep2 = () => {
    setStep(2);
  };

  // Step 2: Select players validation
  const nextToStep3 = () => {
    if (selectedPlayerIds.length < 2) {
      alert('Please select at least 2 players.');
      return;
    }
    if (mode === 'team' && selectedPlayerIds.length % 2 !== 0) {
      alert('Team mode requires an even number of players (e.g. 2v2 or 3v3).');
      return;
    }

    // Populate default order
    const ordered = selectedPlayerIds.map((id, index) => {
      const p = availablePlayers.find(pl => pl.id === id)!;
      // Default team assignment in team mode (alternate players)
      const team_id = (mode === 'team' 
        ? (index % 2 === 0 ? 'team_a' : 'team_b') 
        : undefined) as 'team_a' | 'team_b' | undefined;

      return {
        id,
        name: p.name,
        team_id,
        is_breaker: index === 0, // default first player breaks
      };
    });

    setPlayerOrder(ordered);
    setStep(3);
  };

  const handleTogglePlayer = (id: string) => {
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(selectedPlayerIds.filter(pid => pid !== id));
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, id]);
    }
  };

  const handleAddNewPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    try {
      const newPlayer = await onAddPlayer(newPlayerName);
      setSelectedPlayerIds([...selectedPlayerIds, newPlayer.id]);
      setNewPlayerName('');
    } catch (err) {
      alert('Error creating player.');
    }
  };

  // Ordering logic
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...playerOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;
    setPlayerOrder(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === playerOrder.length - 1) return;
    const newOrder = [...playerOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;
    setPlayerOrder(newOrder);
  };

  const setBreaker = (id: string) => {
    setPlayerOrder(
      playerOrder.map(p => ({
        ...p,
        is_breaker: p.id === id,
      }))
    );
  };

  const toggleTeam = (index: number) => {
    if (mode !== 'team') return;
    const newOrder = [...playerOrder];
    newOrder[index].team_id = newOrder[index].team_id === 'team_a' ? 'team_b' : 'team_a';
    setPlayerOrder(newOrder);
  };

  const handleStart = () => {
    // Final validations
    const finalReds = redsCount === -1 ? parseInt(customReds) || 15 : redsCount;
    
    if (mode === 'team') {
      const teamACount = playerOrder.filter(p => p.team_id === 'team_a').length;
      const teamBCount = playerOrder.filter(p => p.team_id === 'team_b').length;
      if (teamACount === 0 || teamBCount === 0 || teamACount !== teamBCount) {
        alert('Teams must have an equal number of players (e.g. 2v2).');
        return;
      }
    }

    const hasBreaker = playerOrder.some(p => p.is_breaker);
    if (!hasBreaker) {
      alert('Please select a player to break off.');
      return;
    }

    onStartMatch({
      redsCount: finalReds,
      mode,
      players: playerOrder.map((p, idx) => ({
        id: p.id,
        play_order: idx + 1,
        team_id: p.team_id,
        is_breaker: p.is_breaker,
      })),
    });
  };

  return (
    <Card className="w-full max-w-xl mx-auto border-emerald-500/10 shadow-lg">
      <CardHeader className="bg-emerald-950/10 dark:bg-emerald-950/20 border-b border-emerald-500/10 rounded-t-2xl">
        <CardTitle className="flex justify-between items-center text-emerald-800 dark:text-emerald-300">
          <span>Match Configuration</span>
          <Badge variant="default" className="bg-emerald-700/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
            Step {step} of 3
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        
        {/* STEP 1: Game Settings */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">Match Mode</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMode('free_for_all')}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    mode === 'free_for_all'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-300 font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <div className="text-base">Free For All</div>
                  <div className="text-xs opacity-80 mt-1">2 to 5+ Players Rotation</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('team')}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    mode === 'team'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-300 font-semibold'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <div className="text-base">Team Mode</div>
                  <div className="text-xs opacity-80 mt-1">2v2 or Custom Partners</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">Reds Count</label>
              <div className="grid grid-cols-3 gap-3">
                {[15, 10, -1].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRedsCount(val)}
                    className={`py-3 px-2 rounded-xl border text-center text-sm transition-all ${
                      redsCount === val
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-300 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'
                    }`}
                  >
                    {val === 15 && '15 Reds (Full)'}
                    {val === 10 && '10 Reds (Short)'}
                    {val === -1 && 'Custom'}
                  </button>
                ))}
              </div>
              {redsCount === -1 && (
                <div className="mt-3">
                  <Input
                    type="number"
                    placeholder="Enter number of reds"
                    value={customReds}
                    onChange={(e) => setCustomReds(e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-900">
              <Button onClick={nextToStep2} className="flex gap-2">
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Player Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">Select Players ({selectedPlayerIds.length} selected)</label>
              <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {availablePlayers.map((p) => {
                  const isSelected = selectedPlayerIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleTogglePlayer(p.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/10'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'
                      }`}
                    >
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{p.name}</span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        isSelected 
                          ? 'bg-emerald-700 border-emerald-700 text-white' 
                          : 'border-zinc-300 dark:border-zinc-700'
                      }`}>
                        {isSelected && <Check size={12} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleAddNewPlayer} className="pt-4 border-t border-zinc-100 dark:border-zinc-900">
              <label className="block text-xs font-semibold uppercase text-zinc-500 mb-2">Create & Add New Player</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Player name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                />
                <Button type="submit" variant="secondary" className="flex gap-1.5 shrink-0">
                  <Plus size={16} />
                  Add
                </Button>
              </div>
            </form>

            <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-900">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={nextToStep3}>
                Next Step
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Order, Teams & Breaker */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Set Rotation Order</label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                {mode === 'team' 
                  ? 'Define the play sequence. Alternate team members for a fair rotation.'
                  : 'Order of turns from first shot to last.'}
              </p>
              
              <div className="space-y-2">
                {playerOrder.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30"
                  >
                    <div className="flex flex-col shrink-0">
                      <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-0.5 text-zinc-400 hover:text-zinc-800 disabled:opacity-30">
                        <ArrowUp size={16} />
                      </button>
                      <button onClick={() => moveDown(idx)} disabled={idx === playerOrder.length - 1} className="p-0.5 text-zinc-400 hover:text-zinc-800 disabled:opacity-30">
                        <ArrowDown size={16} />
                      </button>
                    </div>

                    <div className="font-semibold text-zinc-800 dark:text-zinc-200 grow text-sm flex items-center gap-2">
                      <span>{idx + 1}. {p.name}</span>
                      {p.is_breaker && (
                        <Badge variant="success" className="bg-emerald-700/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] py-0">
                          Breaks Off
                        </Badge>
                      )}
                    </div>

                    {mode === 'team' && (
                      <button
                        type="button"
                        onClick={() => toggleTeam(idx)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                          p.team_id === 'team_a'
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-400'
                            : 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/20 dark:border-orange-900 dark:text-orange-400'
                        }`}
                      >
                        {p.team_id === 'team_a' ? 'Team A' : 'Team B'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setBreaker(p.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                        p.is_breaker
                          ? 'bg-emerald-700 border-emerald-700 text-white font-semibold'
                          : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      Breaker
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-900">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleStart} className="flex gap-1.5 bg-emerald-800 hover:bg-emerald-950">
                <Play size={16} fill="currentColor" />
                Start Frame
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
