import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  EncryptedAgentShareSchema,
  openAgentShare,
  type AgentShareSnapshot,
} from "@getpaseo/protocol/agent-share";
import type { AgentTimelineItem } from "@getpaseo/protocol/agent-types";

export const Route = createFileRoute("/share/$shareId")({
  head: () => ({
    meta: [{ title: "Shared Paseo session" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: SharedAgentSessionPage,
});

const MARKDOWN_PLUGINS = [remarkGfm];

interface ShareErrorState {
  kind: "error";
  message: string;
}

interface ShareReadyState {
  kind: "ready";
  snapshot: AgentShareSnapshot;
}

type ShareState = { kind: "loading" } | ShareErrorState | ShareReadyState;

function describeToolCall(item: Extract<AgentTimelineItem, { type: "tool_call" }>): string {
  const detail = item.detail;
  if (detail.type === "shell") return detail.command;
  if (detail.type === "read") return detail.filePath;
  if (detail.type === "edit" || detail.type === "write") return detail.filePath;
  if (detail.type === "search") return detail.query;
  if (detail.type === "fetch") return detail.url;
  if (detail.type === "plan") return detail.text;
  if (detail.type === "plain_text") return detail.text ?? "";
  if (detail.type === "sub_agent") return detail.description ?? detail.log;
  if (detail.type === "worktree_setup") return detail.log;
  return "";
}

function TimelineEntry({ item }: { item: AgentTimelineItem }) {
  if (item.type === "user_message" || item.type === "assistant_message") {
    return (
      <article
        className={`share-message share-message-${item.type === "user_message" ? "user" : "assistant"}`}
      >
        <div className="share-message-role">
          {item.type === "user_message" ? "You" : "Assistant"}
        </div>
        <div className="share-markdown">
          <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{item.text}</ReactMarkdown>
        </div>
      </article>
    );
  }
  if (item.type === "reasoning") {
    return (
      <details className="share-detail">
        <summary>Reasoning</summary>
        <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS}>{item.text}</ReactMarkdown>
      </details>
    );
  }
  if (item.type === "tool_call") {
    const description = describeToolCall(item);
    return (
      <details className="share-detail">
        <summary>
          {item.name} · {item.status}
        </summary>
        {description ? <pre>{description}</pre> : null}
      </details>
    );
  }
  if (item.type === "error") return <div className="share-error-entry">{item.message}</div>;
  if (item.type === "todo") {
    return (
      <ul className="share-todos">
        {item.items.map((todo) => (
          <li key={todo.id ?? todo.text}>
            {todo.completed ? "✓" : "○"} {todo.text}
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

function SharedAgentSessionPage() {
  const { shareId } = Route.useParams();
  const [state, setState] = useState<ShareState>({ kind: "loading" });

  useEffect(() => {
    const key = window.location.hash.slice(1);
    if (!key) {
      setState({ kind: "error", message: "This share link is missing its decryption key." });
      return;
    }
    const abort = new AbortController();
    void fetch(`/api/shares/${shareId}`, { signal: abort.signal })
      .then(async (response) => {
        if (response.status === 404)
          throw new Error("This shared session has expired or was not found.");
        if (!response.ok) throw new Error("Unable to load this shared session.");
        const envelope = EncryptedAgentShareSchema.parse(await response.json());
        try {
          return await openAgentShare(envelope, key);
        } catch {
          throw new Error("This share link is invalid or has the wrong decryption key.");
        }
      })
      .then((snapshot) => setState({ kind: "ready", snapshot }))
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : "Unable to open this shared session.";
        setState({ kind: "error", message });
      });
    return () => abort.abort();
  }, [shareId]);

  return (
    <main className="share-page">
      <header className="share-header">
        <a href="/" className="share-brand">
          Paseo
        </a>
        <span className="share-readonly">Read-only snapshot</span>
      </header>
      {state.kind === "loading" ? <p className="share-state">Decrypting session…</p> : null}
      {state.kind === "error" ? (
        <p className="share-state share-state-error">{state.message}</p>
      ) : null}
      {state.kind === "ready" ? (
        <section className="share-session">
          <h1>{state.snapshot.title}</h1>
          <p className="share-timestamp">
            Shared {new Date(state.snapshot.sharedAt).toLocaleString()}
          </p>
          <div className="share-timeline">
            {state.snapshot.entries.map((entry) => (
              <TimelineEntry key={`${entry.seqStart}-${entry.seqEnd}`} item={entry.item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
