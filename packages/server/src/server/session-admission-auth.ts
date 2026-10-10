import { compare } from "bcryptjs";
import type { WSHelloMessage } from "@getpaseo/protocol/messages";
import { OWNER_PERMISSIONS } from "./authorization/index.js";
import { matchesLocalCredential } from "./local-credential.js";
import type { SessionAdmission } from "./websocket-server.js";

export type AdmissionFailure = "password_required" | "incorrect_password";

type AdmissionResolution = { admission: SessionAdmission } | { rejection: AdmissionFailure };

export async function resolveSessionAdmission(input: {
  credential: WSHelloMessage["auth"];
  passwordHash: string | undefined;
  localCredential: string | null;
  transport: "direct" | "relay";
  resolveAgentShare?: (
    token: string,
  ) => Promise<{ id: string; agentId: string; expiresAt: string } | null>;
}): Promise<AdmissionResolution> {
  const { credential, passwordHash, localCredential, transport } = input;
  if (credential?.kind === "agentShare") {
    const grant = await input.resolveAgentShare?.(credential.token);
    if (!grant) return { rejection: "incorrect_password" };
    return {
      admission: {
        principalId: `agent-share:${grant.id}`,
        permissions: [],
        agentShareScope: { agentId: grant.agentId, expiresAt: grant.expiresAt },
      },
    };
  }
  if (!passwordHash) {
    return { admission: { principalId: "owner", permissions: OWNER_PERMISSIONS } };
  }
  if (!credential) {
    // COMPAT(relayPasswordOptional): added in v0.9.1, remove once release N mobile builds are live on App Store and Play.
    if (transport === "relay") {
      return { admission: { principalId: "owner", permissions: OWNER_PERMISSIONS } };
    }
    return { rejection: "password_required" };
  }
  if (credential.kind === "localCredential") {
    if (localCredential && matchesLocalCredential(localCredential, credential.token)) {
      return { admission: { principalId: "owner", permissions: OWNER_PERMISSIONS } };
    }
    return { rejection: "incorrect_password" };
  }
  return (await compare(credential.password, passwordHash))
    ? { admission: { principalId: "owner", permissions: OWNER_PERMISSIONS } }
    : { rejection: "incorrect_password" };
}
