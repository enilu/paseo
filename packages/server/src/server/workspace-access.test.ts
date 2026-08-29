import { describe, expect, test } from "vitest";
import { hashWorkspaceAccessCode, verifyWorkspaceAccessCode } from "./workspace-access.js";

describe("workspace access codes", () => {
  test("stores a one-way hash and verifies only the matching code", async () => {
    const hash = await hashWorkspaceAccessCode("team-4821");

    expect(hash).not.toContain("team-4821");
    await expect(verifyWorkspaceAccessCode({ accessCode: "team-4821", hash })).resolves.toBe(true);
    await expect(verifyWorkspaceAccessCode({ accessCode: "wrong", hash })).resolves.toBe(false);
  });
});
