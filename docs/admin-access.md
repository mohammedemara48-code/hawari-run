# Admin access

Disabled by default. No new identity provider, email login, password or database migration.

## Enable only after identifying the owner account

1. Ask the owner for the exact existing player name. Do not assume an email is the player name. Existing names normalize and truncate to 24 characters.
2. With authorized database access, find that exact player's row and verify it is the account the owner means. Read only id and name, not PIN hashes or progress contents.
3. Set `ADMIN_PLAYER_ID` in Vercel Production to the existing UUID. Never derive an ID from a typed name or let an API request set it.
4. Set `ADMIN_RESERVED_NAME` to the normalized owner name to block new public registration if that account is ever absent. This setting reserves a name; it does not grant a role.
5. If the account does not exist, do not enable an unknown or guessed ID. Reserve the name first, then arrange an owner-confirmed provisioning step. Do not use first-come registration for admin.
6. Redeploy only after review and approval. Verify normal name/PIN login, session restore and account switching on production.

Admin is returned only by the authenticated server response for the allowlisted player ID. The existing PIN check, lockout and signed httpOnly session remain mandatory. No admin flag is read from localStorage, a submitted email/name or uploaded progress. Clear it when switching accounts, on failed login or when a server session is rejected.

The map and play action bypass order locks for that session. This does not set unlocked to the last level, mark levels cleared or replace saved progress. Playing and clearing levels still saves ordinary earned progress, just as before.

This is a client-rendered game, not a server-authoritative anti-cheat system. A person modifying the running JavaScript can manipulate local gameplay, as before; that does not grant them the server admin role.

## Verification

- Unit tests: missing configuration, exact ID, reserved name, invalid PIN, forged submitted admin flag.
- UI tests: controlled server responses for normal/admin sessions, forged local flags, normal rejected play command, admin entry to level 30, saved unlocked unchanged.
- These local tests do not replace signing into the owner's real account after configuration. Do not claim live admin verification until that step succeeds.
