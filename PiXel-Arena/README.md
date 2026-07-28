# Pixel Arena — EWC Tournament Platform

A Free Fire tournament platform with hardcore security, real-time sync, and localStorage-backed media.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Firebase  │  │ NovaPay  │  │ Static Pages Made     │  │
│  │ Auth      │  │ (app.js) │  │ Dynamic with          │  │
│  │ + Firestore│  │ localStorage│  │ onSnapshot()          │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │   Firebase Backend      │
          │  - Auth                  │
          │  - Firestore            │
          │  - Security Rules       │
          └─────────────────────────┘
```

### Two Data Layers

| Layer | Storage | What It Stores |
|-------|---------|----------------|
| **Firestore** | Firebase Cloud | Auth, user metadata (name, email, mobile), coins, wins, tournament data, rankings |
| **NovaPay** (`app.js`) | `localStorage` | Profile photos (base64), transactions, contacts, gifts, notifications, settings, balance, card data, scheduled payments |

**Rule:** Images and user-generated media (avatars, profile photos) are stored as base64 data-URIs in localStorage. Firestore stores only text metadata.

---

## Security Model ("Fort Knox")

### 1. Firestore Rules (`firestore.rules`)

Rules enforce strict ownership — even with full source code access, no client can read/write another user's data:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return signedIn() && request.auth.uid == uid;
    }

    function isAdmin() {
      return signedIn()
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    // ── Users (profiles) ──
    match /users/{uid} {

      allow create: if isOwner(uid)
        && request.resource.data.keys().hasOnly([
          "name", "email", "mobile", "profilePhoto",
          "createdAt", "role", "coins", "wins", "address"
        ])
        && request.resource.data.role == "player"
        && request.resource.data.coins == 0
        && request.resource.data.wins == 0;

      allow read: if isOwner(uid);

      allow update: if isOwner(uid)
        && request.resource.data.diff(resource.data)
            .affectedKeys()
            .hasOnly([
              "name", "mobile", "profilePhoto", "address"
            ]);

      allow delete: if false;

      match /gifts/{giftId} {
        allow read: if isOwner(uid);
        allow write: if false;
      }

      match /transactions/{txId} {
        allow read: if isOwner(uid);
        allow create: if isOwner(uid)
          && request.resource.data.keys().hasOnly(
               ["name", "avatar", "amount", "type", "note", "createdAt"]
             )
          && request.resource.data.amount is number
          && request.resource.data.amount > 0
          && request.resource.data.type in ["credit", "debit"]
          && request.resource.data.createdAt == request.time;
        allow update, delete: if false;
      }
    }

    match /tournaments/{tournamentId} {
      allow read: if signedIn();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if false;
    }

    match /rankings/{entryId} {
      allow read: if signedIn();
      allow write: if false;
    }

    match /tournamentResults/{resultId} {
      allow read: if signedIn();
      allow write: if false;
    }

    match /tournamentSchedule/{scheduleId} {
      allow read: if signedIn();
      allow write: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Security guarantees:**
- **Ownership:** `isOwner(uid)` ensures `request.auth.uid == uid` — user can only access their own document
- **Field whitelisting:** `create` and `update` only allow specific fields. `role` can never be set to `"admin"` via client
- **Admin role:** `isAdmin()` reads the user's own doc for `role == "admin"` — provably secure since `role` can never change from `"player"` client-side
- **Write-protected collections:** `rankings`, `tournamentResults`, `tournamentSchedule` are `write: if false` — data seeded via Firebase Console or Admin SDK only
- **Catch-all deny:** `match /{document=**} { allow read, write: if false; }` blocks everything not explicitly allowed

### 2. Browser-side Protection (`guard.js`)

- Console overridden with `Object.defineProperty(configurable: false)` — blocks `console.log/warn/error/debug/info` from leaking tokens or user data
- DevTools detection — redirects to login when DevTools are opened
- `eval()` and `Function()` constructor blocked — prevents code injection
- Session data wiped on tab visibility loss
- All sensitive variables wrapped in IIFE closures — inaccessible from global scope

### 3. Auth Hardening (`authGuard.js`)

| Feature | Detail |
|---------|--------|
| **Session-only persistence** | Default — no token survives browser close |
| **Idle timeout** | Auto-logout after 30 minutes of inactivity |
| **Tab visibility lock** | Auto-logout if tab hidden > 60 seconds |
| **Redirect loop protection** | Max 3 redirects in 2 seconds |
| **Token refresh** | `getIdToken(true)` on every page load |

---

## Pages & Their Data Sources

### Dynamic (Firebase Auth + Firestore)

| Page | Data Source | Real-time? | Auth Required |
|------|------------|------------|---------------|
| `home.html` | Firestore `users/{uid}` | ✅ onSnapshot | ✅ requireAuth |
| `wallet.html` | Firestore + NovaPay | ✅ onSnapshot | ✅ requireAuth |
| `stats.html` | Firestore + NovaPay | ✅ onSnapshot | ✅ requireAuth |
| `profile.html` | NovaPay (localStorage) | ✅ novapay:change event | ✅ requireAuth |
| `PLAY.html` | Firestore `tournaments` | ✅ onSnapshot | ✅ requireAuth |
| `RANKINGS.html` | Firestore `rankings` | ✅ onSnapshot | ✅ requireAuth |
| `TOURNAMENTS.html` | Firestore `tournaments/tournamentResults/tournamentSchedule` | ✅ onSnapshot | ✅ requireAuth |
| `NOTI.HTML` | NovaPay notifications | ✅ novapay:change event | ✅ requireAuth |
| `user.html` | NovaPay contacts/gifts | ✅ novapay:change event | ✅ requireAuth |
| `transactions.html` | NovaPay transactions | ✅ novapay:change event | ✅ requireAuth |
| `tung.html` | NovaPay state | ✅ novapay:change event | ✅ requireAuth |

### Static / Auth Pages

| Page | Purpose | Auth Required |
|------|---------|---------------|
| `index.html` | Splash/loading screen | No |
| `login.html` | Sign in / Sign up with Remember Me | `requireNoAuth` |
| `forgot.html` | Password reset via `sendPasswordResetEmail` | No |
| `LEGAL.HTML` | Terms & Privacy Policy | No |

### Unlinked / Orphaned Pages (not in navigation)

| Page | Notes |
|------|-------|
| `1st.html` | Legacy, uses old Firebase compat SDK, not linked |
| `assets/editprofile.html` | Will be moved to root and linked from profile.html |
| `assets/play.html` | Duplicate of PLAY.html — can be removed |
| `assets/rankings.html` | Duplicate of RANKINGS.html — can be removed |
| `assets/HOMERESULTS.html` | Duplicate of TOURNAMENTS.html results section — can be removed |

---

## To-Do Checklist

### Phase 1: Security Hardening
- [ ] Create `guard.js` — console suppression, DevTools detection, eval/Fn blocking, session wipe
- [ ] Add CSP meta tags to all pages missing them (PLAY.html, RANKINGS.html, TOURNAMENTS.html, forgot.html, 1st.html)
- [ ] Deploy updated `firestore.rules` with `address`, `isAdmin()`, new collections
- [ ] Verify `authGuard.js` blocks unauthenticated access on all protected pages

### Phase 2: Auth Improvements
- [ ] **Login page:** Add "Remember Me" checkbox — uses `browserLocalPersistence` when checked, `browserSessionPersistence` when unchecked
- [ ] **Forgot Password:** Rewrite `forgot.html` to call Firebase `sendPasswordResetEmail()` instead of mock validation
- [ ] **authGuard.js:** Make persistence check the Remember Me flag before applying

### Phase 3: Static → Dynamic Pages
- [ ] **PLAY.html:** Remove 90+ hardcoded match entries; add Firestore `onSnapshot` listener to `tournaments` collection; add `requireAuth()` + progress overlay + bottom nav
- [ ] **RANKINGS.html:** Remove hardcoded leaderboard; add Firestore `onSnapshot` to `rankings` collection; add `requireAuth()` + progress overlay + bottom nav
- [ ] **TOURNAMENTS.html:** Remove hardcoded data; add Firestore listeners to `tournamentResults` + `tournamentSchedule`; add `requireAuth()` + progress overlay + bottom nav
- [ ] Seed tournament/ranking/result data in Firebase Console

### Phase 4: Edit Profile Page
- [ ] Rewrite `assets/editprofile.html` → root `editprofile.html`
- [ ] Match EWC dark/lime theme (matching `profile.html`)
- [ ] Use shared `firebase.js` imports + `requireAuth()` + progress overlay
- [ ] Save text fields to Firestore `users/{uid}` (`name`, `mobile`, `address`)
- [ ] Save avatar to localStorage via `NovaPay.setProfile({ avatar: dataUrl })`
- [ ] Change password via Firebase `updatePassword` with reauthentication
- [ ] Add 5-tab bottom nav matching app
- [ ] Link from `profile.html` ("Registered Address" row → `editprofile.html`)

### Phase 5: NovaPay → Firestore Sync
- [ ] On login: load Firestore user data → sync into NovaPay state
- [ ] On profile edit: save to both Firestore and NovaPay
- [ ] Real-time listener on `users/{uid}` updates NovaPay state when admin modifies balance

### Phase 6: Real-time Listeners Audit
- [ ] Convert all remaining `getDoc` calls to `onSnapshot`:
  - [ ] `home.html` — user doc
  - [ ] `wallet.html` — user coins/balance
  - [ ] `stats.html` — user stats
  - [ ] `PLAY.html` — tournaments
  - [ ] `RANKINGS.html` — rankings
  - [ ] `TOURNAMENTS.html` — results + schedule

### Phase 7: Cleanup
- [ ] Remove `assets/play.html`, `assets/rankings.html`, `assets/HOMERESULTS.html`
- [ ] Remove `1st.html` (legacy Firebase compat)
- [ ] Confirm all nav links point to correct pages

---

## Firebase Setup (For Admin)

### Seed Tournament Data
Go to Firebase Console → Firestore → and add documents to collections:

**`tournaments/{id}`:**
```json
{
  "id": "tour_1",
  "title": "SOLO BR BATTLE #76115",
  "type": "Solo",
  "desc": "GUN ATTRIBUTES OFF • ₹20 ON BOOYAH",
  "timeDisp": "08:00 AM",
  "fee": 6,
  "kill": 4,
  "booyah": "₹20 ON BOOYAH",
  "date": "2026-07-28",
  "maxPlayers": 100,
  "prize": 2000,
  "status": "open"
}
```

**`rankings/{entryId}`:**
```json
{
  "rank": 1,
  "playerName": "XOSZ",
  "score": 9850,
  "avatar": "https://ui-avatars.com/api/?name=XOSZ",
  "wins": 2,
  "tournaments": 8
}
```

**`tournamentResults/{resultId}`:**
```json
{
  "position": 1,
  "playerName": "XOSZ",
  "medals": 2,
  "winnings": 50000,
  "club": "Team Alpha",
  "badge": "gold"
}
```

**`tournamentSchedule/{scheduleId}`:**
```json
{
  "date": "Jul 28",
  "time": "08:00 AM",
  "title": "SOLO BR BATTLE",
  "type": "Solo",
  "fee": 6,
  "prize": "₹2,000"
}
```

---

## Local Development

```bash
# Serve locally (required for Firebase Auth redirects)
npx serve .
# or
python3 -m http.server 8080
```

All pages use ES modules (`type="module"`) and Firebase v10.14.1 CDN imports. The `file://` protocol won't work for social logins — use a local HTTP server.

