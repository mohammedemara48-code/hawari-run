// Player name + PIN, with a server copy when /api is reachable.
import {
  loadProgress,
  mergeProgress,
  onProgressSave,
  saveProgress,
  type Progress,
} from './progress';
const PLAYER_KEY = 'hawari-player';
export interface Player {
  name: string;
  pin: string;
}
export function normalizeName(name: string) {
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 24);
}
export function validPin(pin: string) {
  return /^\d{4}$/.test(pin);
}
export function getPlayer(): Player | null {
  try {
    const p = JSON.parse(localStorage.getItem(PLAYER_KEY) || 'null');
    if (!p || typeof p.name !== 'string' || !validPin(p.pin)) return null;
    const name = normalizeName(p.name);
    return name.length >= 2 ? { name, pin: p.pin } : null;
  } catch {
    return null;
  }
}
export function setPlayer(p: Player) {
  try {
    localStorage.setItem(
      PLAYER_KEY,
      JSON.stringify({ name: normalizeName(p.name), pin: p.pin }),
    );
  } catch {
    /* Private browsing can disable storage. */
  }
}
export function clearPlayer() {
  try {
    localStorage.removeItem(PLAYER_KEY);
  } catch {
    /* ignore */
  }
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
      setPlayer({ name: n, pin });
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
    setPlayer({ name: String(data.name || n), pin });
    return { ok: true, created: !!data.created };
  } catch {
    // Offline: keep playing locally on first login, but don't swap players blindly.
    if (previous && !same)
      return { ok: false, error: 'مفيش شبكة، مش هقدر أغيّر اللاعب دلوقتي' };
    setPlayer({ name: n, pin });
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
async function pushProgress() {
  const p = getPlayer();
  if (!p) return;
  try {
    await fetch('/api/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: p.name,
        pin: p.pin,
        progress: loadProgress(),
      }),
    });
  } catch {
    /* Stay on the local cache. */
  }
}
export async function pullProgress() {
  const p = getPlayer();
  if (!p) return;
  try {
    const { res, data } = await post('/api/progress', {
      name: p.name,
      pin: p.pin,
    });
    if (!res.ok || !data.progress || typeof data.progress !== 'object') return;
    const merged = mergeProgress(loadProgress(), data.progress as Progress);
    saveProgress(merged, false);
    void pushProgress();
  } catch {
    /* Offline: keep the local cache. */
  }
}
onProgressSave(syncProgress);
