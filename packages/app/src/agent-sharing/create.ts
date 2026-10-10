import {
  AgentShareCreateResponseSchema,
  sanitizeAgentShareEntries,
  sealAgentShare,
  type AgentShareSnapshot,
} from "@getpaseo/protocol/agent-share";
import type {
  FetchAgentTimelineOptions,
  FetchAgentTimelinePayload,
} from "@getpaseo/client/internal/daemon-client";
import type { AgentShareCreateResponse } from "@getpaseo/protocol/messages";

const DEFAULT_SHARE_BASE_URL = "https://paseo.sh";

function configuredShareBaseUrl(): string {
  return process.env.EXPO_PUBLIC_PASEO_SHARE_BASE_URL?.trim() || DEFAULT_SHARE_BASE_URL;
}

export interface CreateAgentShareInput {
  agentId: string;
  client: {
    fetchAgentTimeline(
      agentId: string,
      options?: FetchAgentTimelineOptions,
    ): Promise<FetchAgentTimelinePayload>;
    createAgentShareAccess(agentId: string): Promise<AgentShareCreateResponse["payload"]>;
  };
  now?: () => Date;
  shareBaseUrl?: string;
  request?: typeof fetch;
}

export async function createAgentShare(input: CreateAgentShareInput): Promise<string> {
  const timeline = await input.client.fetchAgentTimeline(input.agentId, {
    direction: "tail",
    limit: 0,
    projection: "projected",
  });
  if (!timeline.agent) throw new Error("Agent not found");
  const access = await input.client.createAgentShareAccess(input.agentId);
  if (!access.accessToken || !access.expiresAt || !access.relay) {
    throw new Error(access.error ?? "Unable to create collaborative share access");
  }

  const snapshot: AgentShareSnapshot = {
    version: 1,
    title: timeline.agent.title?.trim() || "Paseo session",
    sharedAt: (input.now ?? (() => new Date()))().toISOString(),
    entries: sanitizeAgentShareEntries(timeline.entries),
    collaboration: {
      agentId: input.agentId,
      accessToken: access.accessToken,
      expiresAt: access.expiresAt,
      serverId: access.relay.serverId,
      daemonPublicKeyB64: access.relay.daemonPublicKeyB64,
      relay: {
        endpoint: access.relay.endpoint,
        useTls: access.relay.useTls,
      },
    },
  };
  const sealed = await sealAgentShare(snapshot);
  const shareBaseUrl = (input.shareBaseUrl ?? configuredShareBaseUrl()).replace(/\/$/, "");
  const response = await (input.request ?? fetch)(`${shareBaseUrl}/api/shares`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(sealed.envelope),
  });
  if (!response.ok) throw new Error(`Share upload failed (${response.status})`);
  const created = AgentShareCreateResponseSchema.parse(await response.json());
  return `${shareBaseUrl}/share/${created.shareId}#${sealed.key}`;
}
