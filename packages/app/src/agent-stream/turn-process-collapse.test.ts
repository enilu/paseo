import { describe, expect, it } from "vitest";
import type { StreamItem } from "@/types/stream";
import { projectCompletedTurnProcesses } from "./turn-process-collapse";

const at = new Date("2026-08-12T00:00:00.000Z");

function user(id: string): StreamItem {
  return { kind: "user_message", id, text: id, timestamp: at };
}

function assistant(id: string): StreamItem {
  return { kind: "assistant_message", id, text: id, timestamp: at };
}

function thought(id: string): StreamItem {
  return { kind: "thought", id, text: id, timestamp: at, status: "ready" };
}

describe("projectCompletedTurnProcesses", () => {
  it("keeps every assistant text response visible", () => {
    const projection = projectCompletedTurnProcesses({
      items: [
        user("u1"),
        thought("thinking"),
        assistant("progress"),
        assistant("conclusion"),
        assistant("persisted"),
      ],
      isTurnActive: false,
    });

    expect(projection.byItemId.get("thinking")).toMatchObject({
      turnId: "u1",
      role: "anchor",
      itemCount: 1,
    });
    expect(projection.byItemId.has("progress")).toBe(false);
    expect(projection.byItemId.has("conclusion")).toBe(false);
    expect(projection.byItemId.has("persisted")).toBe(false);
  });

  it("keeps any number of assistant responses without process content unchanged", () => {
    const projection = projectCompletedTurnProcesses({
      items: [user("u1"), assistant("progress"), assistant("conclusion"), assistant("persisted")],
      isTurnActive: false,
    });

    expect(projection.byItemId.size).toBe(0);
  });

  it("collapses operational content even when text responses are interleaved", () => {
    const projection = projectCompletedTurnProcesses({
      items: [
        user("u1"),
        thought("thinking"),
        assistant("progress"),
        thought("checking"),
        assistant("conclusion"),
        assistant("persisted"),
      ],
      isTurnActive: false,
    });

    expect(Array.from(projection.byItemId.keys())).toEqual(["thinking", "checking"]);
    expect(projection.byItemId.get("thinking")?.itemCount).toBe(2);
    expect(projection.byItemId.get("checking")?.role).toBe("content");
    expect(projection.byItemId.has("progress")).toBe(false);
    expect(projection.byItemId.has("conclusion")).toBe(false);
    expect(projection.byItemId.has("persisted")).toBe(false);
  });

  it("does not collapse the latest turn while it is running", () => {
    const projection = projectCompletedTurnProcesses({
      items: [
        user("u1"),
        thought("old-process"),
        assistant("old-final"),
        user("u2"),
        thought("live-process"),
        assistant("live-progress"),
      ],
      isTurnActive: true,
    });

    expect(projection.byItemId.has("old-process")).toBe(true);
    expect(projection.byItemId.has("live-process")).toBe(false);
    expect(projection.byItemId.has("live-progress")).toBe(false);
  });
});
