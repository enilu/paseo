import { describe, expect, it } from "vitest";
import { AgentShareCreateResponseSchema } from "@getpaseo/protocol/agent-share";
import type { AgentShareStore } from "./agent-share-api";
import { handleAgentShareApi } from "./agent-share-api";

function createStore(): AgentShareStore & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    get: async (key) => values.get(key) ?? null,
    put: async (key, value) => {
      values.set(key, value);
    },
  };
}

describe("agent share API", () => {
  it("stores and retrieves only an encrypted envelope", async () => {
    const store = createStore();
    const envelope = { version: 1, iv: "an-iv", ciphertext: "encrypted-content" };
    const created = await handleAgentShareApi(
      new Request("https://paseo.sh/api/shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(envelope),
      }),
      store,
    );
    const createdBody = AgentShareCreateResponseSchema.parse(await created.json());

    expect(created.status).toBe(201);
    expect(createdBody.shareId).toMatch(/^[0-9a-f-]{36}$/);
    const fetched = await handleAgentShareApi(
      new Request(`https://paseo.sh/api/shares/${createdBody.shareId}`),
      store,
    );
    expect(await fetched.json()).toEqual(envelope);
    expect(fetched.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects plaintext and malformed uploads", async () => {
    const response = await handleAgentShareApi(
      new Request("https://paseo.sh/api/shares", {
        method: "POST",
        body: JSON.stringify({ version: 1, transcript: "private" }),
      }),
      createStore(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid share" });
  });
});
