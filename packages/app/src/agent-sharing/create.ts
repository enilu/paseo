import {
  AgentShareCreateResponseSchema,
  sealAgentShare,
  type AgentShareSnapshot,
} from "@getpaseo/protocol/agent-share";
import type {
  FetchAgentTimelineOptions,
  FetchAgentTimelinePayload,
} from "@getpaseo/client/internal/daemon-client";

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

  const snapshot: AgentShareSnapshot = {
    version: 1,
    title: timeline.agent.title?.trim() || "Paseo session",
    sharedAt: (input.now ?? (() => new Date()))().toISOString(),
    entries: timeline.entries,
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
