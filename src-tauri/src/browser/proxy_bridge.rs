use std::net::{IpAddr, SocketAddr};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::oneshot;

#[derive(Debug, Clone)]
pub enum UpstreamProxyType {
    Http,
    Socks5,
}

#[derive(Debug, Clone)]
pub struct UpstreamProxyConfig {
    pub kind: UpstreamProxyType,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
}

pub struct ProxyBridgeHandle {
    pub local_port: u16,
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl ProxyBridgeHandle {
    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

impl Drop for ProxyBridgeHandle {
    fn drop(&mut self) {
        self.stop();
    }
}

pub fn encode_base64(input: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(((input.len() + 2) / 3) * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;

        out.push(TABLE[((triple >> 18) & 0x3F) as usize] as char);
        out.push(TABLE[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            out.push(TABLE[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(TABLE[(triple & 0x3F) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

pub async fn start_proxy_bridge(config: UpstreamProxyConfig) -> Result<ProxyBridgeHandle, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to bind local proxy bridge: {}", e))?;
    let local_port = listener
        .local_addr()
        .map_err(|e| format!("Failed to read local proxy bridge port: {}", e))?
        .port();

    let (shutdown_tx, mut shutdown_rx) = oneshot::channel::<()>();

    tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = &mut shutdown_rx => {
                    tracing::debug!("Shutting down local proxy bridge on port {}", local_port);
                    break;
                }
                accept_res = listener.accept() => {
                    match accept_res {
                        Ok((stream, _addr)) => {
                            let cfg = config.clone();
                            tokio::spawn(async move {
                                if let Err(e) = handle_client_connection(stream, cfg).await {
                                    tracing::debug!("Proxy bridge connection closed: {}", e);
                                }
                            });
                        }
                        Err(e) => {
                            tracing::warn!("Proxy bridge accept error on port {}: {}", local_port, e);
                            break;
                        }
                    }
                }
            }
        }
    });

    Ok(ProxyBridgeHandle {
        local_port,
        shutdown_tx: Some(shutdown_tx),
    })
}

#[derive(Debug, PartialEq, Eq)]
pub struct ParsedHttpRequest {
    pub method: String,
    pub target_host: String,
    pub target_port: u16,
    pub is_connect: bool,
    pub header_end_idx: usize,
}

fn find_header_end(buf: &[u8]) -> Option<usize> {
    buf.windows(4)
        .position(|w| w == b"\r\n\r\n")
        .map(|pos| pos + 4)
}

pub fn parse_host_port(raw: &str, default_port: u16) -> Result<(String, u16), String> {
    let trimmed = raw.trim();
    if trimmed.starts_with('[') {
        if let Some(end_bracket) = trimmed.find(']') {
            let host = trimmed[1..end_bracket].to_string();
            let rest = &trimmed[end_bracket + 1..];
            let port = if let Some(p_str) = rest.strip_prefix(':') {
                p_str.parse::<u16>().unwrap_or(default_port)
            } else {
                default_port
            };
            return Ok((host, port));
        }
    }

    if let Some(colon) = trimmed.rfind(':') {
        let potential_host = &trimmed[..colon];
        let potential_port = &trimmed[colon + 1..];
        if let Ok(port) = potential_port.parse::<u16>() {
            return Ok((potential_host.to_string(), port));
        }
    }

    if trimmed.is_empty() {
        return Err("Empty host".to_string());
    }
    Ok((trimmed.to_string(), default_port))
}

pub fn parse_http_proxy_request(header_bytes: &[u8], header_end: usize) -> Result<ParsedHttpRequest, String> {
    let header_str = std::str::from_utf8(&header_bytes[..header_end])
        .map_err(|_| "Non-UTF8 HTTP request header".to_string())?;
    let mut lines = header_str.split("\r\n");
    let request_line = lines.next().ok_or_else(|| "Missing request line".to_string())?;
    let mut parts = request_line.split_whitespace();
    let method = parts.next().ok_or_else(|| "Missing HTTP method")?.to_uppercase();
    let target = parts.next().ok_or_else(|| "Missing HTTP target")?;

    if method == "CONNECT" {
        let (host, port) = parse_host_port(target, 443)?;
        return Ok(ParsedHttpRequest {
            method,
            target_host: host,
            target_port: port,
            is_connect: true,
            header_end_idx: header_end,
        });
    }

    // Plain HTTP proxy request (e.g. GET http://example.com/path HTTP/1.1)
    if let Some(after_scheme) = target
        .strip_prefix("http://")
        .or_else(|| target.strip_prefix("HTTP://"))
    {
        let authority = after_scheme.split('/').next().unwrap_or(after_scheme);
        let (host, port) = parse_host_port(authority, 80)?;
        return Ok(ParsedHttpRequest {
            method,
            target_host: host,
            target_port: port,
            is_connect: false,
            header_end_idx: header_end,
        });
    }

    // Fallback to Host header
    for line in lines {
        if let Some((k, v)) = line.split_once(':') {
            if k.trim().eq_ignore_ascii_case("host") {
                let (host, port) = parse_host_port(v, 80)?;
                return Ok(ParsedHttpRequest {
                    method,
                    target_host: host,
                    target_port: port,
                    is_connect: false,
                    header_end_idx: header_end,
                });
            }
        }
    }

    Err("Could not determine target host from proxy request".to_string())
}

pub fn build_upstream_http_header(
    raw_header: &str,
    auth: Option<(&str, &str)>,
    rewrite_absolute_uri_for_origin: bool,
) -> Vec<u8> {
    let mut lines = raw_header.split("\r\n").collect::<Vec<_>>();
    while lines.last().is_some_and(|l| l.is_empty()) {
        lines.pop();
    }
    if lines.is_empty() {
        return raw_header.as_bytes().to_vec();
    }

    let mut out = String::with_capacity(raw_header.len() + 128);

    // Request line
    let req_line = lines[0];
    if rewrite_absolute_uri_for_origin {
        let parts: Vec<&str> = req_line.splitn(3, ' ').collect();
        if parts.len() == 3 {
            let method = parts[0];
            let target = parts[1];
            let version = parts[2];
            let origin_path = if let Some(after_scheme) = target
                .strip_prefix("http://")
                .or_else(|| target.strip_prefix("HTTP://"))
            {
                if let Some(slash_idx) = after_scheme.find('/') {
                    &after_scheme[slash_idx..]
                } else {
                    "/"
                }
            } else {
                target
            };
            out.push_str(&format!("{} {} {}\r\n", method, origin_path, version));
        } else {
            out.push_str(req_line);
            out.push_str("\r\n");
        }
    } else {
        out.push_str(req_line);
        out.push_str("\r\n");
    }

    for line in &lines[1..] {
        if let Some((key, val)) = line.split_once(':') {
            let k_lower = key.trim().to_ascii_lowercase();
            if k_lower == "proxy-authorization" {
                continue;
            }
            if rewrite_absolute_uri_for_origin && k_lower == "proxy-connection" {
                out.push_str(&format!("Connection: {}\r\n", val.trim()));
                continue;
            }
        }
        out.push_str(line);
        out.push_str("\r\n");
    }

    if let Some((u, p)) = auth {
        let creds = format!("{}:{}", u, p);
        let b64 = encode_base64(creds.as_bytes());
        out.push_str(&format!("Proxy-Authorization: Basic {}\r\n", b64));
    }

    out.push_str("\r\n");
    out.into_bytes()
}

pub fn build_socks5_connect_packet(host: &str, port: u16) -> Result<Vec<u8>, String> {
    let mut pkt = Vec::with_capacity(6 + host.len());
    pkt.extend_from_slice(&[0x05, 0x01, 0x00]); // VER=5, CMD=CONNECT, RSV=0

    if let Ok(ip) = host.parse::<IpAddr>() {
        match ip {
            IpAddr::V4(v4) => {
                pkt.push(0x01);
                pkt.extend_from_slice(&v4.octets());
            }
            IpAddr::V6(v6) => {
                pkt.push(0x04);
                pkt.extend_from_slice(&v6.octets());
            }
        }
    } else {
        let host_bytes = host.as_bytes();
        if host_bytes.len() > 255 {
            return Err("Hostname too long for SOCKS5".to_string());
        }
        // ATYP=0x03 forces remote DNS resolution at the SOCKS5 server (zero local DNS leak)
        pkt.push(0x03);
        pkt.push(host_bytes.len() as u8);
        pkt.extend_from_slice(host_bytes);
    }

    pkt.extend_from_slice(&port.to_be_bytes());
    Ok(pkt)
}

async fn connect_socks5_upstream(
    cfg: &UpstreamProxyConfig,
    target_host: &str,
    target_port: u16,
) -> Result<TcpStream, String> {
    let mut upstream = TcpStream::connect((cfg.host.as_str(), cfg.port))
        .await
        .map_err(|e| format!("SOCKS5 connect to {}:{} failed: {}", cfg.host, cfg.port, e))?;

    let has_auth = cfg
        .username
        .as_ref()
        .is_some_and(|u| !u.is_empty());

    // 1. Greeting
    if has_auth {
        upstream
            .write_all(&[0x05, 0x02, 0x00, 0x02])
            .await
            .map_err(|e| format!("SOCKS5 greeting write error: {}", e))?;
    } else {
        upstream
            .write_all(&[0x05, 0x01, 0x00])
            .await
            .map_err(|e| format!("SOCKS5 greeting write error: {}", e))?;
    }

    let mut method_resp = [0u8; 2];
    upstream
        .read_exact(&mut method_resp)
        .await
        .map_err(|e| format!("SOCKS5 greeting response error: {}", e))?;

    if method_resp[0] != 0x05 {
        return Err("Invalid SOCKS5 server version response".to_string());
    }

    // 2. RFC 1929 Auth if selected
    match method_resp[1] {
        0x00 => {} // No auth required
        0x02 => {
            let user = cfg.username.as_deref().unwrap_or("");
            let pass = cfg.password.as_deref().unwrap_or("");
            let u_bytes = user.as_bytes();
            let p_bytes = pass.as_bytes();
            if u_bytes.len() > 255 || p_bytes.len() > 255 {
                return Err("SOCKS5 credentials exceed 255 bytes".to_string());
            }
            let mut auth_pkt = Vec::with_capacity(3 + u_bytes.len() + p_bytes.len());
            auth_pkt.push(0x01);
            auth_pkt.push(u_bytes.len() as u8);
            auth_pkt.extend_from_slice(u_bytes);
            auth_pkt.push(p_bytes.len() as u8);
            auth_pkt.extend_from_slice(p_bytes);

            upstream
                .write_all(&auth_pkt)
                .await
                .map_err(|e| format!("SOCKS5 auth write error: {}", e))?;

            let mut auth_resp = [0u8; 2];
            upstream
                .read_exact(&mut auth_resp)
                .await
                .map_err(|e| format!("SOCKS5 auth read error: {}", e))?;

            if auth_resp[1] != 0x00 {
                return Err("SOCKS5 authentication rejected by proxy server".to_string());
            }
        }
        0xFF => return Err("SOCKS5 server rejected all authentication methods".to_string()),
        other => return Err(format!("Unsupported SOCKS5 auth method: {}", other)),
    }

    // 3. CONNECT request with remote DNS resolution (ATYP=0x03 for domains)
    let connect_pkt = build_socks5_connect_packet(target_host, target_port)?;
    upstream
        .write_all(&connect_pkt)
        .await
        .map_err(|e| format!("SOCKS5 CONNECT write error: {}", e))?;

    let mut hdr = [0u8; 4];
    upstream
        .read_exact(&mut hdr)
        .await
        .map_err(|e| format!("SOCKS5 CONNECT reply error: {}", e))?;

    if hdr[0] != 0x05 || hdr[1] != 0x00 {
        return Err(format!("SOCKS5 CONNECT failed with reply code {}", hdr[1]));
    }

    match hdr[3] {
        0x01 => {
            let mut tail = [0u8; 6]; // IPv4 (4) + port (2)
            upstream.read_exact(&mut tail).await.map_err(|e| e.to_string())?;
        }
        0x03 => {
            let mut len_buf = [0u8; 1];
            upstream.read_exact(&mut len_buf).await.map_err(|e| e.to_string())?;
            let mut tail = vec![0u8; (len_buf[0] as usize) + 2];
            upstream.read_exact(&mut tail).await.map_err(|e| e.to_string())?;
        }
        0x04 => {
            let mut tail = [0u8; 18]; // IPv6 (16) + port (2)
            upstream.read_exact(&mut tail).await.map_err(|e| e.to_string())?;
        }
        other => return Err(format!("Invalid SOCKS5 reply ATYP: {}", other)),
    }

    Ok(upstream)
}

async fn handle_client_connection(
    mut client: TcpStream,
    cfg: UpstreamProxyConfig,
) -> Result<(), String> {
    let mut buf = Vec::with_capacity(4096);
    let mut tmp = [0u8; 2048];
    let header_end;

    loop {
        let n = client
            .read(&mut tmp)
            .await
            .map_err(|e| format!("Read error from browser: {}", e))?;
        if n == 0 {
            return Err("Browser closed connection before completing HTTP header".to_string());
        }
        buf.extend_from_slice(&tmp[..n]);
        if let Some(end) = find_header_end(&buf) {
            header_end = end;
            break;
        }
        if buf.len() > 65536 {
            return Err("HTTP header too large".to_string());
        }
    }

    let parsed = parse_http_proxy_request(&buf, header_end)?;
    let trailing = &buf[header_end..];

    let mut upstream = match cfg.kind {
        UpstreamProxyType::Socks5 => {
            let mut stream =
                connect_socks5_upstream(&cfg, &parsed.target_host, parsed.target_port).await?;
            if parsed.is_connect {
                client
                    .write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n")
                    .await
                    .map_err(|e| format!("Failed writing 200 Connection Established: {}", e))?;
                if !trailing.is_empty() {
                    stream.write_all(trailing).await.map_err(|e| e.to_string())?;
                }
            } else {
                let raw_hdr = std::str::from_utf8(&buf[..header_end]).unwrap_or("");
                let rewritten = build_upstream_http_header(raw_hdr, None, true);
                stream.write_all(&rewritten).await.map_err(|e| e.to_string())?;
                if !trailing.is_empty() {
                    stream.write_all(trailing).await.map_err(|e| e.to_string())?;
                }
            }
            stream
        }
        UpstreamProxyType::Http => {
            let addr: SocketAddr = format!("{}:{}", cfg.host, cfg.port)
                .parse()
                .ok()
                .unwrap_or_else(|| SocketAddr::from(([127, 0, 0, 1], cfg.port)));
            let mut stream = if cfg.host.parse::<IpAddr>().is_ok() {
                TcpStream::connect(addr).await
            } else {
                TcpStream::connect((cfg.host.as_str(), cfg.port)).await
            }
            .map_err(|e| format!("HTTP proxy connect failed: {}", e))?;

            let auth_pair = cfg
                .username
                .as_deref()
                .filter(|u| !u.is_empty())
                .map(|u| (u, cfg.password.as_deref().unwrap_or("")));

            let raw_hdr = std::str::from_utf8(&buf[..header_end]).unwrap_or("");
            let rewritten = build_upstream_http_header(raw_hdr, auth_pair, false);
            stream.write_all(&rewritten).await.map_err(|e| e.to_string())?;
            if !trailing.is_empty() {
                stream.write_all(trailing).await.map_err(|e| e.to_string())?;
            }
            stream
        }
    };

    let _ = tokio::io::copy_bidirectional(&mut client, &mut upstream).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base64_encode() {
        assert_eq!(encode_base64(b"user:pass"), "dXNlcjpwYXNz");
        assert_eq!(encode_base64(b"foobar"), "Zm9vYmFy");
        assert_eq!(encode_base64(b"a"), "YQ==");
    }

    #[test]
    fn test_parse_http_proxy_requests() {
        let connect_req = b"CONNECT api.ipify.org:443 HTTP/1.1\r\nHost: api.ipify.org:443\r\n\r\n";
        let parsed = parse_http_proxy_request(connect_req, connect_req.len()).unwrap();
        assert!(parsed.is_connect);
        assert_eq!(parsed.target_host, "api.ipify.org");
        assert_eq!(parsed.target_port, 443);

        let get_req = b"GET http://example.com:8080/check HTTP/1.1\r\nHost: example.com:8080\r\nProxy-Authorization: Basic old\r\n\r\n";
        let parsed2 = parse_http_proxy_request(get_req, get_req.len()).unwrap();
        assert!(!parsed2.is_connect);
        assert_eq!(parsed2.target_host, "example.com");
        assert_eq!(parsed2.target_port, 8080);

        let rebuilt = String::from_utf8(build_upstream_http_header(
            std::str::from_utf8(get_req).unwrap(),
            Some(("u", "p")),
            false,
        ))
        .unwrap();
        assert!(rebuilt.contains("Proxy-Authorization: Basic dTpw"));
        assert!(!rebuilt.contains("Basic old"));
    }

    #[test]
    fn test_socks5_domain_packet_forces_remote_dns() {
        let pkt = build_socks5_connect_packet("whoer.net", 443).unwrap();
        assert_eq!(pkt[0], 0x05);
        assert_eq!(pkt[1], 0x01);
        assert_eq!(pkt[3], 0x03); // Domain name (remote DNS)
        assert_eq!(pkt[4], 9);
        assert_eq!(&pkt[5..14], b"whoer.net");
        assert_eq!(&pkt[14..16], &[0x01, 0xBB]);
    }
}
