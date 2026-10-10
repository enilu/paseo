import { type AgentShareSnapshot, sanitizeAgentShareEntries } from "@getpaseo/protocol/agent-share";
import { buildRelayWebSocketUrl } from "@getpaseo/protocol/daemon-endpoints";
import {
  WSOutboundMessageSchema,
  type AgentSnapshotPayload,
  type SessionInboundMessage,
} from "@getpaseo/protocol/messages";
import { createClientChannel, type EncryptedChannel, type Transport } from "@getpaseo/relay/e2ee";

export type CollaborativeShareConnectionState = "connecting" | "online" | "offline" | "error";

export interface CollaborativeAgentShareHandlers {
  onConnectionState(state: CollaborativeShareConnectionState): void;
  onTimeline(entries: AgentShareSnapshot["entries"], agent: AgentSnapshotPayload | null): void;
  onError(message: string): void;
}

export interface CollaborativeAgentShareConnection {
  sendMessage(text: string): Promise<void>;
  close(): void;
}

const POLL_INTERVAL_MS = 1500;
const REQUEST_TIMEOUT_MS = 15000;

export function connectCollaborativeAgentShare(
  collaboration: NonNullable<AgentShareSnapshot["collaboration"]>,
  handlers: CollaborativeAgentShareHandlers,
): CollaborativeAgentShareConnection {
  const url = buildRelayWebSocketUrl({
    endpoint: collaboration.relay.endpoint,
    useTls: collaboration.relay.useTls,
    serverId: collaboration.serverId,
    role: "client",
  });
  const socket = new WebSocket(url);
  socket.binaryType = "arraybuffer";
  let channel: EncryptedChannel | null = null;
  let closed = false;
  let authenticated = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let fetchPending = false;
  const messageRequests = new Map<
    string,
    { resolve: () => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }
  >();

  const reportError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    handlers.onError(message);
    handlers.onConnectionState("error");
  };

  const sendSessionMessage = (message: SessionInboundMessage) => {
    if (!channel?.isOpen()) throw new Error("The shared session is offline");
    return channel.send(JSON.stringify({ type: "session", message }));
  };

  const refresh = async () => {
    if (!authenticated || fetchPending || closed) return;
    fetchPending = true;
    try {
      await sendSessionMessage({
        type: "fetch_agent_timeline_request",
        requestId: crypto.randomUUID(),
        agentId: collaboration.agentId,
        direction: "tail",
        limit: 0,
        projection: "projected",
      });
    } catch (error) {
      fetchPending = false;
      reportError(error);
    }
  };

  const handleMessage = (data: string | ArrayBuffer) => {
    try {
      const text = typeof data === "string" ? data : new TextDecoder().decode(data);
      const message = WSOutboundMessageSchema.parse(JSON.parse(text));
      if (message.type === "hello.rejected") {
        throw new Error("This collaborative share is invalid or has expired.");
      }
      if (message.type !== "session") return;
      if (message.message.type === "status" && message.message.payload.status === "server_info") {
        authenticated = true;
        handlers.onConnectionState("online");
        void refresh();
        pollTimer ??= setInterval(() => void refresh(), POLL_INTERVAL_MS);
        return;
      }
      if (message.message.type === "fetch_agent_timeline_response") {
        fetchPending = false;
        if (message.message.payload.error) throw new Error(message.message.payload.error);
        handlers.onTimeline(
          sanitizeAgentShareEntries(message.message.payload.entries),
          message.message.payload.agent,
        );
        return;
      }
      if (message.message.type === "send_agent_message_response") {
        const pending = messageRequests.get(message.message.payload.requestId);
        if (!pending) return;
        clearTimeout(pending.timeout);
        messageRequests.delete(message.message.payload.requestId);
        if (!message.message.payload.accepted) {
          pending.reject(new Error(message.message.payload.error ?? "Message was not accepted"));
          return;
        }
        pending.resolve();
        void refresh();
        return;
      }
      if (message.message.type === "rpc_error") {
        const pending = messageRequests.get(message.message.payload.requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          messageRequests.delete(message.message.payload.requestId);
          pending.reject(new Error(message.message.payload.error));
        } else {
          throw new Error(message.message.payload.error);
        }
      }
    } catch (error) {
      reportError(error);
    }
  };

  const transport: Transport = {
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason),
    onmessage: null,
    onclose: null,
    onerror: null,
  };
  socket.addEventListener("message", (event) => {
    transport.onmessage?.({
      data: typeof event.data === "string" ? event.data : (event.data as ArrayBuffer),
      isBinary: typeof event.data !== "string",
    });
  });
  socket.addEventListener("close", (event) => {
    transport.onclose?.(event.code, event.reason);
    if (!closed) handlers.onConnectionState("offline");
  });
  socket.addEventListener("error", () => {
    transport.onerror?.(new Error("Unable to connect to the shared session"));
  });
  socket.addEventListener("open", () => {
    void createClientChannel(transport, collaboration.daemonPublicKeyB64, {
      onmessage: handleMessage,
      onclose: () => {
        if (!closed) handlers.onConnectionState("offline");
      },
      onerror: reportError,
    })
      .then((created) => {
        channel = created;
        const sendHello = () => {
          void created
            .send(
              JSON.stringify({
                type: "hello",
                clientId: `agent-share:${crypto.randomUUID()}`,
                clientType: "browser",
                protocolVersion: 1,
                auth: { kind: "agentShare", token: collaboration.accessToken },
              }),
            )
            .catch(reportError);
        };
        if (created.isOpen()) sendHello();
        else created.onTransitionToOpen(sendHello);
        return undefined;
      })
      .catch(reportError);
  });

  handlers.onConnectionState("connecting");

  return {
    sendMessage: async (text) => {
      const trimmed = text.trim();
      if (!trimmed) throw new Error("Enter a message first");
      if (!authenticated) throw new Error("The shared session is not connected");
      const requestId = crypto.randomUUID();
      const result = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          messageRequests.delete(requestId);
          reject(new Error("Message delivery timed out"));
        }, REQUEST_TIMEOUT_MS);
        messageRequests.set(requestId, { resolve, reject, timeout });
      });
      try {
        await sendSessionMessage({
          type: "send_agent_message_request",
          requestId,
          agentId: collaboration.agentId,
          text: trimmed,
          messageId: crypto.randomUUID(),
          activeTurnBehavior: "steer",
          attachments: [],
        });
      } catch (error) {
        const pending = messageRequests.get(requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          messageRequests.delete(requestId);
          pending.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
      return result;
    },
    close: () => {
      closed = true;
      authenticated = false;
      if (pollTimer) clearInterval(pollTimer);
      for (const pending of messageRequests.values()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Shared session closed"));
      }
      messageRequests.clear();
      channel?.close(1000, "Share page closed");
      if (!channel && socket.readyState < WebSocket.CLOSING) socket.close();
    },
  };
}
