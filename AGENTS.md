# AI Agent Instructions

## What this app is

A single-page wheel that picks one random teammate per spin. Every active participant has the same
chance, nobody is eliminated. Confirmed winners are stored so the team can review win counts.
There is no backend: participants, spin history and wheel settings live in IndexedDB (Dexie).

## Structure

- `src/app`: entry shell, Mantine provider, language switch.
- `src/pages/wheel`: the only page; composes the wheel board with participants and stats panels.
- `src/domains/wheel`: wheel engine (`BaseWheel`), spin flow (`ui/WheelBoard.tsx`), settings fields, soundtrack.
- `src/domains/participants`: roster of people (repository, query hooks, list UI).
- `src/domains/spin-history`: confirmed spins, statistics computation (`lib/computeStats.ts`) and stats UI.
- `src/shared`: database instance, Mantine component extensions, small hooks and UI pieces.
- `src/utils`, `src/constants`, `src/models`: legacy helpers still used by the wheel engine.

## Rules

- Keep files small and focused; one component per file.
- Prefer arrow functions, descriptive names, boolean names like `isLoading`.
- Use absolute imports via aliases: `@app`, `@pages`, `@domains`, `@shared`, `@utils`, `@constants`, `@models`, `@assets`.
- Use Tailwind utility classes or CSS modules for styling; Mantine for base components.
- All user-visible text goes through i18next. Add keys to `src/assets/i18n/locales/ru.json` and `en.json` together.
- Use Dexie for IndexedDB access through `src/shared/lib/database/db.ts`.
- Avoid barrel `index.ts` files.
- Write unit tests only when asked; place them next to the source file.

## Documentation

- `docs/architecture.md` describes layers, the spin flow, storage schema and the soundtrack module.
- `docs/history.md` records why the project looks the way it does and the decisions taken.
- `docs/theme-authoring.md` is the contract for visual themes (`src/domains/theme/themes/<id>/`).
- Read `docs/` before exploring the code. Whenever you change structure, data flow, storage, conventions or
  tooling, update the matching doc (and README if user-facing behaviour changed) in the same change.
