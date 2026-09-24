# DeshiEdu — PROGRESS.md

## App Overview
- DeshiEdu is a curated learning platform where users browse three home categories — **Videos/Playlists**, **Courses**, and **Resources** — each made of topic **sections** (e.g. "Web Development") holding an ordered "roadmap" of links pulled from YouTube, Udemy, Coursera, or any other source, plus a separate **Premium Courses** row for admin-published paid content.
- Each roadmap item can be watched in a distraction-free in-app player (no related-video sidebar, no autoplay suggestions) with a notes panel beside it that autosaves to your account.
- Each section also has a resource shelf for linked files (PDF/docs/txt).
- Sign-in is Google-only. Any signed-in user can create a section and add links to it; content is meant to be freely browsable without paying for the original course. A single admin account (by email) can manage anything platform-wide and publish paid/access-code-protected courses.
- Every signed-in user also gets a **Private Space** (`/my-space`) — their own videos/Drive links/topics, stored only in that browser's `localStorage` (never sent to any server), separate from the admin-curated public catalog.
- Videos remember where you left off (resume playback) and notes can be downloaded as both `.txt` and a styled PDF. A floating Pomodoro focus timer (with an alarm and overtime tracking) is available on every page.
- Dark/light theme, an instant + deep catalog search, and a hero landing section for signed-out visitors round out the homepage.
- Tech stack: React (Vite), Firebase (Auth + Firestore, Realtime DB — unused, locked down), Cloudinary (planned, not yet added — free tier only), Vercel.
- Live URL: deshiedu.vercel.app (not yet deployed). Repo link: not yet provided.

## Environment & Setup
Required `.env` variables (keys only — see `.env.example`):
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_ADMIN_EMAIL` — **must exactly match** the email hardcoded in `firestore.rules`' `isAdmin()` function. Both currently default to `dreamcanvasacademy@gmail.com` (the address given for paid-course requests) — see the flagged item in Open Bugs/Tasks below if that's not actually meant to be the admin login.

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
      linkParser.js           # + getYoutubeThumbnail() — single source of truth for auto-thumbnails
      admin.js
      hash.js
      privateSpace.js          # NEW — localStorage-only CRUD for Private Space (getPrivateItems/add/update/delete)
    firebase/
      config.js
      firestoreApi.js
      firestoreWrites.js      # addSectionItem's auto-thumbnail logic simplified (no longer tied to "must be the very first item")
      paidAccess.js
      notes.js
      watchProgress.js         # NEW — fetchWatchProgress/saveWatchProgress (users/{uid}/watchProgress/{videoId})
    hooks/
      useCatalogSearch.js
    components/
      Auth/
        Navbar.jsx             # + "My Space" link
        ThemeToggle.jsx
        Login.jsx
      Home/
        HeroSection.jsx
      Search/
        SearchBar.jsx
      Focus/
        PomodoroTimer.jsx       # NEW — floating widget, mounted once in App.jsx so it persists across routes
      Sections/
        CategoryRow.jsx
        SectionCard.jsx
        SectionModal.jsx        # starter-link rows now show a live auto-extracted thumbnail preview
        RoadmapItem.jsx
        AddItemForm.jsx         # + live thumbnail preview, now correctly passes the section's current thumbnail through
      Resources/
        ResourceShelf.jsx
        AddResourceForm.jsx
      Paid/
        PaidAccessModal.jsx
        PaymentRequestForm.jsx
      Player/
        VideoPlayer.jsx         # rewritten on the real YouTube IFrame Player API (was a plain <iframe src>) for resume/progress
        NotesPanel.jsx          # + PDF export (jsPDF, loaded on demand) alongside the existing .txt download
    pages/
      Home.jsx
      SectionPage.jsx
      PlayerPage.jsx           # fetches/saves watch progress, passes video title into NotesPanel for the PDF header
      AdminPage.jsx             # + direct Pin/Unpin action in the table
      PrivateSpacePage.jsx      # NEW — /my-space, add/edit/delete custom videos/Drive links/topics
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
```

