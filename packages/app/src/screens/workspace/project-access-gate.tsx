import { useCallback, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { LockKeyhole } from "lucide-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/headers/screen-header";
import { SidebarMenuToggle } from "@/components/headers/menu-header";
import { EditingTextInput } from "@/components/ui/text-input";
import { useHostRuntimeClient } from "@/runtime/host-runtime";
import { useProjectAccessStore } from "@/stores/project-access-store";

const ThemedLockKeyhole = withUnistyles(LockKeyhole, (theme) => ({
  color: theme.colors.foregroundMuted,
}));
const ThemedTextInput = withUnistyles(EditingTextInput, (theme) => ({
  placeholderTextColor: theme.colors.foregroundMuted,
}));

export function ProjectAccessGate({
  serverId,
  projectId,
  projectName,
}: {
  serverId: string;
  projectId: string;
  projectName: string;
}) {
  const client = useHostRuntimeClient(serverId);
  const unlock = useProjectAccessStore((state) => state.unlock);
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const headerLeft = useMemo(() => <SidebarMenuToggle />, []);

  const handleAccessCodeChange = useCallback((value: string) => {
    setAccessCode(value);
    setError(null);
  }, []);

  const handleUnlock = useCallback(async () => {
    if (!client || !accessCode.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      await client.unlockProject(projectId, accessCode.trim());
      unlock(serverId, projectId);
      setAccessCode("");
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "项目访问码不正确");
    } finally {
      setPending(false);
    }
  }, [accessCode, client, pending, projectId, serverId, unlock]);
  const handleUnlockPress = useCallback(() => void handleUnlock(), [handleUnlock]);

  return (
    <View style={styles.container}>
      <ScreenHeader left={headerLeft} />
      <View style={styles.content}>
        <ThemedLockKeyhole size={32} />
        <Text style={styles.title}>{projectName}</Text>
        <Text style={styles.description}>输入项目访问码后才能查看会话或继续对话。</Text>
        <ThemedTextInput
          initialValue=""
          onChangeText={handleAccessCodeChange}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="项目访问码"
          editable={!pending}
          onSubmitEditing={handleUnlockPress}
          style={styles.input}
          testID="project-access-code-input"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          onPress={handleUnlockPress}
          disabled={!client || !accessCode.trim() || pending}
          testID="project-access-code-submit"
        >
          {pending ? "正在解锁..." : "解锁"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.surface0 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[6],
  },
  title: { color: theme.colors.foreground, fontSize: theme.fontSize.xl },
  description: { color: theme.colors.foregroundMuted, textAlign: "center" },
  input: {
    width: "100%",
    maxWidth: 360,
    color: theme.colors.foreground,
    backgroundColor: theme.colors.surface1,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
  },
  error: { color: theme.colors.destructive, fontSize: theme.fontSize.sm },
}));
