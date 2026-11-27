use std::path::{Path, PathBuf};
use crate::models::{BrowserType, CanvasNoiseMode, FingerprintConfig, OsType, WebRtcPolicy};

/// Computes a deterministic 32-bit seed from an arbitrary profile ID using FNV-1a.
pub fn profile_seed(profile_id: &str) -> u32 {
    let mut hash: u32 = 2166136261;
    for byte in profile_id.as_bytes() {
        hash ^= *byte as u32;
        hash = hash.wrapping_mul(16777619);
    }
    if hash == 0 {
        0xA37E_91B5
    } else {
        hash
    }
}

/// Extracts primary BCP-47 locale tag from an Accept-Language string
/// e.g. "pl-PL,pl;q=0.9,en-US;q=0.8" -> "pl-PL"
pub fn primary_locale(lang_header: &str) -> String {
    let first = lang_header
        .split(',')
        .next()
        .unwrap_or("en-US")
        .split(';')
        .next()
        .unwrap_or("en-US")
        .trim();
    if first.is_empty() {
        "en-US".to_string()
    } else {
        first.to_string()
    }
}

pub fn parse_languages_list(lang_header: &str) -> Vec<String> {
    let mut list: Vec<String> = lang_header
        .split(',')
        .filter_map(|part| {
            let tag = part.split(';').next()?.trim();
            if tag.is_empty() {
                None
            } else {
                Some(tag.to_string())
            }
        })
        .collect();
    if list.is_empty() {
        list.push("en-US".to_string());
        list.push("en".to_string());
    }
    list
}

pub fn extract_chrome_major(user_agent: &str, fallback_ver: &str) -> String {
    if let Some(idx) = user_agent.find("Chrome/") {
        let rest = &user_agent[idx + 7..];
        let major = rest.split('.').next().unwrap_or("133").trim();
        if major.chars().all(|c| c.is_ascii_digit()) && !major.is_empty() {
            return major.to_string();
        }
    }
    let fb = fallback_ver.split('.').next().unwrap_or("133").trim();
    if fb.is_empty() {
        "133".to_string()
    } else {
        fb.to_string()
    }
}

pub fn deterministic_webgl_profile(os_type: &OsType, seed: u32) -> (&'static str, &'static str) {
    match os_type {
        OsType::Macos => {
            const MAC_GPUS: &[(&str, &str)] = &[
                ("Apple Inc.", "Apple M1"),
                ("Apple Inc.", "Apple M1 Pro"),
                ("Apple Inc.", "Apple M2"),
                ("Apple Inc.", "Apple M3"),
                ("Intel Inc.", "Intel(R) Iris(TM) Plus Graphics 655"),
            ];
            MAC_GPUS[(seed as usize) % MAC_GPUS.len()]
        }
        OsType::Linux => {
            const LINUX_GPUS: &[(&str, &str)] = &[
                ("Mesa", "ANGLE (Intel, Mesa Intel(R) UHD Graphics 630 (CFL GT2), OpenGL 4.6)"),
                ("Mesa", "ANGLE (AMD, AMD Radeon RX 6600 (navi23, LLVM 15.0.7), OpenGL 4.6)"),
                ("Mesa", "ANGLE (Intel, Mesa Intel(R) Xe Graphics (TGL GT2), OpenGL 4.6)"),
            ];
            LINUX_GPUS[(seed as usize) % LINUX_GPUS.len()]
        }
        OsType::Windows => {
            const WIN_GPUS: &[(&str, &str)] = &[
                ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)"),
                ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER (0x000021C4) Direct3D11 vs_5_0 ps_5_0, D3D11)"),
                ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)"),
                ("Google Inc. (Intel)", "ANGLE (Intel, Intel(R) UHD Graphics 770 (0x00004680) Direct3D11 vs_5_0 ps_5_0, D3D11)"),
                ("Google Inc. (Intel)", "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)"),
                ("Google Inc. (AMD)", "ANGLE (AMD, AMD Radeon RX 6700 XT (0x000073DF) Direct3D11 vs_5_0 ps_5_0, D3D11)"),
            ];
            WIN_GPUS[(seed as usize) % WIN_GPUS.len()]
        }
    }
}

