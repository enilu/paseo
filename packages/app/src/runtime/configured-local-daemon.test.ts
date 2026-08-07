import { afterEach, describe, expect, it } from "vitest";
import type { HostProfile } from "@/types/host-connection";
import { defaultHostAppearance } from "@/hosts/appearance";
import {
  getConfiguredLocalDaemonEndpoint,
  hasConfiguredLocalDaemonPassword,
  isConfiguredLocalDaemonPasswordRequired,
  normalizeConfiguredLocalDaemonEndpoint,
} from "./configured-local-daemon";

const originalEndpoint = process.env.EXPO_PUBLIC_LOCAL_DAEMON;
const originalPasswordRequired = process.env.EXPO_PUBLIC_LOCAL_DAEMON_PASSWORD_REQUIRED;

afterEach(() => {
  if (originalEndpoint === undefined) delete process.env.EXPO_PUBLIC_LOCAL_DAEMON;
  else process.env.EXPO_PUBLIC_LOCAL_DAEMON = originalEndpoint;
  if (originalPasswordRequired === undefined) {
    delete process.env.EXPO_PUBLIC_LOCAL_DAEMON_PASSWORD_REQUIRED;
  } else {
    process.env.EXPO_PUBLIC_LOCAL_DAEMON_PASSWORD_REQUIRED = originalPasswordRequired;
  }
});

function createHost(password?: string): HostProfile {
  return {
    serverId: "server-1",
    label: "Development daemon",
    appearance: defaultHostAppearance(),
    lifecycle: {},
    connections: [
      {
        id: "direct:10.101.0.128:6768",
        type: "directTcp",
        endpoint: "10.101.0.128:6768",
        useTls: false,
        ...(password ? { password } : {}),
      },
    ],
    preferredConnectionId: "direct:10.101.0.128:6768",
    createdAt: "2026-08-07T00:00:00.000Z",
    updatedAt: "2026-08-07T00:00:00.000Z",
  };
}

describe("configured local daemon", () => {
  it("reads the configured endpoint without rejecting invalid development values", () => {
    process.env.EXPO_PUBLIC_LOCAL_DAEMON = " 10.101.0.128:6768 ";
    expect(getConfiguredLocalDaemonEndpoint()).toBe("10.101.0.128:6768");
    process.env.EXPO_PUBLIC_LOCAL_DAEMON = "not-an-endpoint";
    expect(getConfiguredLocalDaemonEndpoint()).toBe("not-an-endpoint");
    expect(normalizeConfiguredLocalDaemonEndpoint("not-an-endpoint")).toBeNull();
  });

  it("requires an explicit true flag for the password gate", () => {
    process.env.EXPO_PUBLIC_LOCAL_DAEMON_PASSWORD_REQUIRED = "true";
    expect(isConfiguredLocalDaemonPasswordRequired()).toBe(true);
    process.env.EXPO_PUBLIC_LOCAL_DAEMON_PASSWORD_REQUIRED = "false";
    expect(isConfiguredLocalDaemonPasswordRequired()).toBe(false);
  });

  it("recognizes a saved password for the configured endpoint", () => {
    expect(hasConfiguredLocalDaemonPassword([createHost()], "10.101.0.128:6768")).toBe(false);
    expect(
      hasConfiguredLocalDaemonPassword([createHost("shared-secret")], "10.101.0.128:6768"),
    ).toBe(true);
  });
});
