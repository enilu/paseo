import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { writeJsonFileAtomic } from "./atomic-file.js";

export const AGENT_SHARE_ACCESS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const AgentShareAccessRecordSchema = z.object({
  id: z.string().uuid(),
  tokenHash: z.string().length(64),
  agentId: z.string().min(1),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const AgentShareAccessFileSchema = z.object({
  version: z.literal(1),
  records: z.array(AgentShareAccessRecordSchema),
});

type AgentShareAccessRecord = z.infer<typeof AgentShareAccessRecordSchema>;

export interface AgentShareAccessGrant {
  id: string;
  agentId: string;
  accessToken: string;
  expiresAt: string;
}

export interface ResolvedAgentShareAccess {
  id: string;
  agentId: string;
  expiresAt: string;
}

interface AgentShareAccessStoreOptions {
  now?: () => Date;
  createToken?: () => string;
}

export class AgentShareAccessStore {
  private readonly filePath: string;
  private readonly now: () => Date;
  private readonly createToken: () => string;
  private records: AgentShareAccessRecord[] | null = null;
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(paseoHome: string, options: AgentShareAccessStoreOptions = {}) {
    this.filePath = path.join(paseoHome, "agent-share-access.json");
    this.now = options.now ?? (() => new Date());
    this.createToken = options.createToken ?? (() => randomBytes(32).toString("base64url"));
  }

  async create(agentId: string): Promise<AgentShareAccessGrant> {
    const accessToken = this.createToken();
    const now = this.now();
    const record: AgentShareAccessRecord = {
      id: randomUUID(),
      tokenHash: hashToken(accessToken),
      agentId,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + AGENT_SHARE_ACCESS_TTL_MS).toISOString(),
    };
    await this.mutate((records) => {
      records.push(record);
    });
    return {
      id: record.id,
      agentId: record.agentId,
      accessToken,
      expiresAt: record.expiresAt,
    };
  }

  async resolve(accessToken: string): Promise<ResolvedAgentShareAccess | null> {
    await this.mutationQueue;
    const records = await this.load();
    const now = this.now().getTime();
    const candidateHash = hashToken(accessToken);
    for (const record of records) {
      if (Date.parse(record.expiresAt) <= now) continue;
      if (!hashesEqual(record.tokenHash, candidateHash)) continue;
      return { id: record.id, agentId: record.agentId, expiresAt: record.expiresAt };
    }
    return null;
  }

  private async mutate(mutator: (records: AgentShareAccessRecord[]) => void): Promise<void> {
    const operation = this.mutationQueue.then(async () => {
      const records = await this.load();
      const now = this.now().getTime();
      this.records = records.filter((record) => Date.parse(record.expiresAt) > now);
      mutator(this.records);
      await writeJsonFileAtomic(this.filePath, { version: 1, records: this.records });
      return undefined;
    });
    this.mutationQueue = operation.catch(() => undefined);
    return operation;
  }

  private async load(): Promise<AgentShareAccessRecord[]> {
    if (this.records) return this.records;
    try {
      const parsed = AgentShareAccessFileSchema.parse(
        JSON.parse(await fs.readFile(this.filePath, "utf8")),
      );
      this.records = parsed.records;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      this.records = [];
    }
    return this.records;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function hashesEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "hex");
  const rightBytes = Buffer.from(right, "hex");
  return leftBytes.byteLength === rightBytes.byteLength && timingSafeEqual(leftBytes, rightBytes);
}
