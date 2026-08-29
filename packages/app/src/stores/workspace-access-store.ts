import { create } from "zustand";

interface WorkspaceAccessState {
  unlockedKeys: Set<string>;
  unlock: (serverId: string, workspaceId: string) => void;
}

function workspaceAccessKey(serverId: string, workspaceId: string): string {
  return `${serverId}:${workspaceId}`;
}

export const useWorkspaceAccessStore = create<WorkspaceAccessState>((set) => ({
  unlockedKeys: new Set(),
  unlock: (serverId, workspaceId) =>
    set((state) => ({
      unlockedKeys: new Set(state.unlockedKeys).add(workspaceAccessKey(serverId, workspaceId)),
    })),
}));

export function useIsWorkspaceUnlocked(serverId: string, workspaceId: string): boolean {
  return useWorkspaceAccessStore((state) =>
    state.unlockedKeys.has(workspaceAccessKey(serverId, workspaceId)),
  );
}
