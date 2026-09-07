import { useCallback, useMemo } from "react";
import { useHosts, useHostRuntimeClient, useHostRuntimeSnapshot } from "@/runtime/host-runtime";
import { useDownloadStore } from "@/stores/download-store";
import { useFileExplorerActions } from "@/hooks/use-file-explorer-actions";
import { i18n } from "@/i18n/i18next";

interface UseFileDownloadParams {
  serverId: string;
  workspaceId?: string | null;
  workspaceRoot: string;
}

/**
 * Returns a stable callback that downloads a single workspace file by its
 * workspace-relative path. Shared by the file explorer tree and the git diff
 * pane and assistant messages so every surface uses the same download store.
 * Direct TCP connections use short-lived HTTP tokens; tunneled and relay
 * connections use the authenticated WebSocket file channel.
 */
export function useFileDownload({
  serverId,
  workspaceId,
  workspaceRoot,
}: UseFileDownloadParams): (input: { fileName: string; path: string }) => void {
  const daemons = useHosts();
  const client = useHostRuntimeClient(serverId);
  const runtimeSnapshot = useHostRuntimeSnapshot(serverId);
  const daemonProfile = useMemo(
    () => daemons.find((daemon) => daemon.serverId === serverId),
    [daemons, serverId],
  );
  const normalizedWorkspaceRoot = useMemo(() => workspaceRoot.trim(), [workspaceRoot]);
  const workspaceScopeId = useMemo(
    () => workspaceId?.trim() || normalizedWorkspaceRoot,
    [normalizedWorkspaceRoot, workspaceId],
  );
  const { requestFileDownloadToken } = useFileExplorerActions({
    serverId,
    workspaceId,
    workspaceRoot: normalizedWorkspaceRoot,
  });
  const startDownload = useDownloadStore((state) => state.startDownload);

  return useCallback(
    ({ fileName, path }) => {
      if (!workspaceScopeId) {
        return;
      }
      void startDownload({
        serverId,
        scopeId: workspaceScopeId,
        fileName,
        path,
        daemonProfile,
        activeConnection: runtimeSnapshot?.activeConnection ?? null,
        requestFileDownloadToken: (targetPath) => requestFileDownloadToken(targetPath),
        readFile: async (targetPath) => {
          if (!client) {
            throw new Error(i18n.t("workspace.terminal.hostDisconnected"));
          }
          return client.readFile(normalizedWorkspaceRoot, targetPath);
        },
      });
    },
    [
      client,
      daemonProfile,
      normalizedWorkspaceRoot,
      requestFileDownloadToken,
      runtimeSnapshot?.activeConnection,
      serverId,
      startDownload,
      workspaceScopeId,
    ],
  );
}
