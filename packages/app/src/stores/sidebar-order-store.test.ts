import { describe, expect, it } from "vitest";
import { migrateSidebarOrderState } from "./sidebar-order-store";

describe("migrateSidebarOrderState", () => {
  it("drops saved project workspace order from older persisted versions", () => {
    const migrated = migrateSidebarOrderState(
      {
        projectOrder: ["project-a"],
        workspaceOrderByProject: {
          "project-a": ["host-b:main", "host-a:feature"],
        },
        workspaceOrderByServerAndProject: {
          "host-a::project-a": ["main"],
        },
      },
      1,
    );

    expect(migrated).toEqual({
      projectOrder: ["project-a"],
      pinnedWorkspaceOrder: [],
      workspaceOrderByProject: {},
    });
  });

  it("prefixes legacy per-server workspace order with the source server id for current storage", () => {
    const migrated = migrateSidebarOrderState(
      {
        projectOrderByServerId: {
          "host-a": ["project-a"],
          "host-b": ["project-a"],
        },
        workspaceOrderByServerAndProject: {
          "host-a::project-a": ["main", "feature"],
          "host-b::project-a": ["main"],
        },
      },
      2,
    );

    expect(migrated).toEqual({
      projectOrder: ["project-a"],
      pinnedWorkspaceOrder: [],
      workspaceOrderByProject: {
        "project-a": ["host-a:main", "host-a:feature", "host-b:main"],
      },
    });
  });

  it("normalizes pinned workspace order", () => {
    const migrated = migrateSidebarOrderState({
      pinnedWorkspaceOrder: [" host-a:one ", "host-a:one", "", "host-b:two"],
    });

    expect(migrated.pinnedWorkspaceOrder).toEqual(["host-a:one", "host-b:two"]);
  });
});
