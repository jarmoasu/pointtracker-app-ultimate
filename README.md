## PointTracker

PointTracker is a cross-platform (iOS/Android/Web) app for setting up a match, tracking points live, and reviewing game logs and history.

### Key features

- **New game flow**: set teams, colors, and game settings
- **Live scoring**: track points as the match progresses
- **Game log**: record events/points and review them during the game
- **History**: keep a local list of past games and view details

### Tech stack

- **Expo + React Native** (SDK 54)
- **Expo Router** (file-based routing)
- **TypeScript**
- **React Query** (data fetching/caching patterns)
- **AsyncStorage** (local persistence)
- **Lucide** icons

### Getting started (local development)

#### Prerequisites

- **Node.js**
- **Bun** (`bun --version`)

#### Install

```bash
bun install
```

#### Run on device / simulator

```bash
bun run start
```

Then open the app using an Expo-compatible client (or a simulator) and follow the QR / dev server instructions shown in the terminal.

#### Run on web

```bash
bun run start-web
```

For more verbose web debugging:

```bash
bun run start-web-dev
```

### Scripts

- **start**: start the dev server (tunnel enabled)
- **start-web**: start the web dev server (tunnel enabled)
- **start-web-dev**: start web with extra Expo debug logging
- **lint**: run Expo lint

### Project structure (high level)

```
app/
  _layout.tsx            # Root navigation (Stack) + providers
  index.tsx              # Home screen
  game-setup.tsx         # New game setup
  live-scoring.tsx       # Live scoring screen
  goal-details.tsx       # Goal/point details (modal)
  game-log.tsx           # In-game log
  past-game-log.tsx      # Past game log viewer
  game-history.tsx       # History list

assets/images/           # Icons and images
constants/               # Theme/colors/etc.
types/                   # Shared TS types
```

### Notes

- **Data storage**: game history is currently stored **locally** (no backend).
- **Generated origins**: this repo includes tooling from Rork (the scripts use `bunx rork start` under the hood).
