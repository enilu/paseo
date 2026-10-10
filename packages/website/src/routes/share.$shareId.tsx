import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  EncryptedAgentShareSchema,
  openAgentShare,
  sanitizeAgentShareEntries,
  type AgentShareSnapshot,
} from "@getpaseo/protocol/agent-share";
import type { AgentTimelineItem } from "@getpaseo/protocol/agent-types";
import type { AgentSnapshotPayload } from "@getpaseo/protocol/messages";
import {
  connectCollaborativeAgentShare,
  type CollaborativeAgentShareConnection,
  type CollaborativeShareConnectionState,
} from "../collaborative-agent-share";

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

function getShareStatusText(input: {
  collaborative: boolean;
  expired: boolean;
  connectionState: CollaborativeShareConnectionState;
}): string {
  if (!input.collaborative) return "Read-only snapshot";
  if (input.expired) return "Collaboration link expired";
  if (input.connectionState === "online") return "Connected to host";
  if (input.connectionState === "connecting") return "Connecting to host…";
  if (input.connectionState === "offline") return "Host is offline";
  return "Connection error";
}

function getComposerNote(input: {
  agentLoaded: boolean;
  waitingForOwner: boolean;
  agentBusy: boolean;
  connectionState: CollaborativeShareConnectionState;
}): string | null {
  if (input.connectionState === "online" && !input.agentLoaded) return "Loading session…";
  if (input.waitingForOwner) return "Waiting for the owner to answer a permission request.";
  if (input.agentBusy) return "The agent is working. You can continue when it finishes.";
  if (input.connectionState !== "online") {
    return "The owner’s Paseo host must be online to continue this session.";
  }
  return null;
}

function SharedSession({ snapshot }: { snapshot: AgentShareSnapshot }) {
  const [entries, setEntries] = useState(() => sanitizeAgentShareEntries(snapshot.entries));
  const [agent, setAgent] = useState<AgentSnapshotPayload | null>(null);
  const [connectionState, setConnectionState] =
    useState<CollaborativeShareConnectionState>("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [connection, setConnection] = useState<CollaborativeAgentShareConnection | null>(null);

  useEffect(() => {
    if (!snapshot.collaboration) return;
    const liveConnection = connectCollaborativeAgentShare(snapshot.collaboration, {
      onConnectionState: setConnectionState,
      onTimeline: (nextEntries, nextAgent) => {
        setEntries(nextEntries);
        setAgent(nextAgent);
        setConnectionError(null);
      },
      onError: setConnectionError,
    });
    setConnection(liveConnection);
    return () => liveConnection.close();
  }, [snapshot.collaboration]);

  const collaboration = snapshot.collaboration;
  const expired = collaboration ? Date.now() >= Date.parse(collaboration.expiresAt) : false;
  const waitingForOwner = (agent?.pendingPermissions.length ?? 0) > 0;
  const agentBusy = agent?.status === "running" || agent?.status === "initializing";
  const canSend =
    Boolean(collaboration) &&
    connectionState === "online" &&
    agent !== null &&
    !expired &&
    !waitingForOwner &&
    !agentBusy &&
    !sending &&
    draft.trim().length > 0;

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canSend || !connection) return;
      setSending(true);
      setConnectionError(null);
      try {
        await connection.sendMessage(draft);
        setDraft("");
      } catch (error) {
        setConnectionError(error instanceof Error ? error.message : "Unable to send message");
      } finally {
        setSending(false);
      }
    },
    [canSend, connection, draft],
  );
  const handleDraftChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(event.target.value);
  }, []);

  const statusText = getShareStatusText({
    collaborative: Boolean(collaboration),
    expired,
    connectionState,
  });
  const composerNote = getComposerNote({
    agentLoaded: agent !== null,
    waitingForOwner,
    agentBusy,
    connectionState,
  });

  return (
    <section className="share-session">
      <div className="share-session-heading">
        <div>
          <h1>{snapshot.title}</h1>
          <p className="share-timestamp">
            Shared {new Date(snapshot.sharedAt).toLocaleString()}
            {collaboration
              ? ` · Collaboration expires ${new Date(collaboration.expiresAt).toLocaleString()}`
              : ""}
          </p>
        </div>
        <span className={`share-live-status share-live-status-${connectionState}`}>
          {statusText}
        </span>
      </div>
      <div className="share-timeline">
        {entries.map((entry) => (
          <TimelineEntry key={`${entry.seqStart}-${entry.seqEnd}`} item={entry.item} />
        ))}
      </div>
      {collaboration ? (
        <form className="share-composer" onSubmit={handleSubmit}>
          {composerNote ? <p className="share-composer-note">{composerNote}</p> : null}
          {connectionError ? <p className="share-composer-error">{connectionError}</p> : null}
          <textarea
            value={draft}
            onChange={handleDraftChange}
            placeholder="Continue this session…"
            rows={3}
            disabled={expired}
          />
          <div className="share-composer-actions">
            <span>Only this shared session is available through this link.</span>
            <button type="submit" disabled={!canSend}>
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
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
        <span className="share-readonly">
          {state.kind === "ready" && state.snapshot.collaboration
            ? "Collaborative encrypted session"
            : "Read-only snapshot"}
        </span>
      </header>
      {state.kind === "loading" ? <p className="share-state">Decrypting session…</p> : null}
      {state.kind === "error" ? (
        <p className="share-state share-state-error">{state.message}</p>
      ) : null}
      {state.kind === "ready" ? <SharedSession snapshot={state.snapshot} /> : null}
    </main>
  );
}
