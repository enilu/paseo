import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AGENT_SHARE_ACCESS_TTL_MS, AgentShareAccessStore } from "./agent-share-access.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

async function createPaseoHome(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "paseo-agent-share-"));
  temporaryDirectories.push(directory);
  return directory;
}

describe("AgentShareAccessStore", () => {
  it("persists only a token hash and resolves the bound agent", async () => {
    const paseoHome = await createPaseoHome();
    const now = new Date("2026-10-10T03:00:00.000Z");
    const store = new AgentShareAccessStore(paseoHome, {
      now: () => now,
      createToken: () => "share-secret-token",
    });

    const grant = await store.create("agent-1");

    expect(grant).toMatchObject({
      agentId: "agent-1",
      accessToken: "share-secret-token",
      expiresAt: new Date(now.getTime() + AGENT_SHARE_ACCESS_TTL_MS).toISOString(),
    });
    expect(await store.resolve("share-secret-token")).toEqual({
      id: grant.id,
      agentId: "agent-1",
      expiresAt: grant.expiresAt,
    });
    expect(await store.resolve("wrong-token")).toBeNull();

    const persisted = await readFile(path.join(paseoHome, "agent-share-access.json"), "utf8");
    expect(persisted).not.toContain("share-secret-token");
    expect(persisted).toContain("agent-1");
  });

  it("rejects expired grants after a restart", async () => {
    const paseoHome = await createPaseoHome();
    let now = new Date("2026-10-10T03:00:00.000Z");
    const first = new AgentShareAccessStore(paseoHome, {
      now: () => now,
      createToken: () => "expiring-token",
    });
    await first.create("agent-1");

    now = new Date(now.getTime() + AGENT_SHARE_ACCESS_TTL_MS + 1);
    const restarted = new AgentShareAccessStore(paseoHome, { now: () => now });

    await expect(restarted.resolve("expiring-token")).resolves.toBeNull();
  });
});
