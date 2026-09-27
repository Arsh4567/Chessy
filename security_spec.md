# Security Specification & Threat Model

## 1. Data Invariants
1. **Identity & Ownership Invariant**: A user can only write to their own path `/users/{userId}/...` where `request.auth.uid == userId`.
2. **Email & PII Isolation Invariant**: Sensitive account information (`email`) is stored strictly in `/users/{userId}/private/account` and can only be read or written by the document owner (`request.auth.uid == userId`). Non-owners are denied read access.
3. **Rating & Delta Integrity**: Ratings must be valid numbers (minimum floor 100, maximum reasonable Elo 3500) and cannot be arbitrary negative numbers or corrupted types.
4. **Leaderboard Integrity**: An entry in `/public_leaderboard/{userId}` must have matching `userId == request.auth.uid`. A user cannot forge or overwrite another user's leaderboard score.
5. **Match Immutability Invariant**: Once a multiplayer match log `/users/{userId}/matches/{matchId}` is created, it cannot be modified or tampered with by the user (`allow update: if false;`).
6. **Volumetric & Anti-Denial of Wallet Invariants**: String sizes must be bounded (display names <= 64 chars, PGN <= 8192 chars, IDs <= 128 chars).

## 2. The "Dirty Dozen" Payloads (All MUST return PERMISSION_DENIED)
1. **Unauthenticated Write**: An unauthenticated user attempts to write to `/users/alice/public/profile`.
2. **Impersonation Attack**: User `bob` attempts to write to `/users/alice/public/profile`.
3. **PII Snoop Attack**: User `bob` attempts to read `/users/alice/private/account`.
4. **Leaderboard Hijack**: User `bob` attempts to write a fake 3000 Elo rating to `/public_leaderboard/alice`.
5. **Ghost Field Poisoning**: User `alice` attempts to write an unauthorized admin field `isAdmin: true` into `/users/alice/public/profile`.
6. **Oversized String Flood**: User `alice` attempts to write a 1MB display name string to exhaust database quotas.
7. **Negative Rating Exploit**: User `alice` attempts to set `multiplayerRating: -9999`.
8. **Tamper Match History**: User `alice` attempts to modify an already-completed match record in `/users/alice/matches/match1`.
9. **Invalid Path Identifier**: Attacker tries to inject path traversal or SQL-like chars `users/../../etc` as an ID.
10. **Unauthenticated Leaderboard Write**: Anonymous non-logged in client attempts to post to `/public_leaderboard/anon`.
11. **Cross-User Match Record Injection**: User `bob` attempts to insert a fake match record into `/users/alice/matches/fake1`.
12. **Blanket Query Scraping**: Malicious user attempts to query the entire `/users/{userId}/private` collection.
