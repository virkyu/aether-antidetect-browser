export type ProxyProtocol = 'http' | 'https' | 'socks5';
export type ProxyStatus = 'untested' | 'testing' | 'active' | 'failed';

export interface Proxy {
  id: string;
  title: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
  status: ProxyStatus;
  latencyMs?: number;
  exitIp?: string;
  countryCode?: string;
  countryName?: string;
  lastCheckedAt?: string;
  errorMessage?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProxyInput {
  title?: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
  tags?: string[];
}

export interface ProxyCheckResult {
  proxyId: string;
  status: 'active' | 'failed';
  latencyMs?: number;
  exitIp?: string;
  countryCode?: string;
  countryName?: string;
  errorMessage?: string;
}
