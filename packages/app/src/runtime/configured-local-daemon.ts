import type { HostProfile } from "@/types/host-connection";
import { normalizeHostPort } from "@/utils/daemon-endpoints";

export function getConfiguredLocalDaemonEndpoint(): string | null {
  const value = process.env.EXPO_PUBLIC_LOCAL_DAEMON?.trim();
  return value && value.length > 0 ? value : null;
}

export function normalizeConfiguredLocalDaemonEndpoint(endpoint: string): string | null {
  try {
    return normalizeHostPort(endpoint);
  } catch {
    return null;
  }
}

export function isConfiguredLocalDaemonPasswordRequired(): boolean {
  return process.env.EXPO_PUBLIC_LOCAL_DAEMON_PASSWORD_REQUIRED?.trim() === "true";
}

export function hasConfiguredLocalDaemonPassword(
  hosts: readonly HostProfile[],
  endpoint: string,
): boolean {
  const normalizedEndpoint = normalizeConfiguredLocalDaemonEndpoint(endpoint);
  if (!normalizedEndpoint) {
    return false;
  }
  return hosts.some((host) => {
    if (!host.password?.trim()) {
      return false;
    }
    return host.connections.some(
      (connection) =>
        connection.type === "directTcp" &&
        normalizeConfiguredLocalDaemonEndpoint(connection.endpoint) === normalizedEndpoint,
    );
  });
}
