import { describe, expect, it } from "vitest";
import { EncryptedAgentShareSchema, openAgentShare } from "@getpaseo/protocol/agent-share";
import type { FetchAgentTimelinePayload } from "@getpaseo/client/internal/daemon-client";
import { createAgentShare } from "./create";

function timeline(): FetchAgentTimelinePayload {
  return {
    requestId: "request-1",
    agentId: "agent-1",
    agent: {
      id: "agent-1",
      provider: "codex",
      cwd: "/workspace",
      model: null,
      createdAt: "2026-08-25T06:00:00.000Z",
      updatedAt: "2026-08-25T06:30:00.000Z",
      lastUserMessageAt: "2026-08-25T06:29:00.000Z",
      status: "closed",
      capabilities: {
        supportsStreaming: true,
        supportsSessionPersistence: true,
        supportsDynamicModes: false,
        supportsMcpServers: true,
        supportsReasoningStream: true,
        supportsToolInvocations: true,
      },
      currentModeId: null,
      availableModes: [],
      pendingPermissions: [],
      persistence: null,
      title: "Review auth flow",
      labels: {},
    },
    direction: "tail",
    projection: "projected",
    epoch: "epoch-1",
    reset: false,
    staleCursor: false,
    gap: false,
    window: { minSeq: 1, maxSeq: 1, nextSeq: 2 },
    startCursor: { epoch: "epoch-1", seq: 1 },
    endCursor: { epoch: "epoch-1", seq: 1 },
    hasOlder: false,
    hasNewer: false,
    entries: [
      {
        provider: "codex",
        item: { type: "user_message", text: "secret prompt" },
        timestamp: "2026-08-25T06:29:00.000Z",
        seqStart: 1,
        seqEnd: 1,
        sourceSeqRanges: [{ startSeq: 1, endSeq: 1 }],
        collapsed: [],
      },
    ],
    error: null,
  };
}

describe("createAgentShare", () => {
  it("uploads encrypted projected history and returns a fragment-keyed link", async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const url = await createAgentShare({
      agentId: "agent-1",
      client: { fetchAgentTimeline: async () => timeline() },
      now: () => new Date("2026-08-25T06:30:00.000Z"),
      shareBaseUrl: "https://shares.test",
      request: async (input, init) => {
        calls.push({ url: String(input), body: String(init?.body) });
        return Response.json(
          {
            shareId: "123e4567-e89b-12d3-a456-426614174000",
            expiresAt: "2026-09-01T06:30:00.000Z",
          },
          { status: 201 },
        );
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://shares.test/api/shares");
    expect(calls[0].body).not.toContain("secret prompt");
    expect(url).toMatch(
      /^https:\/\/shares\.test\/share\/123e4567-e89b-12d3-a456-426614174000#[A-Za-z0-9_-]{43}$/,
    );

    const envelope = EncryptedAgentShareSchema.parse(JSON.parse(calls[0].body));
    const snapshot = await openAgentShare(envelope, url.split("#")[1]);
    expect(snapshot.title).toBe("Review auth flow");
    expect(snapshot.entries[0].item).toEqual({ type: "user_message", text: "secret prompt" });
  });

  it("uses the configured self-hosted share service", async () => {
    const previous = process.env.EXPO_PUBLIC_PASEO_SHARE_BASE_URL;
    process.env.EXPO_PUBLIC_PASEO_SHARE_BASE_URL = "https://agent.example/";
    try {
      let requestUrl = "";
      const url = await createAgentShare({
        agentId: "agent-1",
        client: { fetchAgentTimeline: async () => timeline() },
        request: async (input) => {
          requestUrl = String(input);
          return Response.json(
            {
              shareId: "123e4567-e89b-12d3-a456-426614174000",
              expiresAt: "2026-09-01T06:30:00.000Z",
            },
            { status: 201 },
          );
        },
      });

      expect(requestUrl).toBe("https://agent.example/api/shares");
      expect(url).toMatch(/^https:\/\/agent\.example\/share\//);
    } finally {
      if (previous === undefined) delete process.env.EXPO_PUBLIC_PASEO_SHARE_BASE_URL;
      else process.env.EXPO_PUBLIC_PASEO_SHARE_BASE_URL = previous;
    }
  });
});