---

## File Map

```
/ (root)
├── index.html           # Splash / loading screen
├── login.html           # Sign in / up with Remember Me
├── forgot.html          # Password reset (Firebase sendPasswordResetEmail)
├── home.html            # Dashboard (dynamic, onSnapshot)
├── wallet.html          # Wallet & balance (dynamic)
├── stats.html           # Analytics (dynamic)
├── profile.html         # Settings (NovaPay)
├── editprofile.html     # Edit profile (Firestore + localStorage)
├── PLAY.html            # Tournament matches (dynamic, onSnapshot)
├── RANKINGS.html        # Leaderboard (dynamic, onSnapshot)
├── TOURNAMENTS.html     # Tournament results & schedule (dynamic)
├── NOTI.HTML            # Notifications (NovaPay)
├── user.html            # Social / contacts (NovaPay)
├── transactions.html    # Transaction history (NovaPay)
├── LEGAL.HTML           # Terms & Privacy
├── tung.html            # Tournament hub (NovaPay)
│
├── firebase.js          # Firebase init (shared import)
├── authGuard.js         # Auth guard, session management
├── guard.js             # Console suppression, security
├── app.js               # NovaPay (localStorage state layer)
├── pay-sheet.js         # Payment flow UI
├── haptics.js           # Haptic feedback
├── theme.css            # Shared theme (glass, skeleton, nav)
├── firestore.rules      # Firestore security rules
│
├── assets/
│   ├── editprofile.html # → will move to root
│   ├── play.html        # Duplicate — remove
│   ├── rankings.html    # Duplicate — remove
│   ├── HOMERESULTS.html # Duplicate — remove
│   └── *.svg, *.jpg     # Images / icons
│
└── README.md
```

---

## Status

🚧 Actively under development — see To-Do Checklist above for progress.
