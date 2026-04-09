export interface RollDie {
  type: string; // "D6", "D10", "D20", etc.
  value: number;
}

interface ChatMessageBase {
  id: string; // short random identifier, e.g. 8-char base36
  playerId: string;
  playerName: string;
  playerColor: string;
  timestamp: number;
}

export interface TextMessage extends ChatMessageBase {
  type: "text";
  text: string;
}

export interface RollMessage extends ChatMessageBase {
  type: "roll";
  dice: RollDie[];
  bonus: number;
  netEdges?: number; // present on power rolls
  hasSkill?: boolean; // present on power rolls when applicable skill used
}

export type ChatMessage = TextMessage | RollMessage;
