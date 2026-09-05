import { z } from "zod";
import { AgentTimelineEntryPayloadSchema } from "./messages.js";

export const AgentShareSnapshotSchema = z.object({
  version: z.literal(1),
  title: z.string().trim().min(1).max(500),
  sharedAt: z.string().datetime(),
  entries: z.array(AgentTimelineEntryPayloadSchema),
});

export const EncryptedAgentShareSchema = z.object({
  version: z.literal(1),
  iv: z.string().min(1),
  ciphertext: z.string().min(1),
});

export const AgentShareCreateResponseSchema = z.object({
  shareId: z.string().uuid(),
  expiresAt: z.string().datetime(),
});

export type AgentShareSnapshot = z.infer<typeof AgentShareSnapshotSchema>;
export type EncryptedAgentShare = z.infer<typeof EncryptedAgentShareSchema>;
export type AgentShareCreateResponse = z.infer<typeof AgentShareCreateResponseSchema>;

export interface SealedAgentShare {
  envelope: EncryptedAgentShare;
  key: string;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function sealAgentShare(snapshot: AgentShareSnapshot): Promise<SealedAgentShare> {
  const validated = AgentShareSnapshotSchema.parse(snapshot);
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const plaintext = new TextEncoder().encode(JSON.stringify(validated));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  return {
    envelope: {
      version: 1,
      iv: encodeBase64Url(iv),
      ciphertext: encodeBase64Url(new Uint8Array(ciphertext)),
    },
    key: encodeBase64Url(keyBytes),
  };
}

export async function openAgentShare(
  envelope: EncryptedAgentShare,
  encodedKey: string,
): Promise<AgentShareSnapshot> {
  const validated = EncryptedAgentShareSchema.parse(envelope);
  const keyBytes = decodeBase64Url(encodedKey);
  if (keyBytes.byteLength !== 32) throw new Error("Invalid share key");
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64Url(validated.iv) },
    key,
    decodeBase64Url(validated.ciphertext),
  );
  return AgentShareSnapshotSchema.parse(JSON.parse(new TextDecoder().decode(plaintext)));
}
