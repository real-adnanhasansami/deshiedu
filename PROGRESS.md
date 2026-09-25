# DeshiEdu — PROGRESS.md

## App Overview
- DeshiEdu is a curated learning platform where users browse three home categories — **Videos/Playlists**, **Courses**, and **Resources** — each made of topic **sections** (e.g. "Web Development") holding an ordered "roadmap" of links pulled from YouTube, Udemy, Coursera, or any other source, plus a separate **Premium Courses** row for admin-published paid content.
- Each roadmap item can be watched in a distraction-free in-app player (no related-video sidebar, no autoplay suggestions) with a notes panel beside it that autosaves to your account.
- Each section also has a resource shelf for linked files (PDF/docs/txt).
- Sign-in is Google-only. **Content is admin-curated**: only the admin account(s) can add roadmap items/resources to a section (any signed-in user can still create the section shell itself); everyone else browses read-only. Admins are matched by a comma-separated email allowlist (currently `dreamcanvasacademy@gmail.com` and `adnansite01@gmail.com`), checked both client-side and in `firestore.rules`.
- Every signed-in user also gets a **Private Space** (`/my-space`) — their own videos/Drive links/topics, now synced in real time via Firestore (`users/{uid}/personalSpace`) so it follows them across devices.
- Videos (including full YouTube playlists, not just single videos) play in-app, remember where you left off, and notes can be downloaded as both `.txt` and a styled PDF. A floating Pomodoro focus timer is available on every page.
- Dark/light theme, an instant + deep catalog search, and a hero landing section for signed-out visitors round out the homepage.
- Tech stack: React (Vite), Firebase (Auth + Firestore, Realtime DB — unused, locked down), Cloudinary (planned, not yet added — free tier only), Vercel.
- Live URL: deshiedu.vercel.app (not yet deployed). Repo link: not yet provided.

## Environment & Setup
Required `.env` variables (keys only — see `.env.example`):
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_ADMIN_EMAILS` — comma-separated list, **must exactly match** the emails hardcoded in `firestore.rules`' `isAdmin()` function. Currently `dreamcanvasacademy@gmail.com,adnansite01@gmail.com`.

Build/run commands:
- `npm install`
- `npm run dev` — local dev server
- `npm run build` — production build for Vercel

### Running locally
1. Unzip the codebase, `cd deshiedu`.
2. `npm install`.
3. Copy `.env.example` to `.env` and fill in the 7 Firebase values plus `VITE_ADMIN_EMAIL`.
4. Optional: `npm run seed` to populate two sample sections (needs a service account key — see `scripts/seed.mjs`'s header comment).
5. `npm run dev` — opens at `http://localhost:5173`.
6. Smoke-test: Google sign-in/out, toggle dark/light mode, search for a section/video/resource, create a section with a starter link, watch a video and confirm notes autosave, edit/delete/pin a section you own, sign in as the admin email and confirm the Admin link appears and `/admin` works, create a paid course as admin and confirm the locked-preview + access-code flow on a second (non-admin) account.

### Deploying to Vercel
1. Push this codebase to a GitHub repo.
2. Vercel dashboard → **New Project → Import** your repo (Vite auto-detected: build `npm run build`, output `dist`).
3. Add all 8 env vars (7 Firebase + `VITE_ADMIN_EMAIL`) under **Environment Variables**.
4. Name the project `deshiedu` for the default `deshiedu.vercel.app` domain.
5. **Firebase Console → Authentication → Settings → Authorized domains** — add your deployed domain, or Google Sign-in will fail there even though it works on `localhost`.
6. Deploy, then repeat the smoke test against the live URL.

Setup issues:
- No internet access in this build environment, so `npm install` hasn't actually been run here. Verification was static: every file's syntax (`tsc --noResolve`), every import against the real exports it points to, every CSS class used in JSX against `styles/index.css`, and `firestore.rules`/`database.rules.json` for balanced braces and valid JSON. All clear as of this update. Still worth a real `npm install && npm run dev` yourself first.

