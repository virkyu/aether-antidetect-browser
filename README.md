<div align="center">

<img src="src/assets/logo.png" alt="Aether Antidetect Logo" width="130" height="130" />

# AETHER ANTIDETECT

**Next-Generation, Native Multi-Account Antidetect Desktop Browser**

*Engineered with Rust, Tauri 2, React 19 & Tailwind CSS v4 for uncompromising speed, stealth, and total privacy.*

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-24C8DB?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.85+-DEA584?style=for-the-badge&logo=rust&logoColor=black)](https://www.rust-lang.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows_10_|_11-0078D6?style=for-the-badge&logo=windows&logoColor=white)](#)

<br />

### 📥 Download Pre-built Release (Portable)

**No compilation or manual setup required!** Download the standalone portable Windows executable:

[![Download Windows Release](https://img.shields.io/badge/⚡_Download_Aether-Aether--Browser.exe_(Windows_x64)-22c55e?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/virkyu/aether-antiderect-browser/releases/latest)

> 💡 **100% Portable (x64)**: Just download `Aether-Browser.exe` and launch it. Your database, isolated profiles, and preferences are automatically stored locally in `~/.aether`.

[👉 **Browse all releases and changelogs on GitHub**](https://github.com/virkyu/aether-antiderect-browser/releases)

---

[📥 Download](#-download-pre-built-release-portable) • [Overview](#-overview) • [Key Features](#-key-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Shortcuts](#-keyboard-shortcuts)

---

</div>

## ⚡ Overview

**Aether Antidetect** is an ultra-fast, local-first desktop application designed for multi-accounting, marketing operations, privacy auditing, and web automation. Inspired by enterprise solutions like *Dolphin{anty}*, *AdsPower*, and *Multilogin*, Aether strips away cloud surveillance, subscription tiers, and heavy Electron bloat in favor of a lean, native **Rust core** paired with a modern **React 19** interface.

Every profile operates inside a mathematically isolated sandbox with its own runtime parameters, dedicated proxy route, unique hardware fingerprints, and private storage engine.

---

## 🌟 Key Features

### 🛡️ Physical Process Isolation
- **100% Isolated Data Directories**: Each profile spawns its own Chromium instance with an independent `--user-data-dir`.
- **Zero Cross-Contamination**: Separate cookies, IndexedDB, Cache, LocalStorage, History, and Session state.
- **Multi-Engine Support**: Seamless auto-detection and support for **Brave**, **Google Chrome**, and **Microsoft Edge**.

### 🎭 Hardware & Network Fingerprint Masking
- **Smart Fingerprint Randomizer**: Generates mathematically consistent hardware profiles (User-Agent, Canvas Noise, WebGL, AudioContext, CPU cores, RAM).
- **Sticky Resolution & Timezone**: Fingerprint regeneration strictly preserves display metrics and selected timezone to prevent unnatural viewport/geo mismatches.
- **WebRTC Shielding**: Automatic enforcement of `disable_non_proxied_udp` to eliminate public IP leaks over WebRTC.
- **Clean Command Line Switches**: Zero `unsupported-command-line-flag` warning bars or automated test flags.

### 🌐 Unified Proxy Manager
- **Protocols Supported**: SOCKS5, HTTP, HTTPS with optional authentication.
- **Instant Latency & IP Check**: Real-time ping testing and egress IP verification.
- **Format-Agnostic Quick Add**: One-click import via standard syntax `host:port:username:password` or `host:port`.
- **Automatic In-Memory Proxy Auth**: Generates native on-the-fly Chrome extension auth modules without user intervention.

### 🏷️ Intuitive Tagging & Organization
- **Smart Tag Autocomplete**: Instant selection of existing tags across your workspace with one click.
- **Interactive Tag Badges**: Visual colored badges with quick-remove controls.
- **Batch Operations**: Bulk launch, bulk stop, bulk tag, and bulk delete profiles.

### ⚡ Scenario Automation & Multi-Window Sync
- **No-Code Automation Builder**: Construct execution sequences (open URL, click elements, fill forms, delay, capture screenshot).
- **Window Synchronizer**: Mirror mouse and keyboard actions from a master window across child profiles.

### 🎨 Precision Dark Workspace & Satoshi Typography
- **Pure `#0A0A0A` Theme**: High-contrast, OLED-friendly interface designed for long work sessions.
- **Local Satoshi Font Integration**: Embedded typography with full offline font weight support (Light to Black).
- **Metric Cards with 1-Click Filters**: Direct filtering by *Total*, *Active*, *Proxied*, and *Favorite* profiles.
- **Bilingual Interface**: Live hot-switching between **English (EN)** and **Polish (PL)**.
- **Interface Zoom**: Full responsive UI scaling (80% - 150%) built directly into Settings.

---

## 🏛️ Architecture

```
                             ┌──────────────────────────────────────┐
                             │         Aether UI Frontend           │
                             │     React 19 • Tailwind CSS v4       │
                             │    Zustand Store • Satoshi Font      │
                             └──────────────────┬───────────────────┘
                                                │ Tauri v2 IPC
                             ┌──────────────────┴───────────────────┐
                             │          Rust Core Backend           │
                             │  Tokio Async • SQLx SQLite Database  │
                             └──────────┬───────────────────┬───────┘
                                        │                   │
                            ┌───────────▼────────┐  ┌───────▼────────────┐
                            │ Process Supervisor │  │ Proxy Network Hub  │
                            │ Active Session PIDs│  │ Latency & Auth Ext │
                            └───────────┬────────┘  └────────────────────┘
                                        │ Spawns isolated processes
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
      ┌───────────────────────────┐           ┌───────────────────────────┐
      │   Profile #1 (Brave/Edge) │           │   Profile #2 (Chrome)     │
      │ • Custom User-Agent       │           │ • Dedicated SOCKS5 Proxy  │
      │ • Independent Cookies     │           │ • WebRTC Leak Shield      │
      │ • Locked Screen & TZ      │           │ • Canvas / WebGL Noise    │
      └───────────────────────────┘           └───────────────────────────┘
```

---

## 🚀 Getting Started

### ⚡ Option 1: Download Ready Executable (Recommended)

For most users, building from source is not required:

1. Go to [**GitHub Releases**](https://github.com/virkyu/aether-antiderect-browser/releases/latest).
2. Download **`Aether-Browser.exe`**.
3. Run the downloaded executable — the application automatically initializes its local database and profile storage in your home directory (`~/.aether`).

---

### 🛠️ Option 2: Build from Source (For Developers)

#### Prerequisites
Ensure you have the following installed on your system:
- **Windows 10 / 11** (64-bit)
- **Node.js** (v18.0 or newer)
- **Rust Toolchain** (`rustup default stable`)
- Any Chromium browser: **Brave**, **Google Chrome**, or **Microsoft Edge**

#### Installation & Development Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/virkyu/aether-antiderect-browser.git
   cd aether-antiderect-browser
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode (Live Reload + Tauri Backend):**
   ```bash
   npm run tauri dev
   ```

#### Building Production Binary

To compile the standalone Windows executable:

```bash
# 1. Build frontend bundle
npm run build

# 2. Compile optimized release executable
npx tauri build --no-bundle
```

The optimized binary will be created at:
```
src-tauri/target/release/aether-browser.exe
```

---

## 🧪 Test Suite

Run the full Rust automated test suite:

```bash
cd src-tauri
cargo test
```

Verified test coverage includes:
- ✅ Chromium CLI switch synthesis & argument sanitization
- ✅ WebRTC leak policy argument validation
- ✅ Dynamic TCP port allocation without socket conflicts
- ✅ Host browser auto-detection (Edge, Chrome, Brave)
- ✅ Proxy string bulk import parsing

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Surface |
| :--- | :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | Focus Profile Search | Anywhere |
| <kbd>Ctrl</kbd> + <kbd>+</kbd> | Zoom In Interface | Global |
| <kbd>Ctrl</kbd> + <kbd>-</kbd> | Zoom Out Interface | Global |
| <kbd>Ctrl</kbd> + <kbd>0</kbd> | Reset Zoom to 100% | Global |
| <kbd>Escape</kbd> | Close Modal / Cancel | Modals |

---

## 📁 Repository Structure

```text
├── docs/                   # Architecture, performance, and parity documentation
├── public/                 # Static assets & local Satoshi font families (woff2)
├── src/                    # React 19 Frontend
│   ├── assets/             # Brand logo & graphics
│   ├── components/
│   │   ├── layout/         # AppShell, Navigation, ZoomController
│   │   ├── profiles/       # ProfileTable, ProfileModal, BulkCreateModal
│   │   ├── proxies/        # ProxyView, Latency checkers
│   │   ├── settings/       # SettingsView, Diagnostics
│   │   └── ui/             # Reusable shadcn/ui inspired primitives
│   ├── lib/                # Fingerprint generator, i18n dictionaries, utils
│   ├── stores/             # Zustand stores (profiles, proxies, ui, user)
│   └── types/              # TypeScript interfaces & types
└── src-tauri/              # Rust Native Backend
    ├── src/
    │   ├── browser/        # Process supervisor, fingerprint CLI builder
    │   ├── commands/       # Tauri IPC commands
    │   ├── database/       # SQLite schema & SQLx queries
    │   └── models/         # Rust data structures
    └── Cargo.toml          # Rust dependencies & metadata
```

---

## ☕ Vibe Coding Notice

> ⚠️ **Notice:** This application was pretty heavily **vibe-coded** — rapidly designed, iterated, and built through intensive human-in-the-loop agentic AI workflows. It cuts straight to practical antidetect capabilities, physical process isolation, and clean UI aesthetics without enterprise bloat. Expect raw utility and clean vibes.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

Designed and engineered for privacy testing, multi-profile QA, developer sandboxing, and session isolation.
