import { describe, expect, it } from "vitest";
import { openAgentShare, sealAgentShare, type AgentShareSnapshot } from "./agent-share.js";

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
});
