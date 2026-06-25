# Upsi – Ultimate Point Streamer

Cross-platform iOS/Android/Web app for setting up a match, tracking points live, and streaming live scores to an OBS overlay.

---

## Features

- **Game setup:** team names, player rosters (manual or CSV import), backend stream configuration
- **Live scoring:** game clock, +1 scoring per team, goal details (scorer/assist), timeouts, halftime
- **Live sync:** posts goals and state to [pointtracker-service-ultimate](https://github.com/jarmoasu/pointtracker-service-ultimate) for OBS overlay use
- **Game log:** chronological event log with edit/delete, visible during and after the game
- **History:** local list of past games with stats

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo (SDK 54) + React Native 0.81 |
| Routing | Expo Router (file-based) |
| Language | TypeScript |
| State | Zustand |
| Storage | AsyncStorage (local, no account required) |
| HTTP | Native `fetch()` |
| Icons | Lucide React Native |

---

## Getting started

### Prerequisites

- **Node.js** ≥ 20
- **npm** or **bun**
- **Expo Go** app on your device (for quick testing), or a simulator/emulator

### Install

```bash
npm install
# or
bun install
```

### Run

```bash
# iOS / Android (via Expo Go or simulator)
npm run start

# With tunnel (useful for physical devices on different networks)
npm run start-tunnel

# Web
npm run start-web
```

Scan the QR code with Expo Go, or press `i` / `a` to open in a simulator.

---

## Backend (live scoring sync)

The app can optionally sync live scores to [pointtracker-service-ultimate](https://github.com/jarmoasu/pointtracker-service-ultimate), a self-hosted backend that serves an OBS Browser Source overlay.

To connect:
1. Deploy the backend (see its README — one-click Render blueprint included)
2. In the app's **Game Setup** screen, enter your backend URL and claim code
3. The app will obtain a write token and sync goals automatically

The app works fully offline without a backend — sync is optional and fire-and-forget.

---

## Project structure

```
app/
  _layout.tsx          # Root navigation (Stack) + providers
  index.tsx            # Home screen / game list
  game-setup.tsx       # New game setup (teams, roster, backend config)
  live-scoring.tsx     # Live scoring screen
  goal-details.tsx     # Scorer/assist modal
  game-log.tsx         # In-game event log
  past-game-log.tsx    # Past game log viewer
  game-history.tsx     # All past games list

assets/images/         # App icons and images
constants/             # Theme colours
types/                 # Shared TypeScript types
context/               # React context (game setup state)
```

---

## Building for distribution

Builds are handled by [EAS](https://expo.dev/eas):

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to your Expo account
eas login

# Build for iOS (requires Apple Developer account)
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production
```

Update `eas.json` and the bundle identifiers in `app.json` (`ios.bundleIdentifier`, `android.package`) to match your own app/account before building.

---

## Scripts

| Script | Description |
|---|---|
| `npm run start` | Start Expo dev server (LAN) |
| `npm run start-tunnel` | Start with tunnel (useful for physical devices) |
| `npm run start-web` | Start web dev server |
| `npm run start-web-dev` | Web dev server with verbose Expo debug logging |
| `npm run lint` | Run Expo ESLint |

---

## License

MIT — see [LICENSE](LICENSE).
