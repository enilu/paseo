import { useCallback, useMemo, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { AdaptiveModalSheet } from "@/components/adaptive-modal-sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createAgentShare, type CreateAgentShareInput } from "./create";
import { ShareLinkModal } from "./share-link-modal";

type ShareState =
  | { kind: "configure"; allowCollaboration: boolean; error: string | null }
  | { kind: "creating"; allowCollaboration: boolean }
  | { kind: "ready"; url: string };

type ShareAction =
  | { type: "configure"; allowCollaboration: boolean }
  | { type: "create" }
  | { type: "created"; url: string }
  | { type: "failed"; error: string };

function reduceShare(state: ShareState, action: ShareAction): ShareState {
  switch (action.type) {
    case "configure":
      if (state.kind !== "configure") return state;
      return { kind: "configure", allowCollaboration: action.allowCollaboration, error: null };
    case "create":
      if (state.kind !== "configure") return state;
      return { kind: "creating", allowCollaboration: state.allowCollaboration };
    case "created":
      return { kind: "ready", url: action.url };
    case "failed":
      if (state.kind !== "creating") return state;
      return {
        kind: "configure",
        allowCollaboration: state.allowCollaboration,
        error: action.error,
      };
  }
}

interface ShareSessionModalProps {
  agentId: string;
  client: CreateAgentShareInput["client"];
  onClose: () => void;
}

export function ShareSessionModal({ agentId, client, onClose }: ShareSessionModalProps) {
  const { t } = useTranslation();
  const header = useMemo(() => ({ title: t("agentPanel.share.title") }), [t]);
  const [state, dispatch] = useReducer(reduceShare, {
    kind: "configure",
    allowCollaboration: false,
    error: null,
  });
  const isCreating = state.kind === "creating";

  const close = useCallback(() => {
    if (!isCreating) onClose();
  }, [isCreating, onClose]);
  const configure = useCallback((allowCollaboration: boolean) => {
    dispatch({ type: "configure", allowCollaboration });
  }, []);
  const create = useCallback(async () => {
    if (state.kind !== "configure") return;
    dispatch({ type: "create" });
    try {
      const url = await createAgentShare({
        agentId,
        client,
        allowCollaboration: state.allowCollaboration,
      });
      dispatch({ type: "created", url });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("agentPanel.share.failed");
      dispatch({ type: "failed", error: message });
    }
  }, [agentId, client, state, t]);

  if (state.kind === "ready") return <ShareLinkModal url={state.url} onClose={onClose} />;

  return (
    <AdaptiveModalSheet visible header={header} onClose={close} testID="agent-share-options">
      <Text style={styles.description}>{t("agentPanel.share.warning")}</Text>
      <View style={styles.option}>
        <Text style={styles.label}>{t("agentPanel.share.allowCollaboration")}</Text>
        <Switch
          value={state.allowCollaboration}
          onValueChange={configure}
          disabled={isCreating}
          accessibilityLabel={t("agentPanel.share.allowCollaboration")}
          testID="agent-share-collaboration"
        />
      </View>
      {state.allowCollaboration ? (
        <Text style={styles.description}>{t("agentPanel.share.collaborationWarning")}</Text>
      ) : null}
      {state.kind === "configure" && state.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {state.error}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button variant="secondary" onPress={close} disabled={isCreating}>
          {t("common.actions.cancel")}
        </Button>
        <Button
          variant="default"
          onPress={create}
          disabled={isCreating}
          testID="agent-share-create"
        >
          {isCreating ? t("agentPanel.share.creating") : t("agentPanel.share.confirm")}
        </Button>
      </View>
    </AdaptiveModalSheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  description: { color: theme.colors.foregroundMuted, fontSize: theme.fontSize.base },
  option: { flexDirection: "row", alignItems: "center", gap: theme.spacing[3] },
  label: { flex: 1, color: theme.colors.foreground, fontSize: theme.fontSize.base },
  error: { color: theme.colors.destructive, fontSize: theme.fontSize.base },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing[3] },
}));