## Architecture
```
deshiedu/
  .env.example              # now includes VITE_ADMIN_EMAIL
  .gitignore
  firestore.rules           # rewritten this update — see Fixed Bugs
  database.rules.json
  package.json / vite.config.js / index.html
  scripts/seed.mjs
  src/
    main.jsx
    App.jsx                 # routes + ThemeProvider/AuthProvider wrapping
    styles/index.css        # full CSS-variable theme rewrite (dark + light)
    context/
      AuthContext.jsx        # Google-only now; also exposes `isAdmin`
      ThemeContext.jsx        # dark/light mode, persisted to localStorage
    utils/
      linkParser.js           # + playlistId extraction, PLAYLIST_ICON — getYoutubeThumbnail() unchanged
      admin.js                 # now ADMIN_EMAILS (plural allowlist), case/whitespace-insensitive, warns if unset
      hash.js
      (privateSpace.js removed — My Space moved to Firestore, see firebase/personalSpace.js)
    firebase/
      config.js
      firestoreApi.js
      firestoreWrites.js      # deleteSection now only touches private/access when isPaid; addSectionItem unchanged
      paidAccess.js
      notes.js
      watchProgress.js
      personalSpace.js         # NEW — subscribeToPersonalSpace (onSnapshot) + add/update/delete, replaces utils/privateSpace.js
    hooks/
      useCatalogSearch.js
    components/
      Auth/
        Navbar.jsx
        ThemeToggle.jsx
        Login.jsx
      Home/
        HeroSection.jsx
      Search/
        SearchBar.jsx           # re-parses item URLs live (self-healing) instead of trusting stored sourceType/videoId
      Focus/
        PomodoroTimer.jsx
      Sections/
        CategoryRow.jsx
        SectionCard.jsx         # delete now passes { isPaid: section.isPaid } through
        SectionModal.jsx        # starter-links step now admin-only (item creation is admin-only everywhere)
        RoadmapItem.jsx         # + thumbnail image, playlist routing/badge, self-healing live re-parse
        AddItemForm.jsx         # admin-only now — renders null for everyone else
      Resources/
        ResourceShelf.jsx
        AddResourceForm.jsx     # admin-only now — renders null for everyone else
      Paid/
        PaidAccessModal.jsx
        PaymentRequestForm.jsx
      Player/
        VideoPlayer.jsx         # + playlistId prop (playerVars.listType/list) for whole-playlist embeds
        NotesPanel.jsx
    pages/
      Home.jsx
      SectionPage.jsx
      PlayerPage.jsx           # detects the "/video/playlist" sentinel route + defensive videoId cleanup
      AdminPage.jsx
      PrivateSpacePage.jsx      # now Firestore-backed (onSnapshot), playlist-aware cards
```

### Firestore data model
```
sections/{sectionId}
  title, description: string
  category: 'video' | 'course' | 'resource'   // which free homepage row it appears in
  order: number                 // display order within its row
  pinned: boolean                // pinned sections float to the top of their row
  thumbnailUrl: string | null    // explicit cover image, or auto-set from the first YouTube link added
  itemCount: number
  createdBy: string              // uid — only this user (or admin) can edit/delete the section
  createdAt: timestamp
  isPaid: boolean
  price: string                  // only meaningful when isPaid, e.g. "৳999"
  previewMediaUrl: string | null // shown in the locked preview before purchase
  previewType: 'image' | 'video'

sections/{sectionId}/private/access   // ONE doc, id "access" — paid sections only
  codeHash: string                     // SHA-256 of the access code, never the plaintext code
  updatedAt: timestamp

sections/{sectionId}/items/{itemId}
  title, url, sourceType, videoId, order, addedBy, addedAt   // unchanged from before

sections/{sectionId}/resources/{resourceId}
  title, fileUrl, fileType, addedBy, addedAt                  // unchanged from before

users/{uid}
  name, email, joined, lastLogin
users/{uid}/notes/{noteId}
  content, updatedAt
users/{uid}/watchProgress/{videoId}
  seconds, updatedAt
users/{uid}/personalSpace/{itemId}
  title, type: 'video'|'drive'|'topic', url, createdAt
```

