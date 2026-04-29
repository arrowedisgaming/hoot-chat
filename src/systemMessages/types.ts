// System messages are local-only chat output: confirmations, errors, and
// informational notices that must never be persisted to the room or sent to
// other clients.
//
// This module mirrors the pattern that `/help` already uses in App.tsx:
// it lives in a separate React `useState` array, does not flow through
// `addMessages`, is never written to history via `writeHistory`, and is
// never sent through any broadcast channel.
//
// The hook lives in `./useSystemMessages.ts`. The render component lives in
// App.tsx alongside `RollDisplay` and `DualityDisplay` so display logic stays
// colocated with other in-line message renderers.

export type SystemMessageKind = "info" | "success" | "error";

export type SystemMessageContent =
  | { type: "text"; text: string }
  | { type: "aliasList"; aliases: Record<string, string> };

export interface SystemMessage {
  id: string;
  timestamp: number;
  kind: SystemMessageKind;
  content: SystemMessageContent;
}

function newSystemMessageId(): string {
  return `sys_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createSystemMessage(
  kind: SystemMessageKind,
  content: SystemMessageContent,
): SystemMessage {
  return {
    id: newSystemMessageId(),
    timestamp: Date.now(),
    kind,
    content,
  };
}

export function appendSystemMessage(
  prev: SystemMessage[],
  msg: SystemMessage,
): SystemMessage[] {
  return [...prev, msg];
}

export function emptySystemMessages(): SystemMessage[] {
  return [];
}
