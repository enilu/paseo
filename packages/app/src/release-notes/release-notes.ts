export interface LocalizedReleaseNoteText {
  en: string;
  zhCN: string;
}

export interface ReleaseNoteFeature {
  title: LocalizedReleaseNoteText;
  description: LocalizedReleaseNoteText;
}

export interface ReleaseNote {
  id: string;
  version: string;
  releasedAt: string;
  title: LocalizedReleaseNoteText;
  summary: LocalizedReleaseNoteText;
  features: readonly ReleaseNoteFeature[];
}

/** Add intentional releases at the top. Git commits never update this list automatically. */
export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    id: "jiaxing-2026-08-30",
    version: "Jiaxing",
    releasedAt: "2026-08-30",
    title: {
      en: "Workspace access and personal enhancements",
      zhCN: "Workspace 访问保护与个人增强",
    },
    summary: {
      en: "The first Jiaxing release based on the latest upstream main branch.",
      zhCN: "基于最新上游 main 分支整理的首个 Jiaxing 版本。",
    },
    features: [
      {
        title: { en: "Project access codes", zhCN: "项目访问码" },
        description: {
          en: "Keep projects visible while requiring an access code to reveal their workspaces or create new ones.",
          zhCN: "项目名称仍在侧栏可见，输入访问码后才能查看其 Workspace 或新建 Workspace。",
        },
      },
      {
        title: { en: "Workspace access codes", zhCN: "Workspace 访问码" },
        description: {
          en: "Keep workspace titles visible while requiring an access code for timelines, messages, and new agents.",
          zhCN: "标题仍在侧栏可见，查看时间线、继续对话和创建 Agent 前需要输入访问码。",
        },
      },
      {
        title: { en: "Encrypted agent sharing", zhCN: "加密会话分享" },
        description: {
          en: "Create encrypted agent-session links that can be opened without signing in to Paseo.",
          zhCN: "生成加密的 Agent 会话链接，无需登录 Paseo 即可打开查看。",
        },
      },
      {
        title: { en: "File preview downloads", zhCN: "文件预览下载" },
        description: {
          en: "Download the current file directly from the file preview toolbar.",
          zhCN: "可以直接从文件预览工具栏下载当前文件。",
        },
      },
      {
        title: { en: "Custom backgrounds", zhCN: "自定义背景" },
        description: {
          en: "Choose a custom background and adjust its opacity and blur in Appearance settings.",
          zhCN: "在外观设置中选择自定义背景，并调整透明度与模糊程度。",
        },
      },
      {
        title: { en: "Daemon password prompt", zhCN: "Daemon 密码输入" },
        description: {
          en: "Prompt for a configured daemon password when connecting to a protected host.",
          zhCN: "连接受密码保护的 Host 时，前端会提示输入已配置的 daemon 密码。",
        },
      },
      {
        title: { en: "Windows file links", zhCN: "Windows 文件链接" },
        description: {
          en: "Open encoded Windows file links containing spaces or non-ASCII characters.",
          zhCN: "支持打开包含空格、中文或 URL 编码字符的 Windows 文件链接。",
        },
      },
      {
        title: { en: "Exact absolute project paths", zhCN: "精确绝对项目路径" },
        description: {
          en: "Open exact absolute project paths, including directories outside the home folder.",
          zhCN: "支持打开精确的绝对项目路径，包括 Home 目录之外的目录。",
        },
      },
      {
        title: { en: "Prompt-language workspace titles", zhCN: "保持提示词语言的标题" },
        description: {
          en: "Generated workspace titles preserve the language used in the original prompt.",
          zhCN: "自动生成的 Workspace 标题会保持原始提示词所使用的语言。",
        },
      },
    ],
  },
];

export function releaseNoteText(text: LocalizedReleaseNoteText, language: string): string {
  return language.toLowerCase().startsWith("zh") ? text.zhCN : text.en;
}
