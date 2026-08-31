import type { SessionInboundMessage } from "../messages.js";

interface ProjectAccessRecord {
  accessCodeHash?: string | null;
  archivedAt?: string | null;
}

interface WorkspaceProjectRecord {
  projectId: string;
}

interface ProjectAccessDependencies {
  getProject(projectId: string): Promise<ProjectAccessRecord | null>;
  getWorkspace(workspaceId: string): Promise<WorkspaceProjectRecord | null>;
  getAgentWorkspaceId(agentId: string): Promise<string | null>;
  verifyAccessCode(input: { accessCode: string; hash: string }): Promise<boolean>;
}

export class ProjectAccessDeniedError extends Error {
  readonly code = "project_locked";

  constructor() {
    super("Project access code required");
    this.name = "ProjectAccessDeniedError";
  }
}

export type ProjectUnlockResult = "accepted" | "incorrect_code" | "project_not_found";

export class ProjectAccessAuthorization {
  private readonly unlockedProjectIds = new Set<string>();

  constructor(private readonly dependencies: ProjectAccessDependencies) {}

  authorizeInbound(message: SessionInboundMessage): Promise<void> | null {
    if (message.type === "project.unlock.request") return null;

    const projectId = projectIdFromMessage(message);
    if (projectId) return this.assertProject(projectId);

    const workspaceId = workspaceIdFromMessage(message);
    if (workspaceId) return this.assertWorkspace(workspaceId);

    const agentIds = agentIdsFromMessage(message);
    if (agentIds.length === 0) return null;
    return this.assertAgents(agentIds);
  }

  async unlock(projectId: string, accessCode: string): Promise<ProjectUnlockResult> {
    const project = await this.dependencies.getProject(projectId);
    if (!project || project.archivedAt) return "project_not_found";
    if (!project.accessCodeHash) {
      this.grant(projectId);
      return "accepted";
    }
    const accepted = await this.dependencies.verifyAccessCode({
      accessCode,
      hash: project.accessCodeHash,
    });
    if (!accepted) return "incorrect_code";
    this.grant(projectId);
    return "accepted";
  }

  grant(projectId: string): void {
    this.unlockedProjectIds.add(projectId);
  }

  isGranted(projectId: string): boolean {
    return this.unlockedProjectIds.has(projectId);
  }

  async filterAuthorizedAgentIds(agentIds: readonly string[]): Promise<string[]> {
    const authorized: string[] = [];
    for (const agentId of new Set(agentIds)) {
      try {
        await this.assertAgent(agentId);
        authorized.push(agentId);
      } catch (error) {
        if (!(error instanceof ProjectAccessDeniedError)) throw error;
      }
    }
    return authorized;
  }

  private async assertProject(projectId: string): Promise<void> {
    const project = await this.dependencies.getProject(projectId);
    if (!project?.accessCodeHash || this.unlockedProjectIds.has(projectId)) return;
    throw new ProjectAccessDeniedError();
  }

  private async assertWorkspace(workspaceId: string): Promise<void> {
    const workspace = await this.dependencies.getWorkspace(workspaceId);
    if (workspace) await this.assertProject(workspace.projectId);
  }

  private async assertAgent(agentId: string): Promise<void> {
    const workspaceId = await this.dependencies.getAgentWorkspaceId(agentId);
    if (workspaceId) await this.assertWorkspace(workspaceId);
  }

  private async assertAgents(agentIds: readonly string[]): Promise<void> {
    for (const agentId of agentIds) await this.assertAgent(agentId);
  }
}

function projectIdFromMessage(message: SessionInboundMessage): string | null {
  if (message.type === "workspace.create.request" && message.source.kind === "directory") {
    return message.source.projectId ?? null;
  }
  if (!("projectId" in message)) return null;
  return typeof message.projectId === "string" ? message.projectId : null;
}

function workspaceIdFromMessage(message: SessionInboundMessage): string | null {
  if (!("workspaceId" in message)) return null;
  return typeof message.workspaceId === "string" ? message.workspaceId : null;
}

function agentIdsFromMessage(message: SessionInboundMessage): string[] {
  const agentIds: string[] = [];
  if ("agentId" in message && typeof message.agentId === "string") agentIds.push(message.agentId);
  if ("parentAgentId" in message && typeof message.parentAgentId === "string") {
    agentIds.push(message.parentAgentId);
  }
  if ("callerAgentId" in message && typeof message.callerAgentId === "string") {
    agentIds.push(message.callerAgentId);
  }
  return [...new Set(agentIds)];
}
