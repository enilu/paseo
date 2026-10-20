import * as Clipboard from "expo-clipboard";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { AdaptiveModalSheet } from "@/components/adaptive-modal-sheet";
import { Button } from "@/components/ui/button";

interface ShareLinkModalProps {
  url: string;
  onClose: () => void;
}

export function ShareLinkModal({ url, onClose }: ShareLinkModalProps) {
  const { t } = useTranslation();
  const header = useMemo(() => ({ title: t("agentPanel.share.action") }), [t]);
  const [copyStatus, setCopyStatus] = useState<"idle" | "pending" | "copied" | "failed">("idle");

  const copy = useCallback(async () => {
    if (copyStatus === "pending") return;
    setCopyStatus("pending");
    try {
      await Clipboard.setStringAsync(url);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }, [copyStatus, url]);

  return (
    <AdaptiveModalSheet visible header={header} onClose={onClose} testID="agent-share-success">
      <Text selectable style={styles.url} testID="agent-share-url">
        {url}
      </Text>
      {copyStatus === "copied" ? (
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          {t("agentPanel.share.copied")}
        </Text>
      ) : null}
      {copyStatus === "failed" ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t("agentPanel.share.copyFailed")}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button variant="secondary" onPress={onClose} testID="agent-share-close">
          {t("common.actions.close")}
        </Button>
        <Button
          variant="default"
          onPress={copy}
          disabled={copyStatus === "pending"}
          testID="agent-share-copy"
        >
          {t("common.actions.copy")}
        </Button>
      </View>
    </AdaptiveModalSheet>
  );
}

const styles = StyleSheet.create((theme) => ({
  url: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
  },
  status: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.base,
  },
  error: {
    color: theme.colors.destructive,
    fontSize: theme.fontSize.base,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing[3],
  },
}));
