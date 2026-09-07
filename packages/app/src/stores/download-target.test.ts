import { describe, expect, it } from "vitest";
import type { HostProfile } from "@/types/host-connection";
import { resolveDaemonDownloadTarget } from "./download-target";

const HOST = {
  serverId: "server-1",
  label: "Test host",
  appearance: {},
  lifecycle: {},
  connections: [
    { id: "direct:one", type: "directTcp", endpoint: "one.example:6767", useTls: true },
    { id: "direct:two", type: "directTcp", endpoint: "two.example:6767", useTls: false },
  ],
  preferredConnectionId: "direct:one",
} as HostProfile;

describe("resolveDaemonDownloadTarget", () => {
  it("uses the active direct connection instead of an unrelated saved endpoint", () => {
    expect(
      resolveDaemonDownloadTarget(HOST, {
        type: "directTcp",
        endpoint: "two.example:6767",
        display: "two.example:6767",
      }),
    ).toMatchObject({ baseUrl: "http://two.example:6767" });
  });

  it("requires WebSocket transfer when the active connection is a relay", () => {
    expect(
      resolveDaemonDownloadTarget(HOST, {
        type: "relay",
        endpoint: "relay.example:443",
        display: "relay",
      }),
    ).toEqual({ baseUrl: null, authHeader: null, authCredentials: null });
  });
});
