// Player name + PIN, with a server copy when /api is reachable.
import {
  loadProgress,
  mergeProgress,
  onProgressSave,
  saveProgress,
  type Progress,
} from './progress';
const PLAYER_KEY = 'hawari-player';
let legacyCredential: { name: string; pin: string } | null = null;
export type SyncState =
  'local' | 'syncing' | 'synced' | 'offline' | 'login-required' | 'error';
let syncState: SyncState = 'local';
const syncListeners = new Set<(state: SyncState) => void>();
export function onSyncState(fn: (state: SyncState) => void) {
  syncListeners.add(fn);
  fn(syncState);
  return () => {
    syncListeners.delete(fn);
  };
}
export function getSyncState() {
  return syncState;
}
function status(state: SyncState) {
  syncState = state;
  syncListeners.forEach((fn) => fn(state));
}
function legacyPin(name: string) {
  return legacyCredential?.name === name ? legacyCredential.pin : undefined;
}

export interface Player {
  name: string;
  /** Input-only legacy migration. Never persisted by this build. */
  pin?: string;
}
export function normalizeName(name: string) {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 24);
}
export function validPin(pin: string) {
  return /^\d{4}$/.test(pin);
}
// Some in-app browsers (Telegram, Facebook) wipe localStorage between visits,
// so the player is also kept in a year-long cookie.
function readCookie(): string | null {
  try {
    const m = document.cookie.match(/(?:^|; )hawari-player=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}
function writeCookie(v: string | null) {
  try {
    document.cookie = v
      ? `hawari-player=${encodeURIComponent(v)}; max-age=31536000; path=/; SameSite=Lax; Secure`
      : 'hawari-player=; max-age=0; path=/';
  } catch {
    /* ignore */
  }
}
export function getPlayer(): Player | null {
  try {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(PLAYER_KEY);
    } catch {
      /* storage blocked */
    }
    if (!raw) {
      raw = readCookie();
      if (raw)
        try {
          localStorage.setItem(PLAYER_KEY, raw);
        } catch {
          /* ignore */
        }
    }
    const p = JSON.parse(raw || 'null');
    if (!p || typeof p.name !== 'string') return null;
    const name = normalizeName(p.name);
    if (name.length < 2) return null;
    if (validPin(p.pin)) {
      legacyCredential = { name, pin: p.pin };
      setPlayer({ name });
    }
    return { name };
  } catch {
    return null;
  }
}
export function setPlayer(p: Player) {
  const name = normalizeName(p.name);
  if (validPin(p.pin || '')) legacyCredential = { name, pin: p.pin! };
  const v = JSON.stringify({ name });
  writeCookie(v);
  void idbSet(v);
  try {
    localStorage.setItem(PLAYER_KEY, v);
  } catch {
    /* Private browsing can disable storage. */
  }
}
export function clearPlayer() {
  legacyCredential = null;
  status('local');
  writeCookie(null);
  void idbSet(null);
  void fetch('/api/me', { method: 'DELETE' }).catch(() => {});
  try {
    localStorage.removeItem(PLAYER_KEY);
  } catch {
    /* ignore */
  }
}
// IndexedDB: one more copy of the player, for browsers that clear
// localStorage and cookies but keep IndexedDB.
function idb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const r = indexedDB.open('hawari', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
async function idbSet(v: string | null) {
  const db = await idb();
  if (!db) return;
  try {
    const st = db.transaction('kv', 'readwrite').objectStore('kv');
    if (v) st.put(v, 'player');
    else st.delete('player');
    st.transaction.oncomplete = () => db.close();
    st.transaction.onerror = () => db.close();
  } catch {
    /* ignore */
  }
}
async function idbGet(): Promise<string | null> {
  const db = await idb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const r = db.transaction('kv').objectStore('kv').get('player');
      r.onsuccess = () => {
        db.close();
        resolve(typeof r.result === 'string' ? r.result : null);
      };
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T) =>
  Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
/** On start: bring the player back from IndexedDB or the server session
 * (httpOnly cookie) when page storage was wiped, and make sure a device
 * that only ever logged in locally gets a server session. */
export async function restoreSession(): Promise<boolean> {
  if (!getPlayer()) {
    const raw = await withTimeout(idbGet(), 800, null);
    if (raw) {
      try {
        const p = JSON.parse(raw) as Player;
        if (p && typeof p.name === 'string') setPlayer(p);
      } catch {
        /* ignore */
      }
    }
  }
  const local = getPlayer();
  if (local) setPlayer(local); // Scrub legacy copies in cookie and IndexedDB too.
  try {
    const res = await withTimeout(
      fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }),
      3500,
      null,
    );
    if (res && res.ok) {
      const data = (await res.json()) as {
        name?: string;
        progress?: Progress;
      };
      if (typeof data.name === 'string') {
        const same =
          local && normalizeName(local.name) === normalizeName(data.name);
        if (!local || same) {
          setPlayer({ name: data.name });
          legacyCredential = null;
          status('synced');
          if (data.progress && typeof data.progress === 'object') {
            saveProgress(mergeProgress(loadProgress(), data.progress), false);
            void pushProgress();
          }
          return true;
        }
      }
    } else if (res && res.status === 401 && local && legacyPin(local.name)) {
      // Logged in on this device but never got a server session (offline
      // at the time, or an older build): log in quietly now.
      await login(local.name, legacyPin(local.name)!);
    } else if (res && res.status === 401) {
      status('login-required');
    } else {
      status(res ? 'error' : 'offline');
    }
  } catch {
    status('offline'); /* Offline: play on the local copy. */
  }
  return !!getPlayer();
}
/** First visit asks for a name; Playwright runs skip this unless ?login=1. */
export function needsLogin() {
  if (getPlayer()) return false;
  try {
    if (new URLSearchParams(location.search).has('login')) return true;
    if (navigator.webdriver) return false;
  } catch {
    /* ignore */
  }
  return true;
}
type LoginResult =
  { ok: true; created?: boolean } | { ok: false; error: string };
