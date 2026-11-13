# Aether Browser — Performance & Resource Optimization

## 1. Rust Backend Optimization
- **Asynchronous Task Management**: Non-blocking I/O using Tokio. Spawning and terminating child processes does not block the UI thread.
- **Lazy Process Spawning**: Chromium processes are never started until explicitly launched by the user.
- **Bounded Resource Usage**: Free TCP ports are discovered dynamically and immediately released for the browser child process.
- **Process Supervision**: Uses `sysinfo` and child process handle tracking with atomic `.lock` files. If Aether exits unexpectedly, orphan locks are safely detected and cleared on subsequent launches.
- **Indexed Database Queries**: SQLite indexes on `is_pinned`, `last_launched_at`, and `created_at` guarantee sub-millisecond query performance even with 10,000+ stored profile records.

## 2. Frontend Optimization
- **Virtualized Tables**: TanStack Table with virtualized scrolling handles thousands of profile rows with minimal DOM footprint.
- **Minimal Rerenders**: Zustand stores split into focused domains (`profileStore`, `proxyStore`, `settingsStore`) prevents unnecessary component tree updates.
- **Tailwind CSS v4**: Zero-runtime CSS with modern `@import "tailwindcss"` and pre-compiled CSS variables ensures instantaneous stylesheet rendering.
- **Asset Size**: The total compiled frontend JavaScript bundle is ~330 KB uncompressed (under 100 KB gzipped).

## 3. Recommended Hardware Guidelines
- **Idle Memory (Aether Dashboard)**: ~60–80 MB RAM.
- **Per Active Chromium Profile**: ~150–250 MB RAM (dependent on opened tabs and web page content).
- **Concurrent Launch Limit**: Configurable in Settings (default: 10 concurrent profiles) to protect system stability on typical 16 GB machines.
