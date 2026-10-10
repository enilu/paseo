import { describe, expect, test } from "vitest";
import {
  SessionInboundMessageSchema,
  SessionOutboundMessageSchema,
  type SessionInboundMessage,
  type SessionOutboundMessage,
} from "../messages.js";
import {
  DAEMON_PERMISSIONS,
  OWNER_PERMISSIONS,
  SessionAuthorization,
  permissionsForLegacyHubScopes,
  parseDaemonPermissions,
} from "./index.js";

function inboundOperationTypes(): SessionInboundMessage["type"][] {
  return SessionInboundMessageSchema.options.map((option) => option.shape.type.value);
}

function outboundOperationTypes(): SessionOutboundMessage["type"][] {
  return SessionOutboundMessageSchema.options.map((option) => option.shape.type.value);
}

function inboundMessage(type: SessionInboundMessage["type"]): SessionInboundMessage {
  return { type } as SessionInboundMessage;
}

function outboundMessage(type: SessionOutboundMessage["type"]): SessionOutboundMessage {
  if (type === "status")
    return {
      type,
      payload: { status: "agent_create_failed", error: "test", requestId: "test" },
    } as SessionOutboundMessage;
  return { type } as SessionOutboundMessage;
}

describe("SessionAuthorization", () => {
  test("owner authority covers every session operation", () => {
    const authorization = new SessionAuthorization(OWNER_PERMISSIONS);

    expect(
      inboundOperationTypes().every((type) => authorization.allowsInbound(inboundMessage(type))),
    ).toBe(true);
    expect(
      outboundOperationTypes().every((type) => authorization.allowsOutbound(outboundMessage(type))),
    ).toBe(true);
  });

  test("semantic permissions authorize operations instead of RPC namespaces", () => {
    const authorization = new SessionAuthorization(["hub.execute"]);

    expect(authorization.allowsInbound(inboundMessage("hub.execution.agent.create.request"))).toBe(
      true,
    );
    expect(authorization.allowsOutbound(outboundMessage("hub.execution.agent.update"))).toBe(true);
    expect(authorization.allowsInbound(inboundMessage("get_providers_snapshot_request"))).toBe(
      true,
    );
    expect(authorization.allowsInbound(inboundMessage("refresh_providers_snapshot_request"))).toBe(
      true,
    );
    expect(authorization.allowsOutbound(outboundMessage("get_providers_snapshot_response"))).toBe(
      true,
    );
    expect(authorization.allowsOutbound(outboundMessage("providers_snapshot_update"))).toBe(true);
    expect(
      authorization.allowsOutbound(outboundMessage("refresh_providers_snapshot_response")),
    ).toBe(true);
    expect(authorization.allowsInbound(inboundMessage("get_daemon_config_request"))).toBe(false);
    expect(authorization.allowsInbound(inboundMessage("provider_diagnostic_request"))).toBe(false);
    expect(authorization.allowsInbound(inboundMessage("ping"))).toBe(false);
    expect(
      authorization.allowsInbound(inboundMessage("hub.management.daemon.get_status.request")),
    ).toBe(false);
  });

  test("Hub can operate ordinary agents and recover workspaces without daemon administration", () => {
    const authorization = new SessionAuthorization(["hub.execute"]);
    for (const type of [
      "create_agent_request",
      "workspace.title.set.request",
      "fetch_agents_request",
      "fetch_agent_request",
      "agent.timeline.set_subscription.request",
      "send_agent_message_request",
      "workspace.recovery.inspect.request",
      "workspace.recovery.restore.request",
      "archive_workspace_request",
      "cancel_agent_request",
    ] as const) {
      expect(authorization.allowsInbound(inboundMessage(type))).toBe(true);
    }
    for (const type of [
      "status",
      "agent_update",
      "agent_stream",
      "workspace_update",
      "rpc_error",
      "workspace.title.set.response",
      "fetch_agents_response",
      "fetch_agent_response",
      "agent.timeline.set_subscription.response",
      "send_agent_message_response",
      "workspace.recovery.inspect.response",
      "workspace.recovery.restore.response",
      "archive_workspace_response",
      "cancel_agent_response",
    ] as const) {
      expect(authorization.allowsOutbound(outboundMessage(type))).toBe(true);
    }
    for (const type of [
      "restart_server_request",
      "terminal_input",
      "hub.management.daemon.permissions.update.request",
    ] as const) {
      expect(authorization.allowsInbound(inboundMessage(type))).toBe(false);
    }
    expect(
      authorization.allowsOutbound({
        type: "status",
        payload: { status: "shutdown_requested", clientId: "owner", requestId: "shutdown" },
      }),
    ).toBe(false);
    authorization.replacePermissions([]);
    expect(authorization.allowsInbound(inboundMessage("send_agent_message_request"))).toBe(false);
    expect(authorization.allowsOutbound(outboundMessage("agent_update"))).toBe(false);
  });

  test("correlated authorization errors can always be emitted", () => {
    const authorization = new SessionAuthorization([]);

    expect(authorization.allowsOutbound(outboundMessage("rpc_error"))).toBe(true);
  });

  test("agent share authority is bound to one agent and two operations", () => {
    const authorization = new SessionAuthorization([], {
      agentId: "agent-1",
      expiresAt: "2999-01-01T00:00:00.000Z",
    });

    expect(
      authorization.allowsInbound({
        type: "fetch_agent_timeline_request",
        agentId: "agent-1",
        requestId: "timeline",
      }),
    ).toBe(true);
    expect(
      authorization.allowsInbound({
        type: "send_agent_message_request",
        agentId: "agent-1",
        requestId: "message",
        text: "Continue",
        attachments: [],
      }),
    ).toBe(true);
    expect(
      authorization.allowsInbound({
        type: "fetch_agent_timeline_request",
        agentId: "agent-2",
        requestId: "other-agent",
      }),
    ).toBe(false);
    expect(authorization.allowsInbound(inboundMessage("fetch_agents_request"))).toBe(false);
    expect(authorization.allowsInbound(inboundMessage("terminal_input"))).toBe(false);
    expect(
      authorization.allowsOutbound({
        type: "send_agent_message_response",
        payload: { requestId: "message", agentId: "agent-1", accepted: true, error: null },
      }),
    ).toBe(true);
    expect(
      authorization.allowsOutbound({
        type: "send_agent_message_response",
        payload: { requestId: "message", agentId: "agent-2", accepted: true, error: null },
      }),
    ).toBe(false);
    expect(authorization.allowsOutbound(outboundMessage("agent_update"))).toBe(false);
    expect(authorization.allowsOutbound(outboundMessage("rpc_error"))).toBe(true);
  });

  test("agent share authority stops at its expiry", () => {
    const authorization = new SessionAuthorization([], {
      agentId: "agent-1",
      expiresAt: "2000-01-01T00:00:00.000Z",
    });

    expect(
      authorization.allowsInbound({
        type: "fetch_agent_timeline_request",
        agentId: "agent-1",
        requestId: "timeline",
      }),
    ).toBe(false);
    expect(authorization.allowsOutbound(outboundMessage("rpc_error"))).toBe(true);
  });

  test("legacy Hub authority is translated at one compatibility boundary", () => {
    expect(permissionsForLegacyHubScopes(["hub.execution.*"])).toEqual(["hub.execute"]);
    expect(permissionsForLegacyHubScopes(["*"])).toEqual([]);
  });

  test("permission names are semantic", () => {
    expect(
      DAEMON_PERMISSIONS.every(
        (permission) => !permission.includes("*") && !permission.includes("request"),
      ),
    ).toBe(true);
  });

  test("permission parsing validates against the shared registry and removes duplicates", () => {
    expect(parseDaemonPermissions(["hub.execute", "hub.execute"])).toEqual(["hub.execute"]);
    expect(() => parseDaemonPermissions(["hub.execution.*"])).toThrow("Invalid daemon permission");
  });
});
