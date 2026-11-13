# Aether Browser — System Architecture

## 1. High-Level System Architecture

Aether Browser is split into three decoupled tiers:

1. **Presentation Tier (React 19 + TypeScript + Vite + Tailwind CSS v4)**:
   - High-density virtualized data tables via `@tanstack/react-table`.
   - Lightweight modular state management via `zustand`.
   - Design system following Linear / Raycast aesthetic rules (4px spacing scale, semantic tokens, dark-first).
   - Zero business logic in frontend: all commands flow through Tauri IPC (`invoke`).

2. **Core Systems Tier (Rust Stable + Tokio + SQLx + Axum)**:
   - `ProcessManager`: Spawns, tracks, monitors, and terminates isolated Chromium child processes.
   - `ProfileService`: Handles business logic, fingerprint validation, and database operations.
   - `Database`: SQLite with automated schema migrations located at `~/.aether/aether.db`.
   - `ProxyService`: Tests HTTP/HTTPS/SOCKS5 connections and queries public exit node IPs via `reqwest`.

3. **Browser Execution Tier (Chromium Engines: Edge / Chrome / Brave)**:
   - Each profile executes as a separate, distinct OS process.
   - Every profile has its own `--user-data-dir` (`~/.aether/profiles/{id}/data`).
   - Browser processes communicate with Aether via an assigned Chrome DevTools Protocol port (`--remote-debugging-port`).
   - Anti-leak flags enforce isolated proxy routing and prevent WebRTC host IP leaks.

## 2. Directory Layout & Storage

```
~/.aether/
├── aether.db              # SQLite database (profiles, proxies, logs)
└── profiles/
    ├── {profile_id_1}/
    │   ├── .lock          # Process lock holding active PID
    │   └── data/          # Chromium isolated user data dir (cookies, history, storage)
    └── {profile_id_2}/
        ├── .lock
        └── data/
```

## 3. Fingerprint Isolation Boundaries

Aether avoids naive JavaScript injection claims:
- **Engine-Level Isolation**: Screen size, User-Agent, language, and WebRTC network policy are passed directly as Chromium command-line switches (`--window-size`, `--user-agent`, `--lang`, `--webrtc-ip-handling-policy=disable_non_proxied_udp`).
- **Session-Level Emulation**: Device metrics, geolocation, and timezone overrides are configured via Chrome DevTools Protocol domains (`Emulation.setTimezoneOverride`, `Emulation.setGeolocationOverride`).
- **Filesystem Isolation**: Cookies, localStorage, IndexedDB, and browser cache are physically separated by distinct OS directories.
