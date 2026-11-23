import { nameKey } from './_db.js';
// Only a pre-existing database ID may receive admin. Names/emails from a
// request and uploaded progress never confer privileges. No config = no admin.
export function isAdminPlayer(id) {
  const allowed = process.env.ADMIN_PLAYER_ID;
  return (
    typeof allowed === 'string' &&
    /^[0-9a-f-]{36}$/i.test(allowed) &&
    id === allowed
  );
}
export function isReservedAdminName(name) {
  const reserved = process.env.ADMIN_RESERVED_NAME;
  return !!reserved && nameKey(name) === nameKey(reserved);
}
