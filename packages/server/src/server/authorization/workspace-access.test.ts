import { describe, expect, test } from "vitest";
import type { SessionInboundMessage } from "../messages.js";
import { WorkspaceAccessAuthorization, WorkspaceAccessDeniedError } from "./workspace-access.js";

function createAuthorization() {
  const workspaces = new Map([
    ["locked", { accessCodeHash: "hash", archivedAt: null }],
    ["open", { accessCodeHash: null, archivedAt: null }],
  ]);
  const agentWorkspaces = new Map([
    ["locked-agent", "locked"],
    ["open-agent", "open"],
  ]);
  return new WorkspaceAccessAuthorization({
    getWorkspace: async (workspaceId) => workspaces.get(workspaceId) ?? null,
    getAgentWorkspaceId: async (agentId) => agentWorkspaces.get(agentId) ?? null,
    verifyAccessCode: async ({ accessCode }) => accessCode === "correct",
  });
}

describe("WorkspaceAccessAuthorization", () => {
  test("blocks resource-bearing operations until the session unlocks the workspace", async () => {
    const authorization = createAuthorization();
    const fetchTimeline = {
      type: "fetch_agent_timeline_request",
      agentId: "locked-agent",
      requestId: "request",
      direction: "tail",
    } as SessionInboundMessage;

    await expect(authorization.authorizeInbound(fetchTimeline)).rejects.toBeInstanceOf(
      WorkspaceAccessDeniedError,
    );
    await expect(authorization.unlock("locked", "wrong")).resolves.toBe("incorrect_code");
    await expect(authorization.unlock("locked", "correct")).resolves.toBe("accepted");
    await expect(authorization.authorizeInbound(fetchTimeline)).resolves.toBeUndefined();
  });

  test("keeps locked agents out of timeline subscriptions while preserving visible agents", async () => {
    const authorization = createAuthorization();

    await expect(
      authorization.filterAuthorizedAgentIds(["locked-agent", "open-agent", "open-agent"]),
    ).resolves.toEqual(["open-agent"]);
  });
});
