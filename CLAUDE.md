# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Current stack vs. AGENTS.md

AGENTS.md and `docs/ARCHITECTURE.md` describe the *intended* future stack (Expo + React Native, EAS, Maven). That migration has **not** happened; only Supabase is in use. The code today is:

- `codigo-fonte/`: React 18 + TypeScript + Vite web UI, state in Zustand, validation with Zod. Supabase provides auth (email + password, required) and the database, and the UI is local-first over a per-user `localStorage` cache (see "Sync" below).
- `supabase/migrations/`: SQL schema with one table per entity, primary key `(user_id, id)`, row level security and soft deletes.
- `desktop/Program.cs`: a single-file C# WinForms host (.NET Framework, compiled with `csc.exe`, not `dotnet`) that embeds the UI in WebView2 and also contains the self-updater.
- `desktop/installer/Syncro.iss`: an Inno Setup installer that packages `dist/windows/`.

Ignore the Expo, Maven and `.puml` instructions unless the user starts that migration. Supabase config comes from `codigo-fonte/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; see `.env.example`). It is baked in at build time. The rules on UI language (European Portuguese), commits and design still apply.

## Commands

UI only (run in `codigo-fonte/`):
```powershell
npm install
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build; this is the only type-check/lint step
```

There is no lint config and no test runner for the UI. The sync mapping is tested by a plain Node script (`node scripts/test-sync.ts`, from the repo root).

Full Windows build (from the repo root; close the running Syncro first or `Syncro.exe` can't be overwritten):
```powershell
.\scripts\build.bat
```
`build.bat` runs four steps: build the UI, copy `index.html`, `assets/`, the WebView2 DLLs and the icons into `dist/windows/`, compile `Syncro.exe` with `csc.exe`, then run `node scripts/test-updater.ts` and `node scripts/test-sync.ts`.

Updater tests only (needs Node ≥ 22.18 for native `.ts` execution, plus a built `dist/windows/Syncro.exe`):
```powershell
node scripts/test-updater.ts
```
These are table-driven cases run against the compiled executable. They also assert that `AppVersion` in `Program.cs` matches `#define AppVersion` in `Syncro.iss`. To run one case, filter the `cases` array locally; there is no CLI filter.

Installer: compile `desktop/installer/Syncro.iss` with Inno Setup's `ISCC.exe`; the output is `releases/SyncroSetup.exe`. It refuses to compile if `dist/windows/Syncro.exe` is missing or its file version differs from `AppVersion`.

## Releasing

The version is defined in two places that must match: `AppVersion` in `desktop/Program.cs` and `#define AppVersion` in `desktop/installer/Syncro.iss`. The updater only accepts stable GitHub Releases on `TAKO-77/SyncroApp`. A release needs a numeric tag (`v2.3.2`) and an asset named exactly `SyncroSetup.exe`. The full checklist is in the README under "Publicar uma versão".

## UI architecture (`codigo-fonte/src`)

- **One local document per user.** In the UI, all user data is a single `AppData` object (`types.ts`), cached as JSON under `syncro-data:<userId>`. `wayne` holds the data saved before accounts existed. It is offered for upload on the first sign-in and then moved to `wayne-migrated`. UI preferences (theme, sidebar auto-open, focus timer) are device-wide `syncro-*` keys in `store/useStore.ts`.
- **All mutations go through `useStore().update(fn)`.** It `structuredClone`s the data, lets `fn` mutate the clone, persists it, pushes the previous state onto a 30-entry undo `history`, and notifies the sync engine. Never mutate `data` directly. Use `hydrate`/`applyRemote` only for data that must *not* be uploaded.
- **`lib/schema.ts` is the single entry point for loading and importing data.** `parseAppData` validates it with Zod (`.passthrough()`, so unknown legacy fields such as `cl` survive) and fills defaults. It also migrates older shapes, for example `lv` → `effort`, guaranteeing the `geral` workspace, and `harmonizeDefaultColor`. When you add a field to `AppData`, add a default here so existing users' data and imported backups keep loading.
- **Navigation** is local state in `App.tsx`. There is no router, and keys `1`–`6` switch sections. Each section is a single component in `features/<area>/`. Shared pieces live in `components/` (`Modal`, `uid`, `todayIso` in `common.tsx`; `CategoryManager` is used by both Agenda (`cats`) and Calendário (`dayCats`)).
- **Domain conventions:**
  - Dates are ISO `YYYY-MM-DD` strings and times are `HH:MM`; helpers are in `lib/dates.ts`.
  - Recurring events expand per day via `lib/recurrence.ts`. Per-occurrence edits live in `PEvent.ex[date]` and completion in `PEvent.done[date]`.
  - Events copy their category's `color`.
  - Task notes (`taskNotes`) are keyed by workspace id, not by task, and are rendered as a small markdown subset by `features/tarefas/NoteContent.tsx`.
