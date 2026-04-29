import { useCallback, useState } from "react";
import {
  SystemMessage,
  SystemMessageContent,
  SystemMessageKind,
  appendSystemMessage,
  createSystemMessage,
  emptySystemMessages,
} from "./types";

export interface UseSystemMessagesResult {
  systemMessages: SystemMessage[];
  pushSystemMessage: (kind: SystemMessageKind, content: SystemMessageContent) => void;
  clearSystemMessages: () => void;
}

export function useSystemMessages(): UseSystemMessagesResult {
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>(emptySystemMessages);

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
