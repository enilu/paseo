import type { StreamItem } from "@/types/stream";

function isCollapsibleProcessItem(item: StreamItem): boolean {
  return item.kind !== "user_message" && item.kind !== "assistant_message";
}

export interface TurnProcessItemProjection {
  turnId: string;
  role: "anchor" | "content";
  itemCount: number;
}

export interface CompletedTurnProcessProjection {
  byItemId: Map<string, TurnProcessItemProjection>;
}

export function projectCompletedTurnProcesses(input: {
  items: StreamItem[];
  isTurnActive: boolean;
}): CompletedTurnProcessProjection {
  const byItemId = new Map<string, TurnProcessItemProjection>();
  const userIndexes = input.items.flatMap((item, index) =>
    item.kind === "user_message" ? [index] : [],
  );

  for (const [turnIndex, userIndex] of userIndexes.entries()) {
    const isLatestTurn = turnIndex === userIndexes.length - 1;
    if (input.isTurnActive && isLatestTurn) {
      continue;
    }

    const nextUserIndex = userIndexes[turnIndex + 1] ?? input.items.length;
    const turnItems = input.items.slice(userIndex + 1, nextUserIndex);
    const processItems = turnItems.filter(isCollapsibleProcessItem);
    for (const [processIndex, item] of processItems.entries()) {
      byItemId.set(item.id, {
        turnId: input.items[userIndex].id,
        role: processIndex === 0 ? "anchor" : "content",
        itemCount: processItems.length,
      });
    }
  }

  return { byItemId };
}
