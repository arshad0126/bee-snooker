import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// Detect if we should use local mock storage instead of connecting to a remote Supabase
const isMock = supabaseUrl === 'https://your-project.supabase.co' || supabaseUrl === '';

// Initial mock data is empty by default so users start with a clean slate.
const INITIAL_MOCK_DATA = {
  groups: [],
  players: [],
  sessions: [],
  device_controllers: [],
  frames: [],
  frame_players: [],
  frame_events: []
};

// Initialize Mock database to LocalStorage if not exists
if (typeof window !== 'undefined' && isMock) {

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

class MockAuth {
  private listeners: Array<(event: string, session: any) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'mock_sb_session') {
          const session = this.getLocalStorageSession();
          this.notify(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
        }
      });
    }
  }

  private getLocalStorageSession() {
    if (typeof window === 'undefined') return null;
    const sessionStr = localStorage.getItem('mock_sb_session');
    if (!sessionStr) return null;
    try {
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  }

  private setLocalStorageSession(session: any) {
    if (typeof window === 'undefined') return;
    if (session) {
      localStorage.setItem('mock_sb_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('mock_sb_session');
    }
  }

  private notify(event: string, session: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, session);
      } catch (e) {
        console.error('Error in auth listener', e);
      }
    });
  }

  async getSession() {
    const session = this.getLocalStorageSession();
    return { data: { session }, error: null };
  }

  async signInWithOAuth(options: { provider: string; options?: { redirectTo?: string } }) {
    if (options.provider === 'google') {
      const mockUser = {
        id: 'mock-user-id-1234',
        email: 'mock.admin@bee-snooker.com',
        user_metadata: {
          full_name: 'Mock Admin',
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        },
      };
      const mockSession = {
        access_token: 'mock-token',
        user: mockUser,
      };
      this.setLocalStorageSession(mockSession);
      this.notify('SIGNED_IN', mockSession);
      return { data: { provider: 'google', url: '' }, error: null };
    }
    return { data: null, error: new Error('Unsupported provider') };
  }

  async signOut() {
    this.setLocalStorageSession(null);
    this.notify('SIGNED_OUT', null);
    return { error: null };
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    this.listeners.push(callback);
    // Call initially with current session
    const session = this.getLocalStorageSession();
    callback(session ? 'INITIAL_SESSION' : 'SIGNED_OUT', session);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter((l) => l !== callback);
          },
        },
      },
    };
  }
}

class MockSupabaseClient {
  auth = new MockAuth();

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

// Cache for Supabase clients to avoid multiple instances warning and reuse sessions
const clientCache: Record<string, any> = {};

// Dynamic client creator with custom group secret headers
export const getSupabaseClient = (identifier?: string) => {
  if (isMock) {
    return new MockSupabaseClient() as any;
  }

  // Check if identifier is a secret code starting with LOCAL-
  if (identifier && identifier.startsWith('LOCAL-')) {
    return new MockSupabaseClient() as any;
  }

  if (typeof window !== 'undefined') {
    // Check if the identifier matches a local group ID or secret code in mock storage
    const mockGroupsStr = localStorage.getItem('mock_sb_groups');
    if (mockGroupsStr) {
      try {
        const mockGroups = JSON.parse(mockGroupsStr);
        if (identifier && mockGroups.some((g: any) => g.id === identifier || g.secret_code === identifier)) {
          return new MockSupabaseClient() as any;
        }
      } catch {}
    }

    // Check if the active group is local
    const storedGroup = localStorage.getItem('bee_snooker_active_group');
    if (storedGroup) {
      try {
        const group = JSON.parse(storedGroup);
        if (group.secret_code?.startsWith('LOCAL-') || (identifier && group.id === identifier)) {
          if (group.secret_code?.startsWith('LOCAL-')) {
            return new MockSupabaseClient() as any;
          }
        }
      } catch (e) {
        console.error('Failed to parse active group from localStorage', e);
      }
    }
  }

  // Real Supabase path
  const key = identifier || 'default';
  if (clientCache[key]) {
    return clientCache[key];
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
    },
    global: {
      headers: identifier ? { 'x-group-secret': identifier } : {},
    },
  });

  clientCache[key] = client;
  return client;
};
