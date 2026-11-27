// Session-only server assertion. Never persist or recover this from player
// name, cookie text, localStorage, uploaded progress or an offline fallback.
let admin = false;
export function hasAdminAccess() {
  return admin;
}
export function clearAdminAccess() {
  admin = false;
}
export function acceptServerRole(value: unknown) {
  admin = value === true;
  // Only a hint to ask for the PIN again if the session cookie is lost. It
  // never grants anything: access still needs the live server answer.
  try {
    if (admin) localStorage.setItem(HINT, '1');
  } catch {
    /* ignore */
  }
}
const HINT = 'hawari-admin-hint';
export function hadAdminBefore() {
  try {
    return localStorage.getItem(HINT) === '1';
  } catch {
    return false;
  }
}
export function forgetAdminHint() {
  try {
    localStorage.removeItem(HINT);
  } catch {
    /* ignore */
  }
}
