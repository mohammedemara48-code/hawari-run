// "فيه تحديث جديد": tells a player whose open game is older than the deployed
// one, and offers to reload into the new version. Also shows what's new once
// after an update.
import {
  APP_VERSION,
  releasesSince,
  type Release,
  type VersionInfo,
} from './changelog';

declare const __BUILD__: string;
const SEEN = 'hawari-seen-version';
let root: HTMLElement | null = null;
let pending: VersionInfo | null = null;
let dismissed = '';
let checking = false;

const esc = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!,
  );
const notesHtml = (list: Release[]) => {
  const notes = list.flatMap((r) => r.notes).slice(0, 6);
  return notes.length
    ? `<ul class="update-notes">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`
    : '<p>تحسينات وتصليحات صغيرة علشان اللعب يبقى أحلى.</p>';
};
const playing = () =>
  document.getElementById('game-wrap')?.classList.contains('playing') ?? false;

function close(next = true) {
  root?.remove();
  root = null;
  document.body.classList.remove('update-open');
  // An update prompt that arrived while another dialog was open.
  if (next && pending && !playing()) {
    const info = pending;
    pending = null;
    showUpdate(info);
  }
}

function open(html: string, wire: (el: HTMLElement) => void) {
  close(false);
  const el = document.createElement('div');
  el.className = 'update-dialog';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'update-title');
  el.innerHTML = `<div class="modal update-modal">${html}</div>`;
  // Keep taps and keys inside the dialog away from the game behind it.
  for (const ev of ['pointerdown', 'touchstart', 'keydown'])
    el.addEventListener(ev, (e) => e.stopPropagation());
  (document.getElementById('game-wrap') ?? document.body).appendChild(el);
  document.body.classList.add('update-open');
  root = el;
  wire(el);
  el.querySelector<HTMLButtonElement>('button')?.focus();
}

/** The update prompt for a newer deployed build. */
export function showUpdate(info: VersionInfo) {
  open(
    `<p class="overline">نسخة ${esc(info.version)} نزلت</p>
    <h2 id="update-title">فيه تحديث جديد</h2>
    ${notesHtml(releasesSince(APP_VERSION, info.changelog))}
    <div class="modal-actions">
      <button class="primary" data-update="now">حدّث دلوقتي ⟳</button>
      <button class="ghost-btn" data-update="later">بعدين</button>
    </div>`,
    (el) => {
      el.querySelector('[data-update="later"]')!.addEventListener(
        'click',
        () => {
          dismissed = info.build;
          close(false);
        },
      );
      const now = el.querySelector<HTMLButtonElement>('[data-update="now"]')!;
      now.addEventListener('click', () => {
        now.disabled = true;
        now.textContent = 'ثانية واحدة…';
        void applyUpdate();
      });
    },
  );
}

/** What's new, once, after the game was updated. */
export function showWhatsNew(list: Release[]) {
  open(
    `<p class="overline">اتحدّثت لنسخة ${esc(APP_VERSION)}</p>
    <h2 id="update-title">الجديد في التحديث</h2>
    ${notesHtml(list)}
    <div class="modal-actions">
      <button class="primary" data-update="ok">تمام ◀</button>
    </div>`,
    (el) =>
      el
        .querySelector('[data-update="ok"]')!
        .addEventListener('click', () => close()),
  );
}

async function registration() {
  try {
    return (await navigator.serviceWorker?.getRegistration()) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Activate the newest worker (skipWaiting) and reload into the new build. */
export async function applyUpdate() {
  let reloading = false;
  const reload = () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  };
  navigator.serviceWorker?.addEventListener('controllerchange', reload);
  const reg = await registration();
  try {
    await reg?.update();
  } catch {
    /* offline: the reload still fetches the page network-first */
  }
  const next = reg?.waiting ?? reg?.installing;
  if (next) {
    next.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(reload, 4000);
  } else reload();
}

function present(info: VersionInfo) {
  pending = info;
  if (!playing() && !root) {
    pending = null;
    showUpdate(info);
  }
}

/** Ask the server which build is live; prompt when it differs from ours. */
export async function checkForUpdate() {
  if (checking || !navigator.onLine) return;
  checking = true;
  try {
    void (await registration())?.update().catch(() => {});
    const res = await fetch('/version.json', { cache: 'no-store' });
    if (!res.ok) return;
    const info = (await res.json()) as VersionInfo;
    if (info.build && info.build !== __BUILD__ && info.build !== dismissed)
      present(info);
  } catch {
    /* offline or no version file: nothing to say */
  } finally {
    checking = false;
  }
}

export function initUpdates() {
  // What's new, once per version, for players who already had the game.
  try {
    const seen = localStorage.getItem(SEEN);
    const returning =
      seen !== null ||
      localStorage.getItem('hawari-progress') !== null ||
      localStorage.getItem('hawari-best') !== null;
    localStorage.setItem(SEEN, APP_VERSION);
    if (returning && seen !== APP_VERSION) {
      const list = releasesSince(seen).slice(0, seen === null ? 1 : undefined);
      if (list.length) showWhatsNew(list);
    }
  } catch {
    /* storage blocked */
  }
  if (!import.meta.env.PROD) return;
  void checkForUpdate();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate();
  });
  window.addEventListener('online', () => void checkForUpdate());
  // A new worker finished installing while this page is open.
  void registration().then((reg) =>
    reg?.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' || w.state === 'activated')
          void checkForUpdate();
      });
    }),
  );
  // Never interrupt a level: hold the prompt until the player is on a menu.
  const wrap = document.getElementById('game-wrap');
  if (wrap)
    new MutationObserver(() => pending && present(pending)).observe(wrap, {
      attributes: true,
      attributeFilter: ['class'],
    });
}
