import type { SessionInboundMessage } from "../messages.js";

interface WorkspaceAccessRecord {
  accessCodeHash?: string | null;
  archivedAt?: string | null;
}

interface WorkspaceAccessDependencies {
  getWorkspace(workspaceId: string): Promise<WorkspaceAccessRecord | null>;
  getAgentWorkspaceId(agentId: string): Promise<string | null>;
  verifyAccessCode(input: { accessCode: string; hash: string }): Promise<boolean>;
}

export class WorkspaceAccessDeniedError extends Error {
  readonly code = "workspace_locked";

  constructor() {
    super("Workspace access code required");
    this.name = "WorkspaceAccessDeniedError";
  }
}

export type WorkspaceUnlockResult = "accepted" | "incorrect_code" | "workspace_not_found";

export class WorkspaceAccessAuthorization {
  private readonly unlockedWorkspaceIds = new Set<string>();

  constructor(private readonly dependencies: WorkspaceAccessDependencies) {}

  authorizeInbound(message: SessionInboundMessage): Promise<void> | null {
    if (message.type === "workspace.unlock.request") return null;

    const workspaceId = workspaceIdFromMessage(message);
    if (workspaceId) return this.assertWorkspace(workspaceId);

    const agentIds = agentIdsFromMessage(message);
    if (agentIds.length === 0) return null;
    return this.assertAgents(agentIds);
  }

  async filterAuthorizedAgentIds(agentIds: readonly string[]): Promise<string[]> {
    const authorized: string[] = [];
    for (const agentId of [...new Set(agentIds)].sort()) {
      try {
        await this.assertAgent(agentId);
        authorized.push(agentId);
      } catch (error) {
        if (!(error instanceof WorkspaceAccessDeniedError)) throw error;
      }
    }
    return authorized;
  }

  async unlock(workspaceId: string, accessCode: string): Promise<WorkspaceUnlockResult> {
    const workspace = await this.dependencies.getWorkspace(workspaceId);
    if (!workspace || workspace.archivedAt) return "workspace_not_found";
    if (!workspace.accessCodeHash) {
      this.grant(workspaceId);
      return "accepted";
    }
    const accepted = await this.dependencies.verifyAccessCode({
      accessCode,
      hash: workspace.accessCodeHash,
    });
    if (!accepted) return "incorrect_code";
    this.grant(workspaceId);
    return "accepted";
  }

  grant(workspaceId: string): void {
    this.unlockedWorkspaceIds.add(workspaceId);
  }

  private async assertAgent(agentId: string): Promise<void> {
    const workspaceId = await this.dependencies.getAgentWorkspaceId(agentId);
    if (workspaceId) await this.assertWorkspace(workspaceId);
  }

  private async assertAgents(agentIds: readonly string[]): Promise<void> {
    for (const agentId of agentIds) await this.assertAgent(agentId);
  }

  private async assertWorkspace(workspaceId: string): Promise<void> {
    const workspace = await this.dependencies.getWorkspace(workspaceId);
    const isLocked = Boolean(workspace?.accessCodeHash);
    if (!isLocked || this.unlockedWorkspaceIds.has(workspaceId)) return;
    throw new WorkspaceAccessDeniedError();
  }
}

function workspaceIdFromMessage(message: SessionInboundMessage): string | null {
  if (!("workspaceId" in message)) return null;
  return typeof message.workspaceId === "string" ? message.workspaceId : null;
}

function agentIdsFromMessage(message: SessionInboundMessage): string[] {
  const agentIds: string[] = [];
  if ("agentId" in message && typeof message.agentId === "string") {
    agentIds.push(message.agentId);
  }
  if ("parentAgentId" in message && typeof message.parentAgentId === "string") {
    agentIds.push(message.parentAgentId);
  }
  if ("callerAgentId" in message && typeof message.callerAgentId === "string") {
    agentIds.push(message.callerAgentId);
  }
  return [...new Set(agentIds)];
}
