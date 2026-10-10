import type { SessionInboundMessage, SessionOutboundMessage } from "../messages.js";
import { DAEMON_PERMISSIONS, type DaemonPermission } from "@getpaseo/protocol/messages";
import {
  type PermissionRequirement,
  requiredPermissionForInbound,
  requiredPermissionForOutbound,
} from "./operation-permissions.js";

export { DAEMON_PERMISSIONS, type DaemonPermission };

const daemonPermissionSet: ReadonlySet<string> = new Set(DAEMON_PERMISSIONS);

export function isDaemonPermission(value: string): value is DaemonPermission {
  return daemonPermissionSet.has(value);
}

export function parseDaemonPermissions(values: readonly string[]): DaemonPermission[] {
  const permissions = [...new Set(values)];
  if (!permissions.every(isDaemonPermission)) throw new Error("Invalid daemon permission");
  return permissions;
}

export const OWNER_PERMISSIONS: readonly DaemonPermission[] = DAEMON_PERMISSIONS;

export interface AgentShareScope {
  agentId: string;
  expiresAt: string;
}

export class SessionAuthorization {
  private permissions: ReadonlySet<DaemonPermission>;

  constructor(
    permissions: readonly DaemonPermission[],
    private readonly agentShareScope: AgentShareScope | null = null,
  ) {
    this.permissions = new Set(permissions);
  }

  allowsInbound(message: SessionInboundMessage): boolean {
    if (this.agentShareScope) {
      return (
        !isExpired(this.agentShareScope) && allowsAgentShareInbound(this.agentShareScope, message)
      );
    }
    return this.allows(requiredPermissionForInbound(message.type));
  }

  allowsOutbound(message: SessionOutboundMessage): boolean {
    if (this.agentShareScope) {
      return (
        message.type === "rpc_error" ||
        (!isExpired(this.agentShareScope) &&
          allowsAgentShareOutbound(this.agentShareScope, message))
      );
    }
    return this.allows(requiredPermissionForOutbound(message));
  }

  replacePermissions(permissions: readonly DaemonPermission[]): void {
    this.permissions = new Set(permissions);
  }

  listPermissions(): DaemonPermission[] {
    return [...this.permissions];
  }

  allowsPermission(permission: DaemonPermission): boolean {
    return this.permissions.has(permission);
  }

  isAgentShareSession(): boolean {
    return this.agentShareScope !== null;
  }

  private allows(requirement: PermissionRequirement): boolean {
    if (requirement === null) return true;
    if (typeof requirement === "string") return this.permissions.has(requirement);
    return requirement.some((permission) => this.permissions.has(permission));
  }
}

function isExpired(scope: AgentShareScope): boolean {
  return Date.now() >= Date.parse(scope.expiresAt);
}

function allowsAgentShareInbound(scope: AgentShareScope, message: SessionInboundMessage): boolean {
  return (
    (message.type === "fetch_agent_timeline_request" ||
      message.type === "send_agent_message_request") &&
    message.agentId === scope.agentId
  );
}

function allowsAgentShareOutbound(
  scope: AgentShareScope,
  message: SessionOutboundMessage,
): boolean {
  if (message.type === "rpc_error") return true;
  if (
    message.type === "fetch_agent_timeline_response" ||
    message.type === "send_agent_message_response"
  ) {
    return message.payload.agentId === scope.agentId;
  }
  return false;
}

const LEGACY_HUB_EXECUTION_SCOPE = "hub.execution.*";

export function permissionsForLegacyHubScopes(
  scopes: readonly string[],
): readonly DaemonPermission[] {
  // COMPAT(semanticHubPermissions): added in v0.7, remove after Hub enrollment uses permissions.
  return scopes.includes(LEGACY_HUB_EXECUTION_SCOPE) ? ["hub.execute"] : [];
}
