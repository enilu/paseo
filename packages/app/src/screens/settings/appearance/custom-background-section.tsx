import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { ImagePlus, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { Button } from "@/components/ui/button";
import {
  MAX_BACKGROUND_BLUR,
  MAX_BACKGROUND_OPACITY,
  MIN_BACKGROUND_BLUR,
  MIN_BACKGROUND_OPACITY,
  validateCustomBackgroundFile,
} from "@/custom-background/model";
import { useCustomBackground } from "@/custom-background/context";
import {
  removeCustomBackground,
  removeReplacedCustomBackground,
  saveCustomBackground,
} from "@/custom-background/service";
import { useFilePicker } from "@/hooks/use-file-picker";
import { useAppSettings } from "@/hooks/use-settings";
import { SettingsSection } from "@/screens/settings/settings-section";
import { settingsStyles } from "@/styles/settings";
import type { Theme } from "@/styles/theme";

const ThemedImagePlus = withUnistyles(ImagePlus);
const mutedIconMapping = (theme: Theme) => ({ color: theme.colors.foregroundMuted });

function clampDraft(value: string, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

export function CustomBackgroundSection() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppSettings();
  const { pickFiles } = useFilePicker();
  const { url: backgroundUrl } = useCustomBackground();
  const backgroundSource = useMemo(
    () => (backgroundUrl ? { uri: backgroundUrl } : null),
    [backgroundUrl],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [opacityDraft, setOpacityDraft] = useState(
    String(Math.round(settings.backgroundOpacity * 100)),
  );
  const [blurDraft, setBlurDraft] = useState(String(settings.backgroundBlur));

  useEffect(() => {
    setOpacityDraft(String(Math.round(settings.backgroundOpacity * 100)));
  }, [settings.backgroundOpacity]);
  useEffect(() => {
    setBlurDraft(String(settings.backgroundBlur));
  }, [settings.backgroundBlur]);

  const handleChoose = useCallback(async () => {
    setIsSaving(true);
    try {
      const files = await pickFiles();
      const file = files?.[0];
      if (!file) {
        return;
      }
      const validationError = validateCustomBackgroundFile(file);
      if (validationError) {
        Alert.alert(
          t("settings.appearance.background.errorTitle"),
          t(`settings.appearance.background.errors.${validationError}`),
        );
        return;
      }
      const previousAttachment = settings.customBackground;
      const attachment = await saveCustomBackground(file);
      await updateSettings({ customBackground: attachment });
      await removeReplacedCustomBackground(previousAttachment, attachment);
    } catch (error) {
      console.error("[CustomBackground] Failed to save background", error);
      Alert.alert(
        t("settings.appearance.background.errorTitle"),
        t("settings.appearance.background.errors.saveFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }, [pickFiles, settings.customBackground, t, updateSettings]);

  const handleRemove = useCallback(async () => {
    const attachment = settings.customBackground;
    try {
      await updateSettings({ customBackground: null });
      await removeCustomBackground(attachment);
    } catch (error) {
      console.error("[CustomBackground] Failed to remove background", error);
      Alert.alert(
        t("settings.appearance.background.errorTitle"),
        t("settings.appearance.background.errors.removeFailed"),
      );
    }
  }, [settings.customBackground, t, updateSettings]);

  const commitOpacity = useCallback(() => {
    const fallback = Math.round(settings.backgroundOpacity * 100);
    const nextPercent = clampDraft(
      opacityDraft,
      MIN_BACKGROUND_OPACITY * 100,
      MAX_BACKGROUND_OPACITY * 100,
      fallback,
    );
    setOpacityDraft(String(Math.round(nextPercent)));
    void updateSettings({ backgroundOpacity: nextPercent / 100 });
  }, [opacityDraft, settings.backgroundOpacity, updateSettings]);

  const commitBlur = useCallback(() => {
    const next = clampDraft(
      blurDraft,
      MIN_BACKGROUND_BLUR,
      MAX_BACKGROUND_BLUR,
      settings.backgroundBlur,
    );
    setBlurDraft(String(Math.round(next)));
    void updateSettings({ backgroundBlur: Math.round(next) });
  }, [blurDraft, settings.backgroundBlur, updateSettings]);

  const handleOpacityDraftChange = useCallback((value: string) => {
    setOpacityDraft(value.replace(/[^\d]/g, ""));
  }, []);

  const handleBlurDraftChange = useCallback((value: string) => {
    setBlurDraft(value.replace(/[^\d]/g, ""));
  }, []);

  return (
    <SettingsSection title={t("settings.appearance.background.title")}>
      <View style={settingsStyles.card}>
        <View style={styles.previewRow}>
          <View style={styles.previewFrame}>
            {backgroundSource ? (
              <Image source={backgroundSource} style={imageFillStyle} contentFit="cover" />
            ) : (
              <View style={styles.emptyPreview}>
                <ThemedImagePlus size={28} uniProps={mutedIconMapping} />
              </View>
            )}
          </View>
          <View style={styles.previewContent}>
            <Text style={settingsStyles.rowTitle}>
              {settings.customBackground
                ? t("settings.appearance.background.configured")
                : t("settings.appearance.background.notConfigured")}
            </Text>
            <Text style={settingsStyles.rowHint}>
              {t("settings.appearance.background.description")}
            </Text>
            <View style={styles.actions}>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={ImagePlus}
                loading={isSaving}
                onPress={handleChoose}
              >
                {settings.customBackground
                  ? t("settings.appearance.background.replace")
                  : t("settings.appearance.background.choose")}
              </Button>
              {settings.customBackground ? (
                <Button size="sm" variant="ghost" leftIcon={Trash2} onPress={handleRemove}>
                  {t("settings.appearance.background.remove")}
                </Button>
              ) : null}
            </View>
          </View>
        </View>
        {settings.customBackground ? (
          <>
            <View style={[settingsStyles.row, settingsStyles.rowBorder]}>
              <View style={settingsStyles.rowContent}>
                <Text style={settingsStyles.rowTitle}>
                  {t("settings.appearance.background.opacity")}
                </Text>
                <Text style={settingsStyles.rowHint}>
                  {t("settings.appearance.background.opacityHint")}
                </Text>
              </View>
              <View style={styles.numericField}>
                <TextInput
                  value={opacityDraft}
                  onChangeText={handleOpacityDraftChange}
                  onBlur={commitOpacity}
                  onSubmitEditing={commitOpacity}
                  keyboardType="number-pad"
                  style={styles.numericInput}
                  accessibilityLabel={t("settings.appearance.background.opacity")}
                />
                <Text style={styles.unit}>%</Text>
              </View>
            </View>
            <View style={[settingsStyles.row, settingsStyles.rowBorder]}>
              <View style={settingsStyles.rowContent}>
                <Text style={settingsStyles.rowTitle}>
                  {t("settings.appearance.background.blur")}
                </Text>
                <Text style={settingsStyles.rowHint}>
                  {t("settings.appearance.background.blurHint")}
                </Text>
              </View>
              <View style={styles.numericField}>
                <TextInput
                  value={blurDraft}
                  onChangeText={handleBlurDraftChange}
                  onBlur={commitBlur}
                  onSubmitEditing={commitBlur}
                  keyboardType="number-pad"
                  style={styles.numericInput}
                  accessibilityLabel={t("settings.appearance.background.blur")}
                />
                <Text style={styles.unit}>px</Text>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create((theme) => ({
  previewRow: {
    flexDirection: { xs: "column", md: "row" },
    gap: theme.spacing[4],
    padding: theme.spacing[4],
  },
  previewFrame: {
    width: { xs: "100%", md: 180 },
    height: 112,
    overflow: "hidden",
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface2,
  },
  emptyPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewContent: {
    flex: 1,
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
    marginTop: theme.spacing[3],
  },
  numericField: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  numericInput: {
    width: 64,
    minHeight: 36,
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface2,
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    textAlign: "right",
  },
  unit: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
}));

const imageFillStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;
