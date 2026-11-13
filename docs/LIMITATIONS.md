# Aether Browser — Known Limitations & Honest Technical Boundaries

Aether Browser is engineered with strict technical honesty. We clearly distinguish between capabilities genuinely controlled by the browser engine and limitations inherent to standard desktop environments.

## 1. Browser Engine Binaries
- Aether uses installed Chromium-compatible runtimes on the host system (Microsoft Edge, Google Chrome, Brave Browser) or custom Chromium binaries specified in settings.
- If no Chromium-compatible browser is present on the host system, Aether will refuse to spawn sessions until a supported engine path is provided.

## 2. Advanced Hardware Fingerprinting
- **Canvas & WebGL Noise**: In standard Chromium builds, canvas and WebGL noise can be introduced through DevTools script injection or extensions. However, deep low-level GPU driver fingerprinting (e.g., specific DirectX shader execution timings) requires a custom-patched Chromium source build (such as Ungoogled Chromium with custom C++ patches) to guarantee 100% mathematical hardware divergence.
- **AudioContext Fingerprinting**: Similar to WebGL, pure software-level noise reduces tracking entropy, but low-level OS audio stack characteristics may still correlate across sessions on the same physical sound card.

## 3. TCP/IP Stack Fingerprinting (OS Signature)
- Running multiple profiles with different OS presets (e.g. simulating macOS on Windows 11) changes the HTTP `User-Agent` and `Sec-CH-UA-Platform` headers, but low-level TCP/IP packet parameters (TTL, TCP window size, SYN packet options) remain those of the underlying host OS unless a virtual network interface (TUN/TAP) with OS packet rewrites is utilized.

## 4. Localhost API Security
- The local REST API binds strictly to `127.0.0.1` and requires an authorization Bearer token.
- Users must treat their API token securely and never run untrusted local scripts that could read configuration files.