async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  let data: Record<string, unknown>;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  return { res, data };
}
export async function login(name: string, pin: string): Promise<LoginResult> {
  const n = normalizeName(name);
  if (n.length < 2) return { ok: false, error: 'الاسم قصّر أوي' };
  if (!validPin(pin)) return { ok: false, error: 'الرقم السري لازم ٤ أرقام' };
  const previous = getPlayer();
  const same = previous ? normalizeName(previous.name) === n : false;
  // First login uploads the local journey. Switching to another name does not.
  const local = loadProgress();
  const payload = !previous || same ? local : null;
  try {
    const { res, data } = await post('/api/login', {
      name: n,
      pin,
      progress: payload,
    });
    if (res.status === 429)
      return {
        ok: false,
        error: String(data.error || 'استنى شوية وجرّب تاني'),
      };
    if (res.status === 401)
      return { ok: false, error: String(data.error || 'الرقم السري غلط') };
    if (res.status === 400)
      return { ok: false, error: String(data.error || 'حصل خطأ، جرّب تاني') };
    if (!res.ok || typeof data.name !== 'string') {
      // API missing or down: play with a local account.
      if (previous && !same)
        return { ok: false, error: 'مفيش شبكة، مش هقدر أغيّر اللاعب دلوقتي' };
      setPlayer({ name: n });
      status('local');
      return { ok: true };
    }
    const server = data.progress as Progress | undefined;
    if (server && typeof server === 'object') {
      const next = !previous || same ? mergeProgress(local, server) : server;
      saveProgress(next, false);
    } else if (previous && !same) {
      saveProgress(
        {
          unlocked: 0,
          best: {},
          coins: {},
          secrets: {},
          cleared: {},
          resume: null,
        },
        false,
      );
    }
    setPlayer({ name: String(data.name || n) });
    legacyCredential = null;
    status('synced');
    return { ok: true, created: !!data.created };
  } catch {
    // Offline: keep playing locally on first login, but don't swap players blindly.
    if (previous && !same)
      return { ok: false, error: 'مفيش شبكة، مش هقدر أغيّر اللاعب دلوقتي' };
    setPlayer({ name: n });
    status('offline');
    return { ok: true };
  }
}
let syncTimer = 0;
export function syncProgress() {
  const p = getPlayer();
  if (!p || typeof window === 'undefined') return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    void pushProgress();
  }, 400);
}
let pushing = false;
let pushAgain = false;
async function pushProgress() {
  if (pushing) {
    pushAgain = true;
    return;
  }
  pushing = true;
  status('syncing');
  try {
    do {
      pushAgain = false;
      const p = getPlayer();
      if (!p) break;
      try {
        const res = await fetch('/api/progress', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            name: p.name,
            pin: legacyPin(p.name),
            progress: loadProgress(),
          }),
        });
        if (!res.ok) {
          status(res.status === 401 ? 'login-required' : 'error');
          break;
        }
        const data = await res.json();
        legacyCredential = null;
        status('synced');
        if (getPlayer()?.name === p.name && data.progress)
          saveProgress(mergeProgress(loadProgress(), data.progress), false);
      } catch {
        status('offline');
        break; /* Stay on the local cache. */
      }
    } while (pushAgain);
  } finally {
    pushing = false;
  }
}
export async function pullProgress() {
  const p = getPlayer();
  if (!p) return;
  try {
    const { res, data } = await post('/api/progress', {
      name: p.name,
      pin: legacyPin(p.name),
    });
    if (!res.ok) {
      status(res.status === 401 ? 'login-required' : 'error');
      return;
    }
    if (!data.progress || typeof data.progress !== 'object') return;
    legacyCredential = null;
    status('synced');
    const merged = mergeProgress(loadProgress(), data.progress as Progress);
    saveProgress(merged, false);
    void pushProgress();
  } catch {
    status('offline'); /* Offline: keep the local cache. */
  }
}
onProgressSave(syncProgress);
if (typeof window !== 'undefined')
  window.addEventListener('online', () => {
    void restoreSession().then(() => pushProgress());
  });
