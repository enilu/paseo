import { useCallback, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { LockKeyhole } from "lucide-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { Button } from "@/components/ui/button";
import { EditingTextInput } from "@/components/ui/text-input";
import { useHostRuntimeClient } from "@/runtime/host-runtime";
import { useProjectAccessStore } from "@/stores/project-access-store";

const ThemedLock = withUnistyles(LockKeyhole, (theme) => ({
  color: theme.colors.foregroundMuted,
}));
const ThemedInput = withUnistyles(EditingTextInput, (theme) => ({
  placeholderTextColor: theme.colors.foregroundMuted,
}));

export function ProjectAccessDialog({
  serverId,
  projectId,
  projectName,
  visible,
  onClose,
}: {
  serverId: string;
  projectId: string;
  projectName: string;
  visible: boolean;
  onClose: () => void;
}) {
  const client = useHostRuntimeClient(serverId);
  const unlock = useProjectAccessStore((state) => state.unlock);
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleChange = useCallback((value: string) => {
    setAccessCode(value);
    setError(null);
  }, []);
  const handleUnlock = useCallback(() => {
    if (!client || !accessCode.trim() || pending) return;
    setPending(true);
    setError(null);
    void client
      .unlockProject(projectId, accessCode.trim())
      .then(() => {
        unlock(serverId, projectId);
        setAccessCode("");
        onClose();
        return null;
      })
      .catch((unlockError) => {
        setError(unlockError instanceof Error ? unlockError.message : "访问码不正确");
      })
      .finally(() => setPending(false));
  }, [accessCode, client, onClose, pending, projectId, serverId, unlock]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay} testID="project-access-dialog">
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.panel}>
          <ThemedLock size={28} />
          <Text style={styles.title}>{projectName}</Text>
          <Text style={styles.description}>输入项目访问码后才能查看会话或新建会话。</Text>
          <ThemedInput
            initialValue=""
            onChangeText={handleChange}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!pending}
            placeholder="项目访问码"
            onSubmitEditing={handleUnlock}
            style={styles.input}
            testID="project-access-code-input"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button variant="ghost" onPress={onClose} disabled={pending}>
              取消
            </Button>
            <Button
              onPress={handleUnlock}
              disabled={!client || !accessCode.trim() || pending}
              testID="project-access-code-submit"
            >
              {pending ? "正在解锁..." : "解锁"}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: theme.spacing[4] },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.5)" },
  panel: {
    width: "100%",
    maxWidth: 400,
    gap: theme.spacing[3],
    padding: theme.spacing[6],
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface1,
  },
  title: { color: theme.colors.foreground, fontSize: theme.fontSize.lg, fontWeight: "600" },
  description: { color: theme.colors.foregroundMuted },
  input: {
    color: theme.colors.foreground,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
  },
  error: { color: theme.colors.destructive, fontSize: theme.fontSize.sm },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: theme.spacing[2] },
}));
