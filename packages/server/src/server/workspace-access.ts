import { compare, hash } from "bcryptjs";

const WORKSPACE_ACCESS_CODE_BCRYPT_COST = 12;

export async function hashWorkspaceAccessCode(accessCode: string): Promise<string> {
  return hash(accessCode, WORKSPACE_ACCESS_CODE_BCRYPT_COST);
}

export async function verifyWorkspaceAccessCode(input: {
  accessCode: string;
  hash: string;
}): Promise<boolean> {
  return compare(input.accessCode, input.hash);
}