Why these choices, and what's new this update:
- **Google Sign-In only** — every account arrives with a provider-verified email, which is what lets `firestore.rules` trust `request.auth.token.email` for the admin check without a separate custom-claims setup (custom claims need a Cloud Function to set, which isn't available on the free tier).
- **Access code stored as a hash, in its own subcollection** — not on the public `sections/{id}` doc, which anyone can read. See the honest limitation called out in Open Bugs/Tasks: this deters casual bypass, it does not cryptographically guarantee only paying users see the content, because there's no server-side function available here to check it privately.
- **Pin/reorder are owner-or-admin only**, mirroring the existing item/resource permission model, and for a real reason: a Firestore batch write fails *entirely* if it touches even one document the caller doesn't own, so free-for-all reordering across everyone's cards literally cannot work without either a Cloud Function or giving up atomicity.
- Everything from earlier updates (Firebase Auth replacing plaintext passwords, Firestore as the source of truth over Realtime DB, Cloudinary planned for later, Vercel hosting) still applies.

## Fixed Bugs

### This update (admin-curated content model, YouTube playlist support, My Space moved to Firestore)
- **Root cause of "Could not save this link" for normal/paid users, found and explained.** `addSectionItem` creates the item doc (open to any signed-in user under the old model) and then updates the *section's* `itemCount` — but section updates required being that section's owner or admin. A non-owner adding to someone else's section would have the item silently succeed while the itemCount update threw, surfacing as a generic save failure. Moving content creation to admin-only (below) sidesteps this entirely going forward, since only admins add items now and admins can always update the section.
- **Admin-only content creation.** Per your explicit request, `AddItemForm` and `AddResourceForm` now render **nothing at all** (not even a message) unless `isAdmin` — self-contained checks, so they're safe regardless of which page renders them. `firestore.rules` now requires `isAdmin()` for `create` on `sections/{id}/items` and `.../resources`; `update`/`delete` stay open to whoever originally added something (or the admin), so pre-existing contributions from the old open-contribution model can still be managed by their creator — nothing new can be added except by an admin. **Worth flagging plainly:** this is a real reversal of the app's original "any signed-in user can build a roadmap" design from the very first spec — I implemented it exactly as asked rather than silently deciding for you, but wanted that on the record. One side effect: a regular user's own `+ Create Section` can no longer have starter links added at creation (that step is now hidden for non-admins in `SectionModal`, rather than shown and silently failing) — their own sections stay empty shells unless you want to revisit that.
- **Multiple admin emails supported.** `utils/admin.js` and `firestore.rules`' `isAdmin()` now check a small allowlist (`dreamcanvasacademy@gmail.com`, `adnansite01@gmail.com`) instead of one hardcoded address, comparison is now whitespace/case-insensitive, and a missing `VITE_ADMIN_EMAILS` now logs a loud console warning explaining the likely cause (including the Vite-bakes-env-vars-at-build-time gotcha, which is *the* most common reason "I set the env var but it still doesn't work" — Vercel needs a fresh deploy after adding/changing it, not just the variable saved).
- **`deleteSection` no longer breaks ordinary section deletion.** Real bug: it unconditionally tried to delete the admin-only `private/access` subdoc for *every* section, paid or not. Since Firestore batches are all-or-nothing, that single disallowed operation failed the entire batch for any non-admin deleting their own free section — "Missing or insufficient permissions" on something they fully own. Fixed by only attempting that delete when the section is actually paid.
- **YouTube playlist links now work.** `parseVideoLink` extracts `playlistId` (from `list=` on `/watch`, `/playlist`, or `youtu.be` URLs) alongside `videoId`. A link with both plays as a single video (most common case — a lecture that happens to sit in a playlist); a bare `/playlist?list=...` link plays the *whole* playlist in-app via `/video/playlist?playlistId=...`, handled by `VideoPlayer`'s `playlistId` prop (`playerVars: { listType: 'playlist', list }`). Resume/progress tracking is skipped in playlist mode (a single timestamp doesn't mean much across a whole playlist); notes still work, keyed to the playlist rather than one video.
- **Visual thumbnails added to the roadmap list itself.** `RoadmapItem` (and `PrivateSpacePage`'s cards) now show a small thumbnail image before every item — real YouTube thumbnail when there's a specific video id, a distinct playlist icon for playlist-only links (being honest: YouTube has no key-free API for a *real* playlist cover image, so this is an icon, not a fake thumbnail URL that would just 404), or a generic link icon otherwise.
- **Self-healing against stale stored data.** `RoadmapItem` and `SearchBar` now re-parse `item.url` live via `parseVideoLink` instead of trusting the `sourceType`/`videoId` fields as stored — so any item saved before an earlier `parseVideoLink` bug fix (e.g. a link typed without `https://`, which used to get permanently stored as `sourceType: 'other'`) now plays in-app correctly without needing manual re-editing.
- **My Space moved from `localStorage` to Firestore.** Per your explicit request — this **reverses** the earlier "zero external server storage" requirement from a previous round; flagging that plainly since it was a deliberate constraint before. `firebase/personalSpace.js` uses `onSnapshot` for real-time sync at `users/{uid}/personalSpace`, with the matching owner-only rule added to `firestore.rules`. The old `utils/privateSpace.js` (localStorage) was removed rather than left as dead code.
- **Defensive `videoId` cleanup in `PlayerPage`.** Checked every place a `/video/...` link gets built (`RoadmapItem`, `SearchBar`, `PrivateSpacePage`) and all three already correctly used `?` before the first query param, not `&` — so that specific bug wasn't reproducible in the current code. Added the requested safety net anyway (`rawParam.split('&')[0].split('?')[0]`) since it's a cheap, harmless guard against any future malformed link.

### Previous update (5 new features: Private Space, Pomodoro timer, resume playback, dual note export, live thumbnail extraction)
- **Private User Learning Space.** New `/my-space` page (linked from the navbar for signed-in users) where anyone can add/edit/delete their own custom videos, Drive/file links, and free-text "topics" — stored **only** in `localStorage` (`utils/privateSpace.js`), never touching Firestore or any server, per the "zero external server storage" requirement. Honest trade-off worth knowing: this means the list is tied to one browser/device — it won't follow you if you sign in elsewhere, and clearing site data erases it. Admin-published homepage content is completely separate and unaffected.
- **Floating Pomodoro focus timer.** `PomodoroTimer` is mounted once in `App.jsx` (not per-page), so it persists as you navigate. Presets (15/25/45/60 min), a real countdown, and a three-beep alarm generated with the Web Audio API on completion (no external audio file needed — works offline). After time's up: **Stop** resets to idle, **Continue** switches to counting *up* to track overtime spent still studying.
- **Resume playback from where you left off.** This required rewriting `VideoPlayer` off a plain `<iframe src=...>` onto the real YouTube IFrame Player API, since reading/setting playback position needs it. `firebase/watchProgress.js` stores `{ seconds }` per `(uid, videoId)`; `PlayerPage` fetches it before mounting the player and seeks to it once ready (only if past 5 seconds — not worth resuming a few seconds in), and saves progress periodically while playing (throttled to avoid a write every few seconds) plus immediately on pause. Wired both the resume position and the progress callback through refs internally so a re-render with a new callback identity can't leave the player stuck using a stale one.
- **Dual note export: .txt and a styled PDF.** `NotesPanel` now has both `⬇ .txt` (unchanged) and `⬇ PDF`, the latter using `jsPDF` (added to `package.json`, loaded on demand via dynamic `import()` so it's not in everyone's main bundle) — a dark header band with the video title and export date, then the note content word-wrapped across as many pages as needed.
- **Automatic YouTube thumbnail extraction — made more robust and more visible.** Two real bugs found and fixed here: (1) the "only set a thumbnail if this is literally the section's very first item" condition was checked against a default parameter that `AddItemForm` never actually overrode, meaning in practice every new YouTube item added through the normal UI would silently **overwrite** an existing thumbnail — fixed by having `SectionPage` pass the section's real current `thumbnailUrl` through, and simplifying the check to "only if the section doesn't already have one," regardless of item order. (2) In the process of centralizing this into one shared `getYoutubeThumbnail()` helper (`utils/linkParser.js`), `createSection`'s reference to the old local function name was left stale — caught during this update's verification pass (a plain syntax check wouldn't have caught it; had to actually re-read the file) before it could ship as a runtime crash on section creation. Also added a live thumbnail preview image while pasting a link, both in `AddItemForm` (adding to an existing section) and `SectionModal` (starter links when creating one).

### Previous update (real bug found: video links without "https://" were opening externally instead of playing in-app)
- **Root cause of "clicking a video card opens an external YouTube link instead of the internal player."** `parseVideoLink` called `new URL(rawUrl)` directly — which **throws** on a link typed or pasted without a scheme (e.g. `youtube.com/watch?v=abc` instead of `https://youtube.com/watch?v=abc`). That throw was silently caught and the link fell back to `sourceType: 'other'`, which is exactly what makes `RoadmapItem` render it as an external `<a target="_blank">` instead of an internal `/video/:id` link. Verified this with real test cases run through Node (not just read by eye) — confirmed broken before the fix, confirmed fixed after. Also extended it to handle `/shorts/`, `/embed/`, and `/live/` YouTube URL patterns, and a trailing-slash edge case on `youtu.be` links, none of which were handled before.
- **Route renamed to match your spec.** Added `/video/:videoId` as the primary player route (`RoadmapItem` and `SearchBar` now generate links to it); `/player/:videoId` is kept registered as an alias pointing at the same `PlayerPage`, so nothing that already used the old path breaks.
- **Admin panel: added a direct Pin/Unpin button** to each row's actions in the table — previously pinning only had a control on the homepage card itself, not inside `/admin`, even though "Pin/Unpin" was listed as an admin-panel requirement.
- Also re-verified, file by file: `PlayerPage.jsx` genuinely renders `VideoPlayer` and `NotesPanel` side by side (via `.player-page`'s flex layout in `index.css`); `NotesPanel.jsx` has a full typing area, 1.5s-debounced Firestore autosave, Save Now, Download (.txt), and Clear; `AdminPage.jsx` has working Add (via the same `SectionModal` used everywhere, including its paid-course fields), Edit, Delete, and now Pin/Unpin, across all three categories. None of these were placeholders — every file was already fully written in the previous delivery; the actual defect was the link-parsing bug above, not a missing component.

### Previous update (Google-only auth, theming, homepage restructure, admin & paid courses)
- **Auth simplified to Google-only.** Removed `Signup.jsx` and all email/password code from `AuthContext`; `Login.jsx` is now a single "Continue with Google" screen. `AuthContext` also now exposes `isAdmin` (see `utils/admin.js`) so any component can check it via `useAuth()`.
- **Hero section added.** `HeroSection` renders above the catalog for signed-out visitors only — headline, feature highlights, and a Google sign-in CTA — then the catalog itself is still shown below it (kept "freely browsable" rather than hiding the app behind a hard login wall).
- **Dark/light theme switcher.** `ThemeContext` toggles a `data-theme` attribute on `<html>`, persisted to `localStorage` with a `prefers-color-scheme` default. This meant a full rewrite of `styles/index.css` onto CSS custom properties (`--bg`, `--text`, `--border`, `--accent`, etc.) with a light-mode override block — every hardcoded hex color from earlier updates was converted. Caught and fixed one real scoping bug in the process: `.google-btn`'s styling was nested under `.auth-form`, so it silently had no effect inside `PaidAccessModal` (which doesn't have that wrapper) — de-scoped it to a standalone rule.
- **Functional search bar.** `useCatalogSearch` gives instant results against already-loaded section titles/descriptions, plus a 400ms-debounced deeper search that lazily fetches and caches each section's items/resources (capped at the first 40 sections scanned, to keep one search affordable) and matches on title. `SearchBar` renders grouped results (Sections / Videos & Links / Resources) as a dropdown.
- **Homepage restructured into 3 categories + a Premium row.** Sections now carry a `category` field (`video` / `course` / `resource`) set at creation via `SectionModal`; `Home.jsx` groups and renders them through the new `CategoryRow` component, with paid sections (`isPaid: true`) pulled into their own "🔒 Premium Courses" row below the three free ones, regardless of their `category`. `SectionCard` now shows a thumbnail (explicit cover image, or auto-derived from the first YouTube link's `hqdefault.jpg`), a category icon fallback when there's no thumbnail, and pinned/paid badges.
- **Pin-to-top and drag-and-drop reordering.** Added to `SectionCard`/`CategoryRow`: a pin toggle (📌) and native HTML5 drag-and-drop, both restricted to a section's owner or the admin (rendered only for them) — see the data-model note above on why a shared `order` field can't support free-for-all reordering. **Known limitation:** native HTML5 drag-and-drop doesn't work on touch devices at all (no polyfill added) — reordering is desktop/mouse-only for now; pinning (a tap) works everywhere.
- **Full inline edit/delete extended to sections themselves, and to resources.** This was an open item from the previous update ("section-level editing still has no owner restriction"). `firestore.rules` now restricts `sections/{id}` `update`/`delete` to `createdBy` or the admin (previously *any* signed-in user could edit or delete *any* section — that gap is now closed). `SectionModal` doubles as the edit form (prefilled) when given a `section` prop. `deleteSection` cascades: it batch-deletes all of a section's `items`, `resources`, and the `private/access` doc before deleting the section itself. `ResourceShelf` also gained inline editing (title/URL), matching what `RoadmapItem` already had for roadmap items; both now recognize the admin as a manager too, not just the original contributor.
- **Admin panel.** `/admin` (gated by `isAdmin`, which shows a plain "admin only" message rather than redirecting non-admins) lists every section platform-wide in a table with Edit/Delete, and reuses `SectionModal` for creating new sections — including paid ones, since the "Make this a Paid Course" toggle only renders for the admin.
- **Paid courses with an access-code gate.** A paid section shows a price tag and preview media (image or short video) on its card and in `PaidAccessModal`. The modal takes an access code, hashes it client-side (`sha256Hex`), and compares it against the hash stored at `sections/{id}/private/access` (fetched only if signed in — enforced by the rules, not just the UI). A correct code sets a `localStorage` flag so the section stays unlocked on that device without re-entering the code. "Request Access Code" opens `PaymentRequestForm` (Name, Email, Phone, Selected Course, Payment Mobile Number, Transaction ID, Amount Paid) with two send options: a `mailto:` link pre-filled to `dreamcanvasacademy@gmail.com`, and a `wa.me` link pre-filled to `+8801319233580`. **Neither one sends anything automatically** — both just open the visitor's own email/WhatsApp app with the message ready to send, since there's no backend service here to send mail directly (see Open Bugs/Tasks).
- **`firestore.rules` rewritten** with an `isAdmin()` function (checks `request.auth.token.email` against a hardcoded address, plus `email_verified`), owner-or-admin section rules, and a rule that requires *at least* being signed in to read a paid section's `items`/`resources` (via a `get()` call to check the parent section's `isPaid` flag) — free sections stay open to everyone as before.

### Earlier updates (condensed)
- Replaced Firebase's wide-open test-mode rules with real ones; built the full Auth flow (originally email/password + Google, now Google-only per above); built the Firestore-backed section catalog, section detail page, roadmap items, and resource shelf (replacing static placeholders); added the "Add Link"/"Contribute Resource" forms with live YouTube-link detection; built the distraction-free `VideoPlayer` and Firestore-backed autosaving `NotesPanel`; added owner-only edit/delete for roadmap items and resources; ran a pre-deployment audit that caught and fixed an unnecessary login-gate on the player route and a Firestore `orderBy` footgun (docs missing the sort field were silently excluded from results, not just sorted last — now sorted client-side with a fallback); added user-facing section *creation* from the browser (`+ Create Section`) with a friendlier empty-catalog state.

## Open Bugs / Tasks
- **[HIGH] Confirm both admin emails and republish rules.** `dreamcanvasacademy@gmail.com` and `adnansite01@gmail.com` are now both hardcoded in `firestore.rules`' `isAdmin()` and listed in `.env.example`'s `VITE_ADMIN_EMAILS` — if either is wrong, or if you add a third admin later, both places need updating together.
- **[MEDIUM] Regular users' own sections are now permanently empty.** A side effect of admin-only item/resource creation: `+ Create Section` still works for anyone, but nothing can ever be added to a non-admin's section afterward (not even at creation time). Worth deciding if that's actually wanted, or if a section's own creator should still be able to add to *their own* section (not just admin) — flagged rather than decided for you.
- **[MEDIUM] My Space now needs `firestore.rules` published** (the new `personalSpace` rule) before it'll work at all — same "must manually paste and publish in Firebase Console" step as always.
- **[LOW] Playlist-only links show an icon, not a real thumbnail** — no key-free YouTube API endpoint exists for that; a real playlist cover image would need the YouTube Data API (an API key + quota management), not implemented here.
- **[LOW] Paid-content protection is a UX deterrent, not a cryptographic guarantee; drag-and-drop is desktop-only; "Send Request" opens the visitor's own email/WhatsApp app rather than sending automatically; search's deep matching scans only the first 40 loaded sections; Cloudinary/RTDB decisions still pending** (all carried over, unchanged this round).
- **[LOW] `npm install` still hasn't been run against this codebase in a real environment** — verification here remains static (syntax, imports/exports, CSS coverage, rules validity); this round's biggest real risk is the YouTube `listType: 'playlist'` playerVars behavior, which is worth confirming in an actual browser.

## Next Steps
1. **Confirm both admin emails** in `.env` and `firestore.rules`, then **publish the updated rules** — this revision changes item/resource creation permissions and adds the `personalSpace` rule.
2. Run `npm install && npm run dev` and specifically test: an admin adding a playlist link (both a `/watch?v=...&list=...` link and a bare `/playlist?list=...` link), a non-admin confirming they see no add forms anywhere, and My Space syncing correctly (add an item, refresh, confirm it's still there).
3. Decide on the "can a user add to their own section" question above.
4. Deploy to Vercel, re-run the smoke test live.
5. Add Cloudinary upload flow for the Resource Shelf; revisit the paid-content protection trade-off if real payments are involved.
