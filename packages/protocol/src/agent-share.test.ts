import { describe, expect, it } from "vitest";
import {
  openAgentShare,
  sanitizeAgentShareEntries,
  sealAgentShare,
  type AgentShareSnapshot,
} from "./agent-share.js";

const snapshot: AgentShareSnapshot = {
  version: 1,
  title: "Shared session",
  sharedAt: "2026-08-25T06:30:00.000Z",
  entries: [
    {
      provider: "codex",
      item: { type: "user_message", text: "Explain this code" },
      timestamp: "2026-08-25T06:29:00.000Z",
      seqStart: 1,
      seqEnd: 1,
      sourceSeqRanges: [{ startSeq: 1, endSeq: 1 }],
      collapsed: [],
    },
  ],
};

describe("agent share encryption", () => {
  it("round trips a snapshot without putting plaintext in the envelope", async () => {
    const sealed = await sealAgentShare(snapshot);

    expect(JSON.stringify(sealed.envelope)).not.toContain("Explain this code");
    await expect(openAgentShare(sealed.envelope, sealed.key)).resolves.toEqual(snapshot);
  });

  it("rejects a different key", async () => {
    const sealed = await sealAgentShare(snapshot);
    const other = await sealAgentShare(snapshot);

    await expect(openAgentShare(sealed.envelope, other.key)).rejects.toThrow();
  });

  it("removes shell calls without removing other tools", () => {
    const entries: AgentShareSnapshot["entries"] = [
      snapshot.entries[0],
      {
        provider: "codex",
        item: {
          type: "tool_call",
          callId: "shell-1",
          name: "shell",
          status: "completed",
          error: null,
          detail: { type: "shell", command: "pwd", output: "/workspace" },
        },
        timestamp: "2026-08-25T06:29:10.000Z",
        seqStart: 2,
        seqEnd: 2,
        sourceSeqRanges: [{ startSeq: 2, endSeq: 2 }],
        collapsed: [],
      },
      {
        provider: "codex",
        item: {
          type: "tool_call",
          callId: "read-1",
          name: "read",
          status: "completed",
          error: null,
          detail: { type: "read", filePath: "/workspace/README.md" },
        },
        timestamp: "2026-08-25T06:29:20.000Z",
        seqStart: 3,
        seqEnd: 3,
        sourceSeqRanges: [{ startSeq: 3, endSeq: 3 }],
        collapsed: [],
      },
    ];

    expect(sanitizeAgentShareEntries(entries).map((entry) => entry.item.type)).toEqual([
      "user_message",
      "tool_call",
    ]);
    expect(sanitizeAgentShareEntries(entries)[1]?.item).toMatchObject({
      type: "tool_call",
      detail: { type: "read" },
    });
  });
});
