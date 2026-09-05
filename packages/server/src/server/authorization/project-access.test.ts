import { describe, expect, test } from "vitest";
import type { SessionInboundMessage } from "../messages.js";
import { ProjectAccessAuthorization, ProjectAccessDeniedError } from "./project-access.js";

function createAuthorization() {
  const projects = new Map([
    ["locked-project", { accessCodeHash: "hash", archivedAt: null }],
    ["open-project", { accessCodeHash: null, archivedAt: null }],
  ]);
  const workspaces = new Map([
    ["locked-workspace", { projectId: "locked-project" }],
    ["open-workspace", { projectId: "open-project" }],
  ]);
  const agentWorkspaces = new Map([
    ["locked-agent", "locked-workspace"],
    ["open-agent", "open-workspace"],
  ]);
  return new ProjectAccessAuthorization({
    getProject: async (projectId) => projects.get(projectId) ?? null,
    getWorkspace: async (workspaceId) => workspaces.get(workspaceId) ?? null,
    getAgentWorkspaceId: async (agentId) => agentWorkspaces.get(agentId) ?? null,
    verifyAccessCode: async ({ accessCode }) => accessCode === "correct",
  });
}

describe("ProjectAccessAuthorization", () => {
  test("blocks project resources until the session unlocks the project", async () => {
    const authorization = createAuthorization();
    const fetchTimeline = {
      type: "fetch_agent_timeline_request",
      agentId: "locked-agent",
      requestId: "request",
      direction: "tail",
    } as SessionInboundMessage;

    await expect(authorization.authorizeInbound(fetchTimeline)).rejects.toBeInstanceOf(
      ProjectAccessDeniedError,
    );
    await expect(authorization.unlock("locked-project", "wrong")).resolves.toBe("incorrect_code");
    await expect(authorization.unlock("locked-project", "correct")).resolves.toBe("accepted");
    await expect(authorization.authorizeInbound(fetchTimeline)).resolves.toBeUndefined();
  });

  test("filters agents belonging to locked projects", async () => {
    const authorization = createAuthorization();

    await expect(
      authorization.filterAuthorizedAgentIds(["locked-agent", "open-agent", "open-agent"]),
    ).resolves.toEqual(["open-agent"]);
  });
});