- **Styling** is one global `styles.css` with terse class names, and colours are CSS variables on `:root`. Light mode overrides live under `[data-theme=light]` (set on `<html>` from the store). Every new UI element must work in both themes. The shared category colours are in `lib/palette.ts`.

## Auth and sync (`features/auth/`, `store/useAuth.ts`, `lib/sync/`)

- `main.tsx` wraps `App` in `AccountGate`: it shows the sign-in flow (`AuthScreen`), then `startSync(userId)`, and only renders the app once data is loaded. Sign-in uses email + password, and confirmation and password recovery use emailed OTP codes; magic links don't work inside WebView2. OAuth (`features/auth/oauth.ts`, PKCE) is handled differently in each environment:
  - In the browser, it redirects back to the page.
  - In WebView2, providers block embedded sign-in. So the URL opens in the system browser, `Program.cs` listens once on `http://127.0.0.1:47821/auth/callback` (a `TcpListener` with a 5-minute timeout), and posts `{ type: 'syncro:oauth', code }` back for `exchangeCodeForSession`.
  - Buttons only appear for providers enabled in `/auth/v1/settings`.
- `lib/sync/rows.ts` is pure (type-only imports; tested by `node scripts/test-sync.ts`). It maps `AppData` ↔ table rows (`toRows`/`fromRows`), diffs two snapshots into row upserts and soft deletes (`diffRows`), and merges pulled rows (`applyRemote`). Array order is stored as `position`. `taskNotes` live in `workspaces.notes`, and name/photo/sleep live in `profiles`.
- `lib/sync/engine.ts` keeps an outbox per user in `localStorage` (coalesced by `table:id`, flushed ~600 ms after a change). It uploads with `upsert` on `(user_id, id)` and pulls by `updated_at`, with a 2-minute overlap, on start, on focus, when coming back online and every 60 s. Rows with pending local changes are never overwritten by a pull. Constraint errors (`22xxx`/`23xxx`) are dropped into a `syncro-rejected:<userId>` log; everything else is retried with backoff.
- **Adding a field to `AppData`** means changing four places: add a column in a new migration under `supabase/migrations/`, map it in `toRows`/`fromRows`/`FIELDS`, add a default in `lib/schema.ts`, and extend `scripts/test-sync.ts`.

## Desktop host (`desktop/Program.cs`)

- The UI is served from the virtual host `https://planner.local/` mapped to the exe folder. If that folder has no `index.html`, it falls back to `./dist`.
- WebView2 profile/data: `%LOCALAPPDATA%\Planner\WebView2`. The folder is named "Planner" to preserve old data, so don't change it. The updater log is `%LOCALAPPDATA%\Syncro\updates.log`.
- JS ↔ host messaging uses `window.chrome.webview.postMessage` with string messages (`syncro:version`, `syncro:check-for-updates`). The host replies with `{ type: 'syncro:update-status', ... }`; see `features/perfil/Definicoes.tsx`. Feature-detect `window.chrome?.webview` so the UI still runs in a normal browser.
- `NewWindowRequested` is always handled by the host: only `http`/`https` URLs are opened, in the default browser. Links that should leave the app need `target="_blank"`.
