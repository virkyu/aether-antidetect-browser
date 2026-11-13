import type { ProxyProtocol } from '../types/proxy';

export interface ParsedProxy {
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
}

/**
 * Parses proxy strings in multiple standard antidetect formats:
 * - host:port:login:password (most common)
 * - host:port
 * - protocol://login:password@host:port
 * - protocol://host:port:login:password
 * - login:password@host:port
 */
export function parseProxyString(raw: string, defaultProtocol: ProxyProtocol = 'http'): ParsedProxy | null {
  const clean = raw.trim();
  if (!clean) return null;

  let protocol: ProxyProtocol = defaultProtocol;
  let rest = clean;

  if (rest.startsWith('socks5://')) {
    protocol = 'socks5';
    rest = rest.slice(9);
  } else if (rest.startsWith('https://')) {
    protocol = 'https';
    rest = rest.slice(8);
  } else if (rest.startsWith('http://')) {
    protocol = 'http';
    rest = rest.slice(7);
  }

  // Format: login:password@host:port
  if (rest.includes('@')) {
    const atIndex = rest.indexOf('@');
    const authPart = rest.slice(0, atIndex);
    const hostPart = rest.slice(atIndex + 1);

    const authColons = authPart.indexOf(':');
    const username = authColons !== -1 ? authPart.slice(0, authColons) : authPart;
    const password = authColons !== -1 ? authPart.slice(authColons + 1) : undefined;

    const hostColons = hostPart.indexOf(':');
    const host = hostColons !== -1 ? hostPart.slice(0, hostColons).trim() : hostPart.trim();
    const portStr = hostColons !== -1 ? hostPart.slice(hostColons + 1).trim() : '8080';
    const port = parseInt(portStr, 10);

    if (host && !isNaN(port)) {
      return {
        protocol,
        host,
        port,
        username: username || undefined,
        password: password || undefined,
      };
    }
  }

  // Format: host:port:login:password or host:port
  const parts = rest.split(':');
  if (parts.length >= 2) {
    const host = parts[0].trim();
    const port = parseInt(parts[1].trim(), 10);
    if (!host || isNaN(port)) return null;

    const username = parts.length >= 4 ? parts[2].trim() : undefined;
    const password = parts.length >= 4 ? parts.slice(3).join(':').trim() : undefined;

    return {
      protocol,
      host,
      port,
      username: username || undefined,
      password: password || undefined,
    };
  }

  return null;
}
