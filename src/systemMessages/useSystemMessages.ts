import { useCallback, useEffect, useState } from "react";
import {
  SystemMessage,
  SystemMessageContent,
  SystemMessageKind,
  appendSystemMessage,
  createSystemMessage,
  emptySystemMessages,
} from "./types";

const LOCAL_SYSTEM_MESSAGES_KEY = "com.hootchat/systemMessages/local";

function isAliasMap(raw: unknown): raw is Record<string, string> {
  return (
    raw !== null
    && typeof raw === "object"
    && !Array.isArray(raw)
    && Object.values(raw).every((value) => typeof value === "string")
  );
}

function isSystemMessageContent(raw: unknown): raw is SystemMessageContent {
  if (raw === null || typeof raw !== "object" || !("type" in raw)) return false;

  if (raw.type === "text") {
    return "text" in raw && typeof raw.text === "string";
  }

  if (raw.type === "aliasList") {
    return "aliases" in raw && isAliasMap(raw.aliases);
  }

  return false;
}

function isSystemMessage(raw: unknown): raw is SystemMessage {
  return (
    raw !== null
    && typeof raw === "object"
    && "id" in raw
    && "timestamp" in raw
    && "kind" in raw
    && "content" in raw
    && typeof raw.id === "string"
    && typeof raw.timestamp === "number"
    && (raw.kind === "info" || raw.kind === "success" || raw.kind === "error")
    && isSystemMessageContent(raw.content)
  );
}

function readLocalSystemMessages(): SystemMessage[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_SYSTEM_MESSAGES_KEY);
    if (!raw) return emptySystemMessages();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSystemMessage) : emptySystemMessages();
  } catch {
    return emptySystemMessages();
  }
}

function writeLocalSystemMessages(messages: SystemMessage[]): void {
  try {
    window.localStorage.setItem(LOCAL_SYSTEM_MESSAGES_KEY, JSON.stringify(messages));
  } catch {
    // System messages are display-only; if localStorage is blocked, they remain session-only.
  }
}

export interface UseSystemMessagesResult {
  systemMessages: SystemMessage[];
  pushSystemMessage: (kind: SystemMessageKind, content: SystemMessageContent) => void;
  clearSystemMessages: () => void;
}

export function useSystemMessages(): UseSystemMessagesResult {
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>(readLocalSystemMessages);

  useEffect(() => {
    writeLocalSystemMessages(systemMessages);
  }, [systemMessages]);

  const pushSystemMessage = useCallback(
    (kind: SystemMessageKind, content: SystemMessageContent) => {
      setSystemMessages((prev) => appendSystemMessage(prev, createSystemMessage(kind, content)));
    },
    [],
  );

  const clearSystemMessages = useCallback(() => {
    setSystemMessages(emptySystemMessages());
  }, []);

  return { systemMessages, pushSystemMessage, clearSystemMessages };
}