pub fn generate_spoof_js(profile_id: &str, fp: &FingerprintConfig, proxy_active: bool) -> String {
    let seed = profile_seed(profile_id);
    let langs = parse_languages_list(&fp.language);
    let primary_lang = primary_locale(&fp.language);
    let major = extract_chrome_major(&fp.user_agent, &fp.browser_version);
    let (webgl_vendor, webgl_renderer) = deterministic_webgl_profile(&fp.os_type, seed);

    let nav_platform = match fp.os_type {
        OsType::Windows => "Win32",
        OsType::Macos => "MacIntel",
        OsType::Linux => "Linux x86_64",
    };

    let ua_platform = match fp.os_type {
        OsType::Windows => "Windows",
        OsType::Macos => "macOS",
        OsType::Linux => "Linux",
    };

    let ua_platform_ver = match fp.os_type {
        OsType::Windows => "15.0.0",
        OsType::Macos => "14.7.2",
        OsType::Linux => "6.8.0",
    };

    let ua_arch = match fp.os_type {
        OsType::Macos => "arm",
        _ => "x86",
    };

    let brand_name = match fp.browser_type {
        BrowserType::Edge => "Microsoft Edge",
        BrowserType::Brave => "Brave",
        BrowserType::Chrome => "Google Chrome",
    };

    let canvas_mode = match fp.canvas_noise {
        CanvasNoiseMode::Noise => "noise",
        CanvasNoiseMode::Block => "block",
        CanvasNoiseMode::Off => "off",
    };

    let webrtc_mode = if matches!(fp.webrtc_policy, WebRtcPolicy::Disabled) {
        "disabled"
    } else if proxy_active || matches!(fp.webrtc_policy, WebRtcPolicy::DisableNonProxiedUdp) {
        "scrub_local"
    } else {
        "default"
    };

    let cfg_json = serde_json::json!({
        "seed": seed,
        "userAgent": fp.user_agent,
        "platform": nav_platform,
        "uaPlatform": ua_platform,
        "uaPlatformVer": ua_platform_ver,
        "uaArch": ua_arch,
        "uaMajor": major,
        "uaFullVersion": format!("{}.0.0.0", major),
        "brandName": brand_name,
        "language": primary_lang,
        "languages": langs,
        "hardwareConcurrency": fp.hardware_concurrency,
        "deviceMemory": fp.device_memory_gb,
        "doNotTrack": fp.do_not_track,
        "screenWidth": fp.screen_width,
        "screenHeight": fp.screen_height,
        "dpr": fp.device_pixel_ratio,
        "timezone": fp.timezone,
        "canvasMode": canvas_mode,
        "webglNoise": fp.webgl_noise,
        "webglVendor": webgl_vendor,
        "webglRenderer": webgl_renderer,
        "audioNoise": fp.audio_noise,
        "webrtcMode": webrtc_mode,
        "geolocation": fp.geolocation,
    });

    format!(
        r#"(() => {{
  'use strict';
  if (Object.prototype.hasOwnProperty.call(window, '__aetherShieldApplied')) return;
  try {{
    Object.defineProperty(window, '__aetherShieldApplied', {{
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    }});
  }} catch (_) {{}}

  const CFG = {cfg};

  // Native toString preservation registry
  const nativeFnMap = new WeakMap();
  const origToString = Function.prototype.toString;
  const maskAsNative = (fn, name) => {{
    try {{
      nativeFnMap.set(fn, `function ${{name || fn.name || ''}}() {{ [native code] }}`);
    }} catch (_) {{}}
    return fn;
  }};

  const patchedToString = function toString() {{
    if (nativeFnMap.has(this)) {{
      return nativeFnMap.get(this);
    }}
    return origToString.call(this);
  }};
  nativeFnMap.set(patchedToString, 'function toString() {{ [native code] }}');
  try {{
    Function.prototype.toString = patchedToString;
  }} catch (_) {{}}

  const defGetter = (target, prop, getter) => {{
    if (!target) return;
    try {{
      const fn = maskAsNative(getter, `get ${{prop}}`);
      Object.defineProperty(target, prop, {{
        get: fn,
        enumerable: true,
        configurable: true
      }});
    }} catch (_) {{}}
  }};

  // Deterministic PRNG (Mulberry32)
  const makePrng = (seedInput) => {{
    let a = (seedInput >>> 0) || 1;
    return () => {{
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }};
  }};

  // 1. WebDriver & Automation scrubbing
  try {{
    const navProto = Navigator.prototype;
    defGetter(navProto, 'webdriver', () => false);
    defGetter(navProto, 'userAgent', () => CFG.userAgent);
    defGetter(navProto, 'appVersion', () => CFG.userAgent.replace(/^Mozilla\//, ''));
    defGetter(navProto, 'platform', () => CFG.platform);
    defGetter(navProto, 'language', () => CFG.language);
    defGetter(navProto, 'languages', () => Object.freeze([...CFG.languages]));
    defGetter(navProto, 'hardwareConcurrency', () => CFG.hardwareConcurrency);
    defGetter(navProto, 'deviceMemory', () => CFG.deviceMemory);
    defGetter(navProto, 'doNotTrack', () => (CFG.doNotTrack ? '1' : null));
    defGetter(navProto, 'vendor', () => 'Google Inc.');

    const brands = [
      {{ brand: 'Not(A:Brand', version: '99' }},
      {{ brand: 'Chromium', version: CFG.uaMajor }},
      {{ brand: CFG.brandName, version: CFG.uaMajor }}
    ];
    const fullVersionList = [
      {{ brand: 'Not(A:Brand', version: '99.0.0.0' }},
      {{ brand: 'Chromium', version: CFG.uaFullVersion }},
      {{ brand: CFG.brandName, version: CFG.uaFullVersion }}
    ];
    const uaDataObj = {{
      brands,
      mobile: false,
      platform: CFG.uaPlatform,
      getHighEntropyValues: maskAsNative(async (hints) => {{
        const res = {{ brands, mobile: false, platform: CFG.uaPlatform }};
        if (Array.isArray(hints)) {{
          if (hints.includes('architecture')) res.architecture = CFG.uaArch;
          if (hints.includes('bitness')) res.bitness = '64';
          if (hints.includes('model')) res.model = '';
          if (hints.includes('platformVersion')) res.platformVersion = CFG.uaPlatformVer;
          if (hints.includes('uaFullVersion')) res.uaFullVersion = CFG.uaFullVersion;
          if (hints.includes('fullVersionList')) res.fullVersionList = fullVersionList;
          if (hints.includes('wow64')) res.wow64 = false;
        }}
        return res;
      }}, 'getHighEntropyValues'),
      toJSON: maskAsNative(() => ({{ brands, mobile: false, platform: CFG.uaPlatform }}), 'toJSON')
    }};
    defGetter(navProto, 'userAgentData', () => uaDataObj);
  }} catch (_) {{}}

  // 2. Screen & DevicePixelRatio consistency
  try {{
    const scrProto = Screen.prototype;
    const availH = Math.max(400, CFG.screenHeight - (CFG.uaPlatform === 'Windows' ? 40 : 28));
    defGetter(scrProto, 'width', () => CFG.screenWidth);
    defGetter(scrProto, 'height', () => CFG.screenHeight);
    defGetter(scrProto, 'availWidth', () => CFG.screenWidth);
    defGetter(scrProto, 'availHeight', () => availH);
    defGetter(scrProto, 'availLeft', () => 0);
    defGetter(scrProto, 'availTop', () => (CFG.uaPlatform === 'macOS' ? 28 : 0));
    defGetter(scrProto, 'colorDepth', () => 24);
    defGetter(scrProto, 'pixelDepth', () => 24);
    if (CFG.dpr > 0) {{
      defGetter(window, 'devicePixelRatio', () => CFG.dpr);
    }}
  }} catch (_) {{}}

  // 3. Deterministic Canvas 2D Noise / Block
  if (CFG.canvasMode !== 'off') {{
    try {{
      const shiftCanvasPixels = (ctx, w, h) => {{
        if (!ctx || w <= 0 || h <= 0) return;
        const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        const img = origGetImageData.call(ctx, 0, 0, w, h);
        const data = img.data;
        if (CFG.canvasMode === 'block') {{
          data.fill(0);
          ctx.putImageData(img, 0, 0);
          return;
        }}
        const rand = makePrng(CFG.seed ^ (w * 73856093) ^ (h * 19349663));
        const totalPixels = w * h;
        const samples = Math.min(6, Math.max(1, Math.floor(totalPixels / 16)));
        for (let i = 0; i < samples; i++) {{
          const px = Math.floor(rand() * totalPixels);
          const idx = px * 4;
          const ch = Math.floor(rand() * 3);
          const delta = rand() > 0.5 ? 1 : -1;
          const cur = data[idx + ch];
          data[idx + ch] = cur === 0 ? 1 : cur === 255 ? 254 : cur + delta;
        }}
        ctx.putImageData(img, 0, 0);
      }};

      const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = maskAsNative(function getImageData(sx, sy, sw, sh, settings) {{
        const img = origGetImageData.apply(this, arguments);
        try {{
          if (CFG.canvasMode === 'block') {{
            img.data.fill(0);
          }} else {{
            const rand = makePrng(CFG.seed ^ (img.width * 73856093) ^ (img.height * 19349663));
            const totalPixels = img.width * img.height;
            const samples = Math.min(6, Math.max(1, Math.floor(totalPixels / 16)));
            for (let i = 0; i < samples; i++) {{
              const px = Math.floor(rand() * totalPixels);
              const idx = px * 4;
              const ch = Math.floor(rand() * 3);
              const delta = rand() > 0.5 ? 1 : -1;
              const cur = img.data[idx + ch];
              img.data[idx + ch] = cur === 0 ? 1 : cur === 255 ? 254 : cur + delta;
            }}
          }}
        }} catch (_) {{}}
        return img;
      }}, 'getImageData');

      const cloneWithNoise = (sourceCanvas) => {{
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;
        if (!w || !h) return sourceCanvas;
        const clone = document.createElement('canvas');
        clone.width = w;
        clone.height = h;
        const cctx = clone.getContext('2d');
        if (!cctx) return sourceCanvas;
        cctx.drawImage(sourceCanvas, 0, 0);
        shiftCanvasPixels(cctx, w, h);
        return clone;
      }};

      const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = maskAsNative(function toDataURL() {{
        try {{
          if (this.getContext('2d') && this.width > 0 && this.height > 0) {{
            const c = cloneWithNoise(this);
            return origToDataURL.apply(c, arguments);
          }}
        }} catch (_) {{}}
        return origToDataURL.apply(this, arguments);
      }}, 'toDataURL');

      const origToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = maskAsNative(function toBlob(callback, type, quality) {{
        try {{
          if (this.getContext('2d') && this.width > 0 && this.height > 0) {{
            const c = cloneWithNoise(this);
            return origToBlob.call(c, callback, type, quality);
          }}
        }} catch (_) {{}}
        return origToBlob.apply(this, arguments);
      }}, 'toBlob');
    }} catch (_) {{}}
  }}

  // 4. WebGL Vendor & Renderer Spoofing
  if (CFG.webglNoise) {{
    const patchWebGL = (Proto) => {{
      if (!Proto || !Proto.prototype || !Proto.prototype.getParameter) return;
      const origGetParam = Proto.prototype.getParameter;
      Proto.prototype.getParameter = maskAsNative(function getParameter(pname) {{
        if (pname === 37445) return CFG.webglVendor;
        if (pname === 37446) return CFG.webglRenderer;
        return origGetParam.apply(this, arguments);
      }}, 'getParameter');
    }};
    patchWebGL(window.WebGLRenderingContext);
    patchWebGL(window.WebGL2RenderingContext);
  }}

  // 5. Deterministic AudioContext Noise
  if (CFG.audioNoise) {{
    try {{
      const patchedBuffers = new WeakSet();
      const origGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = maskAsNative(function getChannelData() {{
        const arr = origGetChannelData.apply(this, arguments);
        if (!patchedBuffers.has(arr) && arr && arr.length > 0) {{
          patchedBuffers.add(arr);
          const rand = makePrng(CFG.seed ^ (arr.length * 2654435761));
          const step = Math.max(1, Math.floor(arr.length / 64));
          for (let i = 0; i < arr.length; i += step) {{
            arr[i] += (rand() - 0.5) * 1e-7;
          }}
        }}
        return arr;
      }}, 'getChannelData');

      if (window.AnalyserNode && AnalyserNode.prototype.getFloatFrequencyData) {{
        const origFreq = AnalyserNode.prototype.getFloatFrequencyData;
        AnalyserNode.prototype.getFloatFrequencyData = maskAsNative(function getFloatFrequencyData(arr) {{
          origFreq.apply(this, arguments);
          if (arr && arr.length > 0) {{
            const rand = makePrng(CFG.seed ^ 0x9E3779B9);
            for (let i = 0; i < arr.length; i += Math.max(1, Math.floor(arr.length / 16))) {{
              arr[i] += (rand() - 0.5) * 1e-5;
            }}
          }}
        }}, 'getFloatFrequencyData');
      }}
    }} catch (_) {{}}
  }}

  // 6. WebRTC IP & mDNS Leak Protection
  if (CFG.webrtcMode === 'disabled') {{
    const blockRtc = function RTCPeerConnection() {{
      throw new DOMException('WebRTC is disabled by privacy policy', 'NotAllowedError');
    }};
    try {{
      const safeCtor = maskAsNative(blockRtc, 'RTCPeerConnection');
      Object.defineProperty(window, 'RTCPeerConnection', {{ value: safeCtor, configurable: true }});
      if ('webkitRTCPeerConnection' in window) {{
        Object.defineProperty(window, 'webkitRTCPeerConnection', {{ value: safeCtor, configurable: true }});
      }}
    }} catch (_) {{}}
  }} else if (CFG.webrtcMode === 'scrub_local' && window.RTCPeerConnection) {{
    try {{
      const OrigRTC = window.RTCPeerConnection;
      const isPrivateOrLocalCandidate = (candStr) => {{
        if (!candStr) return false;
        const lower = candStr.toLowerCase();
        if (lower.includes('.local')) return true;
        if (lower.includes('typ host')) return true;
        if (/(?:^|\s)(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.|fe80:|fd)/i.test(candStr)) return true;
        return false;
      }};

      const scrubSdp = (sdp) => {{
        if (typeof sdp !== 'string') return sdp;
        return sdp
          .split(/\r?\n/)
          .filter((line) => !line.startsWith('a=candidate:') || !isPrivateOrLocalCandidate(line))
          .join('\r\n');
      }};

      const WrappedRTC = maskAsNative(function RTCPeerConnection(rtcConfig, mediaConstraints) {{
        const cleanCfg = rtcConfig && typeof rtcConfig === 'object'
          ? {{ ...rtcConfig, iceTransportPolicy: 'relay' }}
          : rtcConfig;
        const pc = new OrigRTC(cleanCfg, mediaConstraints);

        const origAddListener = pc.addEventListener.bind(pc);
        pc.addEventListener = maskAsNative(function addEventListener(type, listener, options) {{
          if (type === 'icecandidate' && typeof listener === 'function') {{
            const wrappedListener = function(ev) {{
              if (ev && ev.candidate && isPrivateOrLocalCandidate(ev.candidate.candidate)) {{
                return;
              }}
              return listener.call(this, ev);
            }};
            return origAddListener(type, wrappedListener, options);
          }}
          return origAddListener(type, listener, options);
        }}, 'addEventListener');

        const iceDesc = Object.getOwnPropertyDescriptor(OrigRTC.prototype, 'onicecandidate');
        let userOnIce = null;
        Object.defineProperty(pc, 'onicecandidate', {{
          get: () => userOnIce,
          set: (fn) => {{
            userOnIce = fn;
            if (iceDesc && typeof iceDesc.set === 'function') {{
              iceDesc.set.call(pc, (ev) => {{
                if (ev && ev.candidate && isPrivateOrLocalCandidate(ev.candidate.candidate)) return;
                if (typeof userOnIce === 'function') userOnIce.call(pc, ev);
              }});
            }}
          }},
          configurable: true
        }});

        const origLocalDesc = Object.getOwnPropertyDescriptor(OrigRTC.prototype, 'localDescription');
        if (origLocalDesc && typeof origLocalDesc.get === 'function') {{
          Object.defineProperty(pc, 'localDescription', {{
            get: () => {{
              const desc = origLocalDesc.get.call(pc);
              return desc && desc.sdp ? {{ type: desc.type, sdp: scrubSdp(desc.sdp) }} : desc;
            }},
            configurable: true
          }});
        }}

        const origCreateOffer = pc.createOffer.bind(pc);
        pc.createOffer = maskAsNative(async function createOffer() {{
          const offer = await origCreateOffer.apply(this, arguments);
          return offer && offer.sdp ? {{ type: offer.type, sdp: scrubSdp(offer.sdp) }} : offer;
        }}, 'createOffer');

        return pc;
      }}, 'RTCPeerConnection');

      WrappedRTC.prototype = OrigRTC.prototype;
      window.RTCPeerConnection = WrappedRTC;
      if ('webkitRTCPeerConnection' in window) {{
        window.webkitRTCPeerConnection = WrappedRTC;
      }}
    }} catch (_) {{}}
  }}

  // 7. Geolocation policy enforcement
  if (CFG.geolocation && CFG.geolocation.mode === 'block' && navigator.geolocation) {{
    try {{
      const errDenied = {{ code: 1, message: 'User denied Geolocation', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }};
      navigator.geolocation.getCurrentPosition = maskAsNative((_, err) => {{
        if (typeof err === 'function') setTimeout(() => err(errDenied), 15);
      }}, 'getCurrentPosition');
      navigator.geolocation.watchPosition = maskAsNative((_, err) => {{
        if (typeof err === 'function') setTimeout(() => err(errDenied), 15);
        return 0;
      }}, 'watchPosition');
    }} catch (_) {{}}
  }} else if (
    CFG.geolocation &&
    CFG.geolocation.mode === 'manual' &&
    typeof CFG.geolocation.latitude === 'number' &&
    typeof CFG.geolocation.longitude === 'number' &&
    navigator.geolocation
  ) {{
    try {{
      const fakePos = () => ({{
        coords: {{
          latitude: CFG.geolocation.latitude,
          longitude: CFG.geolocation.longitude,
          accuracy: CFG.geolocation.accuracy || 45,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null
        }},
        timestamp: Date.now()
      }});
      navigator.geolocation.getCurrentPosition = maskAsNative((ok) => {{
        if (typeof ok === 'function') setTimeout(() => ok(fakePos()), 15);
      }}, 'getCurrentPosition');
      navigator.geolocation.watchPosition = maskAsNative((ok) => {{
        if (typeof ok === 'function') setTimeout(() => ok(fakePos()), 15);
        return 1;
      }}, 'watchPosition');
    }} catch (_) {{}}
  }}
}})();"#,
        cfg = serde_json::to_string(&cfg_json).unwrap_or_else(|_| "{}".to_string())
    )
}

pub async fn create_shield_extension(
    profile_dir: &Path,
    profile_id: &str,
    fp: &FingerprintConfig,
    proxy_active: bool,
) -> Result<PathBuf, String> {
    let ext_dir = profile_dir.join("aether_shield_ext");
    tokio::fs::create_dir_all(&ext_dir)
        .await
        .map_err(|e| format!("Failed to create shield extension directory: {}", e))?;

    let manifest_json = r#"{
  "manifest_version": 3,
  "name": "Aether Fingerprint Shield",
  "version": "1.0.4",
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["spoof.js"],
      "run_at": "document_start",
      "world": "MAIN",
      "all_frames": true
    }
  ]
}"#;

    let spoof_js = generate_spoof_js(profile_id, fp, proxy_active);

    tokio::fs::write(ext_dir.join("manifest.json"), manifest_json)
        .await
        .map_err(|e| format!("Failed to write shield manifest.json: {}", e))?;

    tokio::fs::write(ext_dir.join("spoof.js"), spoof_js)
        .await
        .map_err(|e| format!("Failed to write shield spoof.js: {}", e))?;

    Ok(ext_dir)
}
