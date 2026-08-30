import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native-unistyles";
import { SettingsSection } from "@/screens/settings/settings-section";
import { settingsStyles } from "@/styles/settings";
import { RELEASE_NOTES, releaseNoteText } from "@/release-notes/release-notes";

export function ReleaseNotesPage() {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;

  return (
    <View testID="release-notes-page">
      <Text style={styles.introduction}>{t("settings.releaseNotes.description")}</Text>
      {RELEASE_NOTES.map((release) => (
        <SettingsSection
          key={release.id}
          title={`${release.version} · ${release.releasedAt}`}
          testID={`release-note-${release.id}`}
        >
          <View style={settingsStyles.card}>
            <View style={styles.releaseHeader}>
              <Text style={styles.releaseTitle}>{releaseNoteText(release.title, language)}</Text>
              <Text style={styles.releaseSummary}>
                {releaseNoteText(release.summary, language)}
              </Text>
            </View>
            {release.features.map((feature, index) => (
              <View
                key={feature.title.en}
                style={[styles.feature, index > 0 ? settingsStyles.rowBorder : null]}
              >
                <View style={styles.bullet} />
                <View style={styles.featureCopy}>
                  <Text style={settingsStyles.rowTitle}>
                    {releaseNoteText(feature.title, language)}
                  </Text>
                  <Text style={settingsStyles.rowHint}>
                    {releaseNoteText(feature.description, language)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </SettingsSection>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  introduction: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.base,
    lineHeight: theme.fontSize.base * 1.5,
    marginBottom: theme.spacing[6],
  },
  releaseHeader: {
    paddingVertical: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  releaseTitle: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
  },
  releaseSummary: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: theme.fontSize.sm * 1.5,
    marginTop: theme.spacing[2],
  },
  feature: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  bullet: {
    width: 7,
    height: 7,
    marginTop: 7,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
  },
  featureCopy: {
    flex: 1,
  },
}));
