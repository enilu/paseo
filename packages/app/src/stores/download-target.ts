import type { ActiveConnection } from "@/runtime/host-runtime";
import type { DirectTcpHostConnection, HostProfile } from "@/types/host-connection";
import { buildDaemonWebSocketUrl } from "@/utils/daemon-endpoints";

export interface DownloadTarget {
  baseUrl: string | null;
  authHeader: string | null;
  authCredentials: { username: string; password: string } | null;
}

const UNAVAILABLE_DOWNLOAD_TARGET: DownloadTarget = {
  baseUrl: null,
  authHeader: null,
  authCredentials: null,
};

export function resolveDaemonDownloadTarget(
  daemon: HostProfile | undefined,
  activeConnection: ActiveConnection | null,
): DownloadTarget {
  if (activeConnection?.type !== "directTcp") {
    return UNAVAILABLE_DOWNLOAD_TARGET;
  }
  const connection = daemon?.connections.find(
    (candidate): candidate is DirectTcpHostConnection =>
      candidate.type === "directTcp" && candidate.endpoint === activeConnection.endpoint,
  );
  if (!connection) {
    return UNAVAILABLE_DOWNLOAD_TARGET;
  }

  let parsed: URL;
  try {
    parsed = new URL(
      buildDaemonWebSocketUrl(connection.endpoint, { useTls: connection.useTls ?? false }),
    );
  } catch {
    return UNAVAILABLE_DOWNLOAD_TARGET;
  }

  if (parsed.protocol === "ws:") {
    parsed.protocol = "http:";
  } else if (parsed.protocol === "wss:") {
    parsed.protocol = "https:";
  }

  let authCredentials: { username: string; password: string } | null = null;
  if (parsed.username || parsed.password) {
    authCredentials = {
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    };
    parsed.username = "";
    parsed.password = "";
  }

  parsed.pathname = parsed.pathname.replace(/\/ws\/?$/, "/");

  const baseUrl = parsed.origin;
  const authHeader = authCredentials
    ? `Basic ${btoa(`${authCredentials.username}:${authCredentials.password}`)}`
    : null;

  return { baseUrl, authHeader, authCredentials };
}
