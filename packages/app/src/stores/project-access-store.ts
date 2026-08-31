import { create } from "zustand";

interface ProjectAccessState {
  unlockedKeys: Set<string>;
  unlock: (serverId: string, projectId: string) => void;
}

export function projectAccessKey(serverId: string, projectId: string): string {
  return `${serverId}:${projectId}`;
}

export const useProjectAccessStore = create<ProjectAccessState>((set) => ({
  unlockedKeys: new Set(),
  unlock: (serverId, projectId) =>
    set((state) => ({
      unlockedKeys: new Set(state.unlockedKeys).add(projectAccessKey(serverId, projectId)),
    })),
}));

export function useIsProjectUnlocked(serverId: string, projectId: string): boolean {
  return useProjectAccessStore((state) =>
    state.unlockedKeys.has(projectAccessKey(serverId, projectId)),
  );
}
