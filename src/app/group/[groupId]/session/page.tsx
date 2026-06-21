'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { useMatchStore, Session, Frame } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Badge } from '@/components/ui';
import { Calendar, Clock, Trophy, ChevronRight, Archive, Inbox } from 'lucide-react';

export default function MemoryVault() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const client = getSupabaseClient();
      
      // Fetch sessions
      const { data: sessionsData } = await client
        .from('sessions')
        .select('*')
        .eq('group_id', groupId)
        .order('start_time', { ascending: false });

      setSessions(sessionsData || []);

      // Fetch frames
      const { data: framesData } = await client
        .from('frames')
        .select('*, session:sessions!inner(*)')
        .eq('session.group_id', groupId);

      setFrames(framesData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [groupId]);

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} mins`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
        <Archive className="text-emerald-500" size={20} />
        <div>
          <h2 className="text-lg font-bold">Memory Vault</h2>
          <p className="text-xs text-zinc-500">Browse years of gathering histories, achievements, and stats.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-400">Loading history...</div>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed border-zinc-800 bg-zinc-900/10 py-16 text-center">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <Inbox className="text-zinc-600" size={32} />
            <h4 className="font-semibold text-sm">No Memories Stored Yet</h4>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              Once you start playing and completing sessions, they will be archived permanently in the Memory Vault.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map(s => {
            const sessionFrames = frames.filter(f => f.session_id === s.id);
            const isCompleted = !!s.end_time;
            const dateStr = new Date(s.start_time).toLocaleDateString([], {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const timeStr = new Date(s.start_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card
                key={s.id}
                onClick={() => router.push(`/group/${groupId}/session/${s.id}/summary`)}
                className="border-zinc-200 dark:border-zinc-800 hover:border-emerald-600/35 cursor-pointer bg-white dark:bg-zinc-950 transition-all hover:shadow-md flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm font-semibold">{dateStr}</CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">{timeStr} kick-off</CardDescription>
                    </div>
                    <Badge variant={isCompleted ? 'success' : 'warning'} className="text-[9px] py-0 px-2">
                      {isCompleted ? 'Completed' : 'Active'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900">
                    <div>
                      <div className="text-[9px] font-bold text-zinc-400 uppercase">Frames</div>
                      <div className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5">
                        {sessionFrames.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-zinc-400 uppercase">Duration</div>
                      <div className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5">
                        {isCompleted ? formatDuration(s.duration_seconds) : 'Running'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-zinc-400 uppercase">Status</div>
                      <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
                        {isCompleted ? 'Archived' : 'Live'}
                      </div>
                    </div>
                  </div>

                  {s.notes && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 italic bg-zinc-50/50 dark:bg-zinc-900/20 p-2 rounded-lg border border-zinc-100 dark:border-zinc-900">
                      &ldquo;{s.notes}&rdquo;
                    </p>
                  )}
                </CardContent>
                <div className="px-6 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-900 mt-2 flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <span>View Details & Summary</span>
                  <ChevronRight size={14} className="text-zinc-400" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
