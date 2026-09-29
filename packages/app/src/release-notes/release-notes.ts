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
    id: "suzhou-2026-09-29",
    version: "Suzhou",
    releasedAt: "2026-09-29",
    title: {
      en: "Upstream 0.10.0-beta.1 foundation",
      zhCN: "同步上游 0.10.0-beta.1",
    },
    summary: {
      en: "The Suzhou release integrates upstream 0.10.0-beta.1 into the local line, with a new Codex history setting and more reliable assistant file downloads.",
      zhCN: "Suzhou 版本将上游 0.10.0-beta.1 整合进本地分支，并新增 Codex 历史显示设置与更可靠的助手文件下载。",
    },
    features: [
      {
        title: { en: "Reorganized Settings pages", zhCN: "设置页面重组" },
        description: {
          en: "Settings are split into General, Sidebar, Chat, Terminal, Browser, and Open location pages.",
          zhCN: "设置拆分为常规、侧栏、聊天、终端、浏览器和打开位置六个页面。",
        },
      },
      {
        title: { en: "OpenCode v2 support", zhCN: "支持 OpenCode v2" },
        description: {
          en: "OpenCode v2 is detected from the installed version and selected automatically.",
          zhCN: "根据已安装的 opencode 版本自动识别并选用 OpenCode v2。",
        },
      },
      {
        title: { en: "Stronger daemon password protection", zhCN: "Daemon 密码保护增强" },
        description: {
          en: "Relay connections verify the daemon password, Add host and pairing flows accept it, and same-machine connections skip the prompt.",
          zhCN: "Relay 连接会校验 Daemon 密码，添加 Host 与配对流程支持输入密码，同机连接不再重复询问。",
        },
      },
      {
        title: { en: "More Pi extensions", zhCN: "更多 Pi 扩展" },
        description: {
          en: "Pi chats gain task lists, subagent runs, and one-question ask-user dialogs from the Pi extension ecosystem.",
          zhCN: "Pi 会话可使用任务列表、Subagent 运行和一次性提问对话等 Pi 扩展能力。",
        },
      },
      {
        title: { en: "Codex native history setting", zhCN: "Codex 原生历史显示设置" },
        description: {
          en: "A setting controls whether Import session includes Codex native history.",
          zhCN: "新增设置项，控制“导入会话”是否包含 Codex 原生历史记录。",
        },
      },
      {
        title: { en: "Assistant file downloads across transports", zhCN: "跨传输方式下载助手文件" },
        description: {
          en: "Assistant files download correctly when the frontend and daemon use different transports.",
          zhCN: "前端与 Daemon 使用不同传输方式时，助手文件也能正常下载。",
        },
      },
    ],
  },
  {
    id: "huzhou-2026-09-06",
    version: "Huzhou",
    releasedAt: "2026-09-06",
    title: {
      en: "Latest upstream capabilities and stability",
      zhCN: "同步最新上游能力与稳定性改进",
    },
    summary: {
      en: "The Huzhou release brings Jiaxing's personal enhancements onto the latest Paseo upstream foundation.",
      zhCN: "Huzhou 版本将 Jiaxing 的个人增强能力整合到最新 Paseo 上游基础之上。",
    },
    features: [
      {
        title: { en: "Plugin-provided agents", zhCN: "插件提供编码 Agent" },
        description: {
          en: "Plugins can provide coding agents, live timeline rows, and client slash commands.",
          zhCN: "插件现在可以提供编码 Agent、实时 Timeline 行和客户端斜杠命令。",
        },
      },
      {
        title: { en: "Smoother long-running timelines", zhCN: "长会话 Timeline 更流畅" },
        description: {
          en: "Long agent timelines remain responsive across autonomous turns and large streamed responses.",
          zhCN: "Agent 长时间自主运行及输出大量流式内容时，Timeline 仍能保持流畅响应。",
        },
      },
      {
        title: { en: "Provider notifications and tool controls", zhCN: "Provider 通知与工具控制" },
        description: {
          en: "Provider notifications appear in the timeline, with per-provider control over available Paseo tools.",
          zhCN: "Provider 通知会显示在 Timeline 中，并可分别控制各 Provider 可使用的 Paseo 工具。",
        },
      },
      {
        title: { en: "Faster session import", zhCN: "更便捷的会话导入" },
        description: {
          en: "Session import is easier to reach and better at finding useful sessions while hiding empty ACP sessions.",
          zhCN: "会话导入入口更易访问，也能更准确地找到有效会话并隐藏空的 ACP 会话。",
        },
      },
      {
        title: { en: "Improved diagrams and diffs", zhCN: "图表与差异查看增强" },
        description: {
          en: "Mermaid diagrams support a fullscreen web viewer, while file headers and working comparisons stay synchronized in diffs.",
          zhCN: "Web 端 Mermaid 图表支持全屏查看，Diff 文件头和工作区比较结果也能保持同步。",
        },
      },
      {
        title: { en: "Agent and desktop reliability", zhCN: "Agent 与桌面端可靠性" },
        description: {
          en: "Agent reloads, nested subagent ownership, provider configuration reloads, and macOS desktop updates are more reliable.",
          zhCN: "改进 Agent 重载、嵌套 Subagent 归属、Provider 配置重载及 macOS 桌面更新的可靠性。",
        },
      },
    ],
  },
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
