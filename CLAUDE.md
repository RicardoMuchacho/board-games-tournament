# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint
npm run preview      # Preview production build
```

No test framework is configured.

## Architecture

React 18 + TypeScript app built with Vite for managing board game tournaments. Backend is Supabase (PostgreSQL, Auth, Real-time subscriptions).

**Key layers:**
- **Pages** (`src/pages/`): Route targets using React Router v6. Main flows: Auth → Dashboard → TournamentDetail → TournamentRounds.
- **Components** (`src/components/`): `ui/` contains shadcn/ui primitives (don't edit manually). `tournaments/` and `tournament-detail/` hold domain components.
- **Tournament pairing logic** (`src/lib/tournamentPairing.ts`): Core algorithms for Swiss pairing, table distribution, and pairing history. This is the most complex non-UI code.
- **Supabase integration** (`src/integrations/supabase/`): `client.ts` initializes the client; `types.ts` is auto-generated from Supabase schema — don't edit manually.

**Tournament types:** Swiss, Catan (3-4 player tables), Carcassonne (Swiss variant), Multi-game, Eliminatory (bracket).

**State management:** TanStack React Query for server state, Supabase real-time subscriptions for live updates, local React state for UI. No global state store.

**UI stack:** Tailwind CSS with CSS variables, shadcn/ui (Radix primitives), react-hook-form + Zod for forms, lucide-react icons, sonner toasts.

**Path alias:** `@/*` maps to `src/*`.

**Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

## Key routes

- `/dashboard` — tournament list and management
- `/tournament/:id` — tournament detail with tabs (participants, matches, leaderboard)
- `/tournament/:id/rounds` — round management
- `/check-in/:token` and `/match-results/:token` — public QR-accessed pages for participants
