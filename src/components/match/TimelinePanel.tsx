import React, { useEffect, useRef } from 'react';
import { Card, CardContent, Badge } from '../ui';
import { FrameEvent, Player } from '../../lib/store';
import { Clock, ShieldCheck, HelpCircle } from 'lucide-react';

interface TimelinePanelProps {
  events: FrameEvent[];
  players: Player[];
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({ events, players }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // Identify all undone events
  const undoneEventIds = new Set<string>();
  events.forEach(e => {
    if (e.event_type === 'undo' && e.metadata?.undoes_event_id) {
      undoneEventIds.add(e.metadata.undoes_event_id);
      undoneEventIds.add(e.id);
    }
  });

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-[280px]">
      <div className="bg-zinc-50 dark:bg-zinc-900 px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center shrink-0">
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1">
          <Clock size={12} />
          Active Timeline & Audit Log
        </span>
        <Badge variant="default" className="text-[10px] bg-zinc-100 text-zinc-500 font-mono">
          {events.length} Events
        </Badge>
      </div>

      <div ref={scrollRef} className="p-4 overflow-y-auto space-y-3 grow bg-zinc-50/30 dark:bg-zinc-950/20 font-sans">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-400 dark:text-zinc-500 italic">
            Waiting for break-off shot...
          </div>
        ) : (
          events.map((event, idx) => {
            const isUndone = undoneEventIds.has(event.id);
            const player = players.find(p => p.id === event.player_id);
            const timeStr = new Date(event.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            if (event.event_type === 'undo') {
              return (
                <div key={event.id} className="text-[10px] text-zinc-400 italic flex items-center gap-1.5 pl-3 border-l-2 border-amber-500/50">
                  <span>{timeStr} — Recalled last scoring entry.</span>
                  <span className="text-[9px] opacity-75 font-mono">({event.device_info})</span>
                </div>
              );
            }

            return (
              <div
                key={event.id}
                className={`flex items-start justify-between text-xs py-1 ${
                  isUndone ? 'opacity-40 line-through' : ''
                }`}
              >
                <div className="flex gap-2">
                  <span className="font-mono text-zinc-400 dark:text-zinc-600 font-medium shrink-0">{timeStr}</span>
                  <div>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {player ? player.name : 'System'}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 ml-1">
                      {event.event_type === 'pot' && (
                        <span>
                          potted <span className="font-semibold capitalize text-emerald-700 dark:text-emerald-400">{event.ball}</span> (+{event.points})
                        </span>
                      )}
                      {event.event_type === 'foul' && (
                        <span>
                          committed a <span className="font-semibold text-rose-600 dark:text-rose-400">Foul</span> on <span className="capitalize font-semibold">{event.ball}</span> (+{event.points} to opponents)
                        </span>
                      )}
                      {event.event_type === 'pass_turn' && <span>passed turn</span>}
                    </span>
                  </div>
                </div>

                <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono text-right shrink-0">
                  {event.device_info}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
