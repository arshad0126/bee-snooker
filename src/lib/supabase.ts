import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// Detect if we should use local mock storage instead of connecting to a remote Supabase
const isMock = supabaseUrl === 'https://your-project.supabase.co' || supabaseUrl === '';

// Initial rich demonstration mock data
const INITIAL_MOCK_DATA = {
  groups: [
    {
      id: 'mock-group-id-1',
      name: 'Lucknow Snooker Club',
      secret_code: 'LUCKNOW',
      created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    }
  ],
  players: [
    {
      id: 'mock-player-arshad',
      group_id: 'mock-group-id-1',
      name: 'Arshad Khan',
      photo_url: '',
      status: 'active',
      elo_rating: 1120,
      created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'mock-player-awais',
      group_id: 'mock-group-id-1',
      name: 'Awais Ahmad',
      photo_url: '',
      status: 'active',
      elo_rating: 1050,
      created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'mock-player-suraj',
      group_id: 'mock-group-id-1',
      name: 'Suraj Prasad',
      photo_url: '',
      status: 'active',
      elo_rating: 980,
      created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'mock-player-karan',
      group_id: 'mock-group-id-1',
      name: 'Karan Malhotra',
      photo_url: '',
      status: 'active',
      elo_rating: 850,
      created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    }
  ],
  sessions: [
    {
      id: 'mock-session-1',
      group_id: 'mock-group-id-1',
      start_time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      end_time: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      duration_seconds: 3600,
      photos: [],
      notes: 'Inaugural match session at Lucknow Snooker Club!',
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    }
  ],
  device_controllers: [
    {
      group_id: 'mock-group-id-1',
      controller_device_id: 'mock-device-id',
      updated_at: new Date().toISOString(),
    }
  ],
  frames: [
    {
      id: 'mock-frame-1',
      session_id: 'mock-session-1',
      reds_count: 15,
      mode: 'free_for_all',
      status: 'completed',
      winner_id: 'mock-player-arshad',
      notes: 'Arshad cleared the table with a high break of 35!',
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: 'mock-frame-2',
      session_id: 'mock-session-1',
      reds_count: 15,
      mode: 'free_for_all',
      status: 'completed',
      winner_id: 'mock-player-awais',
      notes: 'Awais secured a close frame victory after Suraj fouled on the pink.',
      created_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
    }
  ],
  frame_players: [
    { frame_id: 'mock-frame-1', player_id: 'mock-player-arshad', play_order: 1, team_id: null, is_breaker: true },
    { frame_id: 'mock-frame-1', player_id: 'mock-player-awais', play_order: 2, team_id: null, is_breaker: false },
    { frame_id: 'mock-frame-1', player_id: 'mock-player-suraj', play_order: 3, team_id: null, is_breaker: false },
    
    { frame_id: 'mock-frame-2', player_id: 'mock-player-arshad', play_order: 1, team_id: null, is_breaker: false },
    { frame_id: 'mock-frame-2', player_id: 'mock-player-awais', play_order: 2, team_id: null, is_breaker: true },
    { frame_id: 'mock-frame-2', player_id: 'mock-player-suraj', play_order: 3, team_id: null, is_breaker: false },
  ],
  frame_events: [
    // Frame 1 events
    { id: 'fe-1', frame_id: 'mock-frame-1', player_id: 'mock-player-arshad', event_type: 'pot', ball: 'red', points: 1, sequence_no: 1, device_info: 'Controller', created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    { id: 'fe-2', frame_id: 'mock-frame-1', player_id: 'mock-player-arshad', event_type: 'pot', ball: 'black', points: 7, sequence_no: 2, device_info: 'Controller', created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    { id: 'fe-3', frame_id: 'mock-frame-1', player_id: 'mock-player-awais', event_type: 'pot', ball: 'red', points: 1, sequence_no: 3, device_info: 'Controller', created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    { id: 'fe-4', frame_id: 'mock-frame-1', player_id: 'mock-player-awais', event_type: 'foul', ball: 'blue', points: 5, sequence_no: 4, device_info: 'Controller', created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    
    // Frame 2 events
    { id: 'fe-5', frame_id: 'mock-frame-2', player_id: 'mock-player-awais', event_type: 'pot', ball: 'red', points: 1, sequence_no: 1, device_info: 'Controller', created_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString() },
    { id: 'fe-6', frame_id: 'mock-frame-2', player_id: 'mock-player-awais', event_type: 'pot', ball: 'pink', points: 6, sequence_no: 2, device_info: 'Controller', created_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString() },
  ]
};

// Initialize Mock database to LocalStorage if not exists
if (typeof window !== 'undefined' && isMock) {
  // Pre-seed recent groups
  const recent = localStorage.getItem('bee_snooker_recent_groups');
  if (!recent) {
    localStorage.setItem('bee_snooker_recent_groups', JSON.stringify([
      {
        id: 'mock-group-id-1',
        name: 'Lucknow Snooker Club',
        secret_code: 'LUCKNOW',
      }
    ]));
  }

  // Pre-seed tables
  Object.keys(INITIAL_MOCK_DATA).forEach((table) => {
    const key = `mock_sb_${table}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify((INITIAL_MOCK_DATA as any)[table]));
    }
  });
}

class MockQueryBuilder {
  private table: string;
  private filters: Array<(item: any) => boolean> = [];
  private sortCol: string | null = null;
  private sortAsc = true;
  private limitCount: number | null = null;
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private opData: any = null;

  constructor(table: string) {
    this.table = table;
  }

  private getItems(): any[] {
    if (typeof window === 'undefined') return [];
    
    const key = `mock_sb_${this.table}`;
    let items = localStorage.getItem(key);
    if (!items) {
      const initial = (INITIAL_MOCK_DATA as any)[this.table] || [];
      localStorage.setItem(key, JSON.stringify(initial));
      items = JSON.stringify(initial);
    }
    
    const parsed = JSON.parse(items);
    
    // Resolve Joins for client display
    return parsed.map((item: any) => {
      const copy = { ...item };
      
      // Join Player Profile on frame_players
      if (this.table === 'frame_players') {
        const players = JSON.parse(localStorage.getItem('mock_sb_players') || '[]');
        copy.player = players.find((p: any) => p.id === copy.player_id) || null;
      }
      
      // Join Frame and Session
      if (this.table === 'frame_players' || this.table === 'frame_events') {
        const frames = JSON.parse(localStorage.getItem('mock_sb_frames') || '[]');
        const frame = frames.find((f: any) => f.id === copy.frame_id) || null;
        if (frame) {
          const sessions = JSON.parse(localStorage.getItem('mock_sb_sessions') || '[]');
          const session = sessions.find((s: any) => s.id === frame.session_id) || null;
          copy.frame = { ...frame, session };
        } else {
          copy.frame = null;
        }
      }
      
      // Join Session on frames
      if (this.table === 'frames') {
        const sessions = JSON.parse(localStorage.getItem('mock_sb_sessions') || '[]');
        copy.session = sessions.find((s: any) => s.id === copy.session_id) || null;
      }

      return copy;
    });
  }

  private saveItems(items: any[]) {
    if (typeof window === 'undefined') return;
    const cleanItems = items.map(item => {
      const copy = { ...item };
      delete copy.player;
      delete copy.frame;
      delete copy.session;
      return copy;
    });
    localStorage.setItem(`mock_sb_${this.table}`, JSON.stringify(cleanItems));

    // Dispatch mock storage change event so components/subscribers update
    window.dispatchEvent(new CustomEvent('mock_postgres_change', { detail: { table: this.table } }));
  }

  select(cols?: string) {
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push((item) => {
      if (col.includes('.')) {
        const parts = col.split('.');
        let current = item;
        for (const part of parts) {
          if (current === null || current === undefined) return false;
          current = current[part];
        }
        return current === val;
      }
      return item[col] === val;
    });
    return this;
  }

  is(col: string, val: any) {
    this.filters.push((item) => {
      return item[col] === val;
    });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.sortCol = col;
    this.sortAsc = opts?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async single() {
    const res = await this.execute();
    return { data: res.data ? (Array.isArray(res.data) ? res.data[0] : res.data) : null, error: null };
  }

  insert(data: any) {
    this.op = 'insert';
    this.opData = data;
    return this;
  }

  update(data: any) {
    this.op = 'update';
    this.opData = data;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  upsert(data: any) {
    this.op = 'upsert';
    this.opData = data;
    return this;
  }

  async execute() {
    if (this.op === 'insert') {
      const items = this.getItems();
      const rowsToInsert = Array.isArray(this.opData) ? this.opData : [this.opData];
      const inserted: any[] = [];
      
      rowsToInsert.forEach(row => {
        const newRow = {
          id: row.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...row
        };
        items.push(newRow);
        inserted.push(newRow);
      });

      this.saveItems(items);
      const result = Array.isArray(this.opData) ? inserted : inserted[0];
      return { data: result, error: null };
    }

    if (this.op === 'update') {
      const items = this.getItems();
      const updated: any[] = [];
      
      const updatedItems = items.map(item => {
        const matches = this.filters.every(f => f(item));
        if (matches) {
          const newItem = { ...item, ...this.opData };
          updated.push(newItem);
          return newItem;
        }
        return item;
      });

      this.saveItems(updatedItems);
      const result = Array.isArray(this.opData) ? updated : updated[0] || null;
      return { data: result, error: null };
    }

    if (this.op === 'delete') {
      const items = this.getItems();
      const remaining = items.filter(item => {
        const matches = this.filters.every(f => f(item));
        return !matches;
      });
      this.saveItems(remaining);
      return { data: null, error: null };
    }

    if (this.op === 'upsert') {
      const items = this.getItems();
      const rows = Array.isArray(this.opData) ? this.opData : [this.opData];
      
      rows.forEach(row => {
        let matchIdx = -1;
        if (row.id) {
          matchIdx = items.findIndex(item => item.id === row.id);
        } else if (this.table === 'device_controllers' && row.group_id) {
          matchIdx = items.findIndex(item => item.group_id === row.group_id);
        }
        
        if (matchIdx !== -1) {
          items[matchIdx] = { ...items[matchIdx], ...row, updated_at: new Date().toISOString() };
        } else {
          items.push({
            id: row.id || crypto.randomUUID(),
            created_at: new Date().toISOString(),
            ...row
          });
        }
      });

      this.saveItems(items);
      return { data: this.opData, error: null };
    }

    // select query
    let items = this.getItems();
    
    this.filters.forEach(filter => {
      items = items.filter(filter);
    });

    if (this.sortCol) {
      const col = this.sortCol;
      const asc = this.sortAsc;
      items.sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (valA < valB) return asc ? -1 : 1;
        return asc ? 1 : -1;
      });
    }

    if (this.limitCount !== null) {
      items = items.slice(0, this.limitCount);
    }

    return { data: items, error: null };
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class MockSupabaseClient {
  from(table: string) {
    return new MockQueryBuilder(table);
  }

  channel(name: string) {
    return {
      on: function(event: string, filter: any, callback: any) {
        if (typeof window !== 'undefined') {
          const listener = (e: Event) => {
            const ev = e as CustomEvent;
            if (ev.detail && ev.detail.table === filter.table) {
              callback({ new: {} });
            }
          };
          window.addEventListener('mock_postgres_change', listener);
        }
        return this;
      },
      subscribe: function(callback: any) {
        setTimeout(() => callback('SUBSCRIBED'), 50);
        return this;
      }
    };
  }

  removeChannel(channel: any) {
    // Cleanup listeners if needed
  }
}

// Global Supabase client instance
export const supabase = isMock ? (new MockSupabaseClient() as any) : createClient(supabaseUrl, supabaseAnonKey);

// Dynamic client creator with custom group secret headers
export const getSupabaseClient = (secretCode?: string) => {
  if (isMock) {
    return new MockSupabaseClient() as any;
  }

  if (!secretCode) {
    if (typeof window !== 'undefined') {
      const storedGroup = localStorage.getItem('bee_snooker_active_group');
      if (storedGroup) {
        try {
          const group = JSON.parse(storedGroup);
          secretCode = group.secret_code;
        } catch (e) {
          console.error('Failed to parse active group from localStorage', e);
        }
      }
    }
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: secretCode ? { 'x-group-secret': secretCode } : {},
    },
  });
};