Private Space (`/my-space`) is deliberately **not** in Firestore — it's `localStorage` only, under the key `deshiedu-private-space:{uid}`, holding an array of `{ id, title, type: 'video'|'drive'|'topic', url, createdAt }`. Per-device only, by design.

Why these choices, and what's new this update:
- **Google Sign-In only** — every account arrives with a provider-verified email, which is what lets `firestore.rules` trust `request.auth.token.email` for the admin check without a separate custom-claims setup (custom claims need a Cloud Function to set, which isn't available on the free tier).
- **Access code stored as a hash, in its own subcollection** — not on the public `sections/{id}` doc, which anyone can read. See the honest limitation called out in Open Bugs/Tasks: this deters casual bypass, it does not cryptographically guarantee only paying users see the content, because there's no server-side function available here to check it privately.
- **Pin/reorder are owner-or-admin only**, mirroring the existing item/resource permission model, and for a real reason: a Firestore batch write fails *entirely* if it touches even one document the caller doesn't own, so free-for-all reordering across everyone's cards literally cannot work without either a Cloud Function or giving up atomicity.
- Everything from earlier updates (Firebase Auth replacing plaintext passwords, Firestore as the source of truth over Realtime DB, Cloudinary planned for later, Vercel hosting) still applies.

## Fixed Bugs

### This update (5 new features: Private Space, Pomodoro timer, resume playback, dual note export, live thumbnail extraction)
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
- **[MEDIUM] Private Space is genuinely per-device.** By design (per your "zero external server storage" requirement) — but worth being explicit that this means no cross-device sync and no recovery if the browser's storage gets cleared. If that trade-off turns out to be unwanted later, it'd need to move to Firestore under `users/{uid}/privateSpace`, which is a small, contained change if you want it.
- **[LOW] Pomodoro timer doesn't persist across a page refresh.** It's in-memory component state; reloading the page resets it. Adding `localStorage` persistence for the running timer is a small follow-up if that's wanted.
- **[LOW] Resume-playback save frequency is throttled (every ~4+ seconds of change, checked every 8 seconds while playing) rather than continuous**, to avoid excessive Firestore writes — fine for typical use, means the very last few seconds before closing a tab might not be saved if the browser closes abruptly rather than triggering a pause/state-change event first.
- **[HIGH] Confirm the admin email** (carried over) — still defaults to `dreamcanvasacademy@gmail.com` in both `.env.example` and `firestore.rules`.
- **[MEDIUM] Paid-content protection is a UX deterrent, not a cryptographic guarantee** (carried over) — see the previous update's note; unchanged this round.
- **[MEDIUM] Drag-and-drop reordering doesn't work on touch devices** (carried over) — pinning still works everywhere.
- **["Send Request" doesn't send anything itself]** (carried over) — opens the visitor's own email/WhatsApp app.
- **[LOW] Search's deep matching scans only the first 40 loaded sections** (carried over).
- **[LOW] Firestore vs Realtime DB roles still undecided; Cloudinary not started** (carried over).
- **[LOW] `npm install` still hasn't been run against this codebase in a real environment** — this update added a new dependency (`jspdf`) and a browser API dependency (YouTube IFrame API, Web Audio API) that only a real browser run can fully confirm; verification here was static (syntax, imports/exports — including catching two real bugs: a stale function reference and a thumbnail-overwrite bug — plus CSS class coverage and rules file validity).

## Next Steps
1. **Confirm the admin email** in both `.env` and `firestore.rules` before publishing — unchanged ask from last time.
2. Publish the updated `firestore.rules` — this revision adds the `watchProgress` subcollection rule.
3. Run `npm install && npm run dev` and smoke-test everything, with special attention to the 5 new features this round: add/edit/delete in Private Space, start/finish/continue a Pomodoro session, watch part of a video, leave, come back and confirm it resumes, download notes as both .txt and PDF, and paste a fresh YouTube link to confirm the thumbnail preview and auto-extraction both work.
4. Deploy to Vercel, re-run the smoke test live.
5. Decide on the paid-content protection trade-off, and whether Private Space should ever move to Firestore for cross-device sync.
6. Add Cloudinary upload flow for the Resource Shelf.
