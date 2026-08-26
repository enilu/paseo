import { EncryptedAgentShareSchema } from "@getpaseo/protocol/agent-share";

const AGENT_SHARE_PREFIX = "agent-share:";
const AGENT_SHARE_TTL_SECONDS = 7 * 24 * 60 * 60;
const AGENT_SHARE_MAX_BYTES = 10 * 1024 * 1024;

export interface AgentShareStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

function corsHeaders(): HeadersInit {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: corsHeaders() });
}

export async function handleAgentShareApi(
  request: Request,
  store: AgentShareStore | null,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (!store) return jsonResponse({ error: "Share storage is unavailable" }, 503);

  if (url.pathname === "/api/shares" && request.method === "POST") {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > AGENT_SHARE_MAX_BYTES) {
      return jsonResponse({ error: "Share is too large" }, 413);
    }
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > AGENT_SHARE_MAX_BYTES) {
      return jsonResponse({ error: "Share is too large" }, 413);
    }
    let envelope: unknown;
    try {
      envelope = JSON.parse(body);
    } catch {
      return jsonResponse({ error: "Invalid share" }, 400);
    }
    const parsed = EncryptedAgentShareSchema.safeParse(envelope);
    if (!parsed.success) return jsonResponse({ error: "Invalid share" }, 400);

    const shareId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + AGENT_SHARE_TTL_SECONDS * 1000).toISOString();
    await store.put(`${AGENT_SHARE_PREFIX}${shareId}`, JSON.stringify(parsed.data), {
      expirationTtl: AGENT_SHARE_TTL_SECONDS,
    });
    return jsonResponse({ shareId, expiresAt }, 201);
  }

  const match = url.pathname.match(/^\/api\/shares\/([0-9a-f-]{36})$/i);
  if (match && request.method === "GET") {
    const envelope = await store.get(`${AGENT_SHARE_PREFIX}${match[1]}`);
    if (!envelope) return jsonResponse({ error: "Share not found" }, 404);
    return new Response(envelope, {
      headers: { ...corsHeaders(), "content-type": "application/json; charset=utf-8" },
    });
  }
  return jsonResponse({ error: "Not found" }, 404);
}
