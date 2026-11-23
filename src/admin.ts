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
}
