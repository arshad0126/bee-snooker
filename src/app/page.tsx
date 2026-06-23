'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, Input } from '@/components/ui';
import { getSupabaseClient } from '@/lib/supabase';
import { useMatchStore, Group } from '@/lib/store';
import { Trophy, PlusCircle, LogIn, ArrowRight, Club, Trash2 } from 'lucide-react';

const generateSecureCode = (length = 6): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint32Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 0x100000000);
    }
  }
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
};

export default function Home() {
  const router = useRouter();
  const setGroup = useMatchStore((state) => state.setGroup);
  const user = useMatchStore((state) => state.user);
  const signInWithGoogle = useMatchStore((state) => state.signInWithGoogle);
  const signOut = useMatchStore((state) => state.signOut);
  
  // States
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
  const [joinCode, setJoinCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [localGroupName, setLocalGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [recentGroups, setRecentGroups] = useState<Group[]>([]);
  const [ownedClubs, setOwnedClubs] = useState<Group[]>([]);
  const [isStandalone, setIsStandalone] = useState(true);

  // Detect if app is running as fullscreen standalone PWA
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    }
  }, []);

  // Parse error parameters from the hash on load (common Supabase OAuth failure callback)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      
      const params = new URLSearchParams(hash.replace('#', '?') || search);
      const error = params.get('error');
      const errorDescription = params.get('error_description');
      
      if (error) {
        alert(`Authentication Error: ${errorDescription || error}`);
        // Clean up url parameters to prevent repeating alert on refresh
        const cleanUrl = window.location.pathname + window.location.search.replace(/[\?&]error[^&]*/g, '');
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  // Load recent groups from localstorage with automatic cleanup of old preloaded mock data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRecent = localStorage.getItem('bee_snooker_recent_groups');
      const hasMockGroup = storedRecent?.includes('Lucknow Snooker Club') || 
                           storedRecent?.includes('mock-group-id-1') ||
                           localStorage.getItem('mock_sb_groups')?.includes('Lucknow Snooker Club');

      if (hasMockGroup) {
        // Clear all mock Postgres table simulators in localStorage
        const mockTables = ['groups', 'players', 'sessions', 'device_controllers', 'frames', 'frame_players', 'frame_events'];
        mockTables.forEach(table => {
          localStorage.removeItem(`mock_sb_${table}`);
        });

        // Filter out Lucknow mock group from recent list
        if (storedRecent) {
          try {
            const list = JSON.parse(storedRecent);
            const filtered = list.filter((g: any) => g.id !== 'mock-group-id-1' && !g.name.includes('Lucknow'));
            localStorage.setItem('bee_snooker_recent_groups', JSON.stringify(filtered));
            setRecentGroups(filtered);
          } catch (e) {
            setRecentGroups([]);
          }
        }

        // Clear active group if it was the mock group
        const storedActive = localStorage.getItem('bee_snooker_active_group');
        if (storedActive) {
          try {
            const active = JSON.parse(storedActive);
            if (active.id === 'mock-group-id-1' || active.name.includes('Lucknow')) {
              localStorage.removeItem('bee_snooker_active_group');
            }
          } catch (e) {}
        }
      } else if (storedRecent) {
        try {
          setRecentGroups(JSON.parse(storedRecent));
        } catch (e) {
          console.error('Failed to parse recent groups', e);
        }
      }
    }
  }, []);

  // Fetch owned groups for the logged-in user and merge with local storage list
  useEffect(() => {
    const fetchOwnedGroups = async () => {
      if (!user) {
        setOwnedClubs([]);
        return;
      }
      try {
        const client = getSupabaseClient();
        const { data, error } = await client
          .from('groups')
          .select('*')
          .eq('owner_id', user.id);
        
        if (error) throw error;
        
        if (data) {
          setOwnedClubs(data);
          
          if (data.length > 0) {
            const stored = localStorage.getItem('bee_snooker_recent_groups');
            let localList: Group[] = [];
            if (stored) {
              try { localList = JSON.parse(stored); } catch (e) {}
            }
            
            const merged = [...localList];
            data.forEach((group: Group) => {
              if (!merged.some(g => g.id === group.id)) {
                merged.push(group);
              }
            });
            
            const trimmed = merged.slice(0, 10);
            localStorage.setItem('bee_snooker_recent_groups', JSON.stringify(trimmed));
            setRecentGroups(trimmed);
          }
        }
      } catch (err) {
        console.error('Failed to fetch owned groups:', err);
      }
    };

    fetchOwnedGroups();
  }, [user]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setLoading(true);
    try {
      const code = joinCode.trim().toUpperCase();
      // supabase requires the secret header to see the group record
      const client = getSupabaseClient(code);
      
      const { data: group, error } = await client
        .from('groups')
        .select('*')
        .eq('secret_code', code)
        .single();

      if (error || !group) {
        alert('Group not found. Please verify the secret join code.');
        setLoading(false);
        return;
      }

      saveRecentGroup(group);
      setGroup(group);
      router.push(`/group/${group.id}`);
    } catch (err) {
      alert('Failed to connect to server.');
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setLoading(true);
    try {
      const randomCode = generateSecureCode(6);
      // Create group on server (bypass auth headers for group creation)
      const client = getSupabaseClient();
      const { data: group, error } = await client
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          secret_code: randomCode,
          owner_id: user?.id || null,
        })
        .select()
        .single();

      if (error || !group) {
        throw error;
      }

      saveRecentGroup(group);
      setGroup(group);
      router.push(`/group/${group.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create group. Try again.');
      setLoading(false);
    }
  };

  const handleCreateLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localGroupName.trim()) return;

    setLocalLoading(true);
    try {
      const randomCode = 'LOCAL-' + generateSecureCode(6);
      const client = getSupabaseClient(randomCode);
      
      const { data: group, error } = await client
        .from('groups')
        .insert({
          name: localGroupName.trim(),
          secret_code: randomCode,
          owner_id: null,
        })
        .select()
        .single();

      if (error || !group) {
        throw error || new Error('Failed to create local group');
      }

      saveRecentGroup(group);
      setGroup(group);
      router.push(`/group/${group.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create local club. Try again.');
      setLocalLoading(false);
    }
  };

  const saveRecentGroup = (group: Group) => {
    const stored = localStorage.getItem('bee_snooker_recent_groups');
    let list: Group[] = [];
    if (stored) {
      try { list = JSON.parse(stored); } catch (e) {}
    }
    // Remove if already exists, then prepend
    list = list.filter(g => g.id !== group.id);
    list.unshift(group);
    // Keep max 5
    list = list.slice(0, 5);
    localStorage.setItem('bee_snooker_recent_groups', JSON.stringify(list));
    setRecentGroups(list);
  };

  const handleSelectRecent = (group: Group) => {
    setGroup(group);
    router.push(`/group/${group.id}`);
  };

  const handleDeleteRecent = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    const updated = recentGroups.filter(g => g.id !== groupId);
    localStorage.setItem('bee_snooker_recent_groups', JSON.stringify(updated));
    setRecentGroups(updated);
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 relative overflow-hidden">
      
      {/* Decorative Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2 mb-8">
        <div className="mx-auto w-14 h-14 bg-emerald-950/40 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
          <Trophy size={32} />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-800 dark:text-white font-sans mt-4">
          Bee Snooker
        </h1>
        <p className="text-sm font-semibold tracking-widest text-emerald-500 uppercase font-mono">
          Every Shot Counts
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveTab('join')}
            className={`grow py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'join'
                ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <LogIn size={16} />
            Join Club
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`grow py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'create'
                ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <PlusCircle size={16} />
            Create Club
          </button>
        </div>

        {/* Action Card */}
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 backdrop-blur-md shadow-2xl">
          <CardContent className="pt-6">
            
            {/* JOIN CLUB FORM */}
            {activeTab === 'join' && (
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-zinc-400">Secret Group Code</label>
                  <Input
                    placeholder="E.g. A9B8C7"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 text-zinc-800 dark:text-white text-center text-lg font-bold font-mono placeholder-zinc-450 uppercase tracking-widest h-12"
                    required
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !joinCode}
                  className="w-full bg-emerald-800 hover:bg-emerald-700 h-12 rounded-xl text-sm font-bold flex gap-1.5"
                >
                  {loading ? 'Validating...' : 'Join Club'}
                  {!loading && <ArrowRight size={16} />}
                </Button>
              </form>
            )}

            {/* CREATE CLUB FORM */}
            {activeTab === 'create' && (
              <div className="space-y-6">
                {/* Option 1: Local Only Club (No Login) */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/10 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                      <Club size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Local-Only Club</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
                        Store all club rosters, matches, and stats locally on this device. No internet or login required.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateLocal} className="space-y-3">
                    <Input
                      placeholder="E.g. My Roster (Local)"
                      value={localGroupName}
                      onChange={(e) => setLocalGroupName(e.target.value)}
                      className="border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 text-zinc-800 dark:text-white text-sm placeholder-zinc-450 dark:placeholder-zinc-550 h-10"
                      required
                      disabled={localLoading || loading}
                    />
                    <Button
                      type="submit"
                      disabled={localLoading || loading || !localGroupName.trim()}
                      className="w-full bg-emerald-800 hover:bg-emerald-700 text-white h-10 rounded-xl text-xs font-bold flex gap-1.5 justify-center items-center"
                    >
                      {localLoading ? 'Creating Local Club...' : 'Create Local Club'}
                      {!localLoading && <ArrowRight size={14} />}
                    </Button>
                  </form>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-[1px] grow bg-zinc-200 dark:bg-zinc-800"></div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Or</span>
                  <div className="h-[1px] grow bg-zinc-200 dark:bg-zinc-800"></div>
                </div>

                {/* Option 2: Cloud Sync Club (Supabase) */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/10 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                      <Trophy size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Cloud-Synced Club</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
                        Save data in the cloud. Access or referee from multiple devices simultaneously. Requires Google Admin Login.
                      </p>
                    </div>
                  </div>

                  {!user ? (
                    <Button
                      type="button"
                      onClick={signInWithGoogle}
                      className="w-full bg-zinc-900 dark:bg-zinc-850 hover:bg-zinc-850 dark:hover:bg-zinc-800 text-white h-10 rounded-xl text-xs font-bold flex justify-center items-center gap-2"
                      disabled={loading || localLoading}
                    >
                      <LogIn size={14} />
                      Sign in with Google to Create
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 text-[10px] text-zinc-500 font-mono">
                        <span className="truncate">Admin: <strong className="text-zinc-700 dark:text-zinc-300">{user.email}</strong></span>
                        <button
                          type="button"
                          onClick={signOut}
                          className="text-rose-500 hover:text-rose-600 font-semibold underline underline-offset-2 cursor-pointer ml-1 inline-touch-exempt"
                        >
                          Sign Out
                        </button>
                      </div>

                      {ownedClubs.length > 0 && (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold uppercase text-zinc-400">Your Clubs</label>
                          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                            {ownedClubs.map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => handleSelectRecent(g)}
                                className="w-full flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 rounded-xl cursor-pointer transition-all text-left group inline-touch-exempt"
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                                    {g.name}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                    CODE: {g.secret_code}
                                  </div>
                                </div>
                                <ArrowRight size={14} className="text-zinc-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                              </button>
                            ))}
                          </div>
                          
                          <div className="flex items-center gap-3 py-1">
                            <div className="h-[1px] grow bg-zinc-200 dark:bg-zinc-800"></div>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Or Create New</span>
                            <div className="h-[1px] grow bg-zinc-200 dark:bg-zinc-800"></div>
                          </div>
                        </div>
                      )}

                      <form onSubmit={handleCreate} className="space-y-3">
                        <label className="block text-xs font-bold uppercase text-zinc-400">Club Name</label>
                        <Input
                          placeholder="E.g. Lucknow Snooker Club"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 text-zinc-800 dark:text-white text-sm placeholder-zinc-450 dark:placeholder-zinc-550 h-10"
                          required
                          disabled={loading || localLoading}
                        />
                        <Button
                          type="submit"
                          disabled={loading || localLoading || !newGroupName.trim()}
                          className="w-full bg-blue-800 hover:bg-blue-700 text-white h-10 rounded-xl text-xs font-bold flex gap-1.5 justify-center items-center"
                        >
                          {loading ? 'Creating Cloud Club...' : 'Create Cloud Club'}
                          {!loading && <ArrowRight size={14} />}
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Groups List */}
        {recentGroups.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">
              Recent Clubs
            </h3>
            <div className="space-y-2">
              {recentGroups.map((g) => (
                <div
                  key={g.id}
                  onClick={() => handleSelectRecent(g)}
                  className="flex items-center justify-between p-3.5 bg-zinc-900/60 border border-zinc-850 hover:border-emerald-600/30 rounded-xl cursor-pointer hover:bg-zinc-850 transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Club className="text-emerald-500/70 shrink-0" size={16} />
                    <div className="truncate">
                      <div className="text-sm font-semibold text-zinc-200 group-hover:text-white truncate">
                        {g.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono tracking-wider">
                        CODE: {g.secret_code}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeleteRecent(e, g.id)}
                      className="p-1.5 text-zinc-600 hover:text-rose-500 hover:bg-zinc-800 rounded-lg transition-all"
                      title="Remove from history"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ArrowRight size={14} className="text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reset App cache option */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mt-6 space-y-4">
        <button
          onClick={() => {
            if (confirm("Are you sure you want to start from scratch? This will clear all local clubs, players, and session data.")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="text-[11px] text-zinc-550 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350 underline transition-colors"
        >
          Reset All Local Data (Start from Scratch)
        </button>

        {!isStandalone && (
          <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl text-center text-xs text-zinc-400 space-y-1">
            <span className="font-semibold text-emerald-400">Install as Fullscreen App:</span>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              On iOS, tap <span className="underline">Share</span> → <span className="underline">Add to Home Screen</span>. On Android, tap the menu → <span className="underline">Install App</span>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
