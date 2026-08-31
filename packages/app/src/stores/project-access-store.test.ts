import { beforeEach, describe, expect, test } from "vitest";
import { projectAccessKey, useProjectAccessStore } from "./project-access-store";

describe("project-access-store", () => {
  beforeEach(() => {
    useProjectAccessStore.setState({ unlockedKeys: new Set() });
  });

  test("keeps unlock state scoped to both host and project", () => {
    useProjectAccessStore.getState().unlock("host-a", "project-1");

    expect(useProjectAccessStore.getState().unlockedKeys).toEqual(
      new Set([projectAccessKey("host-a", "project-1")]),
    );
    expect(
      useProjectAccessStore.getState().unlockedKeys.has(projectAccessKey("host-b", "project-1")),
    ).toBe(false);
  });
});
