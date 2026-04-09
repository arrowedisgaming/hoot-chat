import { useEffect, useRef, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { ChatMessage, RollDie } from "./types";

const DICE_PREFIX = "rodeo.owlbear.dice/";
const CHAT_STATUS_CHANNEL = "com.hootchat/chat-status";
const STATUS_REQUEST_CHANNEL = "com.hootchat/status-request";
const MSG_BROADCAST_CHANNEL = "com.hootchat/message";
const HISTORY_KEY = "com.hootchat/history";
const HISTORY_MAX_BYTES = 4 * 1024;

// --- helpers ---

function hexLuminance(hex: string): number {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return 1;
  const [r, g, b] = m.map((x) => {
    const s = parseInt(x, 16) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function nameStyle(color: string): React.CSSProperties {
  return hexLuminance(color) < 0.1
    ? {
        color,
        background: "rgba(255,255,255,0.30)",
        borderRadius: "3px",
        padding: "0 3px",
      }
    : { color };
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function msgKey(m: ChatMessage): string {
  return m.id;
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function parsePowerRoll(args: string): { dice: RollDie[]; bonus: number; netEdges: number; hasSkill: boolean } | null {
  let s = args.toLowerCase().trim();

  // Extract optional leading bonus: +N, -N, or N
  let bonus = 0;
  const bonusMatch = s.match(/^([+-]?\d+)\s*/);
  if (bonusMatch) {
    bonus = parseInt(bonusMatch[1]);
    s = s.slice(bonusMatch[0].length);
  }

  // Extract edge/bane (check doubles first)
  let netEdges = 0;
  if (s.includes("double edge") || /\bde\b/.test(s)) {
    netEdges =  2; s = s.replace("double edge", "").replace(/\bde\b/, "");
  } else if (s.includes("double bane") || /\bdb\b/.test(s)) {
    netEdges = -2; s = s.replace("double bane", "").replace(/\bdb\b/, "");
  } else if (s.includes("edge") || /\be\b/.test(s)) {
    netEdges =  1; s = s.replace("edge", "").replace(/\be\b/, "");
  } else if (s.includes("bane") || /\bb\b/.test(s)) {
    netEdges = -1; s = s.replace("bane", "").replace(/\bb\b/, "");
  }

  // Extract skill
  let hasSkill = false;
  if (s.includes("skill") || /\bs\b/.test(s)) {
    hasSkill = true; s = s.replace("skill", "").replace(/\bs\b/, "");
  }

  // Reject unrecognized tokens
  if (s.replace(/\s+/g, "").length > 0) return null;

  const dice: RollDie[] = [
    { type: "D10", value: Math.ceil(Math.random() * 10) },
    { type: "D10", value: Math.ceil(Math.random() * 10) },
  ];

  return { dice, bonus, netEdges, hasSkill };
}

function parseAndRoll(notation: string): { dice: RollDie[]; bonus: number } | null {
  const s = notation.replace(/\s+/g, "");
  if (!s) return null;

  const tokens = s.split(/(?=[+-])/).filter(Boolean);
  const dice: RollDie[] = [];
  let bonus = 0;

  for (const token of tokens) {
    const sign = token.startsWith("-") ? -1 : 1;
    const part = token.replace(/^[+-]/, "");
    const diceMatch = part.match(/^(\d*)d(\d+)$/i);
    if (diceMatch) {
      if (sign < 0) return null; // negative dice groups not supported
      const count = parseInt(diceMatch[1] || "1");
      const sides = parseInt(diceMatch[2]);
      if (count < 1 || count > 100 || sides < 2 || sides > 10000) return null;
      const type = `D${sides}`;
      for (let i = 0; i < count; i++) {
        dice.push({ type, value: Math.ceil(Math.random() * sides) });
      }
    } else {
      const num = parseInt(part);
      if (isNaN(num) || part === "") return null;
      bonus += sign * num;
    }
  }

  return dice.length > 0 ? { dice, bonus } : null;
}

function powerRollLabel(netEdges: number, hasSkill: boolean): string {
  const edgePart =
    netEdges === 1 ? "an edge" :
    netEdges === 2 ? "a double edge" :
    netEdges === -1 ? "a bane" :
    netEdges === -2 ? "a double bane" : "";
  if (edgePart && hasSkill) return ` with ${edgePart} and skill`;
  if (edgePart) return ` with ${edgePart}`;
  if (hasSkill) return " with skill";
  return "";
}

function edgeAdj(netEdges: number): number {
  return Math.abs(netEdges) === 1 ? netEdges * 2 : 0;
}

function powerRollTier(total: number, netEdges: number, crit: boolean): number {
  if (crit) return 3;
  const base = total <= 11 ? 1 : total <= 16 ? 2 : 3;
  if (netEdges === 2) return Math.min(3, base + 1);
  if (netEdges === -2) return Math.max(1, base - 1);
  return base;
}

function isCrit(dice: RollDie[]): boolean {
  const d10s = dice.filter((d) => d.type === "D10").map((d) => d.value).sort((a, b) => b - a);
  return d10s.length >= 2 && d10s[0] === 10 && d10s[1] >= 9;
}

function RollDisplay({ msg }: { msg: { dice: RollDie[]; bonus: number; netEdges?: number; hasSkill?: boolean } }) {
  const isPowerRoll = msg.netEdges !== undefined;
  const adj = edgeAdj(msg.netEdges ?? 0);
  const skillBonus = isPowerRoll && msg.hasSkill ? 2 : 0;
  const crit = isPowerRoll && isCrit(msg.dice);
  const total = msg.dice.reduce((sum, d) => sum + d.value, 0)
    + msg.bonus + (isPowerRoll ? adj : 0) + skillBonus;

  // Build grouped notation like "2d10 + 1d6", preserving first-seen order
  const groups: { type: string; count: number }[] = [];
  for (const die of msg.dice) {
    const g = groups.find((g) => g.type === die.type);
    if (g) g.count++;
    else groups.push({ type: die.type, count: 1 });
  }
  const notation = groups.map((g) => `${g.count}${g.type.toLowerCase()}`).join(" + ");

  return (
    <span>
      <span style={{ color: "#888", fontStyle: "italic" }}>
        rolled {notation}
        {isPowerRoll && msg.bonus !== 0 && ` + ${msg.bonus}`}
        {isPowerRoll && powerRollLabel(msg.netEdges!, !!msg.hasSkill)}:{" "}
      </span>
      {msg.dice.map((d, i) => (
        <span key={i}>
          {i > 0 && <span style={{ color: "#555" }}> + </span>}
          <span style={{ fontWeight: 700 }}>{d.value}</span>
        </span>
      ))}
      {(isPowerRoll ? msg.bonus + adj + skillBonus : msg.bonus) !== 0 && (() => {
        const mod = isPowerRoll ? msg.bonus + adj + skillBonus : msg.bonus;
        return <span style={{ color: "#888" }}> ({mod > 0 ? "+ " : "- "}{Math.abs(mod)})</span>;
      })()}
      <span style={{ color: "#555" }}> = </span>
      <span style={{ color: "#a78bfa", fontWeight: 700 }}>{total}</span>
      {isPowerRoll && (
        <>
          <span style={{ color: "#555" }}> | </span>
          <span style={{ background: "#c4b5fd", color: "#1a1a2e", fontWeight: 700, borderRadius: "3px", padding: "0 4px", whiteSpace: "nowrap" }}>Tier {powerRollTier(total, msg.netEdges!, crit)}</span>
          {crit && <> <span style={{ background: "#ef4444", color: "#1a1a2e", fontWeight: 700, borderRadius: "3px", padding: "0 4px" }}>Crit!</span></>}
        </>
      )}
    </span>
  );
}

// --- component ---

export default function App() {
  const [ready, setReady] = useState(false);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [helpEntries, setHelpEntries] = useState<{ anchorId: string; key: number }[]>([]);

  const playerIdRef = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastRollFingerprintRef = useRef<string | null>(null);
  const allMessagesRef = useRef<ChatMessage[]>([]);
  const seenRef = useRef(new Set<string>());
  const isHostRef = useRef(false);

  function writeHistory(messages: ChatMessage[]) {
    if (!isHostRef.current) return;
    // Serialize each message once, then scan from the end to find how many fit
    const parts = messages.map((m) => JSON.stringify(m));
    let bytes = 2; // [ and ]
    let start = parts.length;
    for (let i = parts.length - 1; i >= 0; i--) {
      bytes += parts[i].length + (start < parts.length ? 1 : 0); // +1 for comma
      if (bytes > HISTORY_MAX_BYTES) break;
      start = i;
    }
    OBR.room.setMetadata({ [HISTORY_KEY]: messages.slice(start) }).catch(console.error);
  }

  function updatePlayerInfo(playerId: string, name: string, color: string) {
    const updated = allMessagesRef.current.map((m) =>
      m.playerId === playerId ? { ...m, playerName: name, playerColor: color } : m
    );
    allMessagesRef.current = updated;
    setAllMessages(updated);
    writeHistory(updated);
  }

  function addMessages(incoming: ChatMessage[]) {
    const newMsgs = incoming.filter((m) => !seenRef.current.has(msgKey(m)));
    if (newMsgs.length === 0) return;
    newMsgs.forEach((m) => seenRef.current.add(msgKey(m)));
    const updated = [...allMessagesRef.current, ...newMsgs];
    allMessagesRef.current = updated;
    setAllMessages(updated);
    writeHistory(updated);
  }

  const sendOpen = () =>
    OBR.broadcast
      .sendMessage(CHAT_STATUS_CHANNEL, "open", { destination: "LOCAL" })
      .catch(console.error);

  const sendClosed = () =>
    OBR.broadcast
      .sendMessage(CHAT_STATUS_CHANNEL, "closed", { destination: "LOCAL" })
      .catch(console.error);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    OBR.onReady(async () => {
      const isOpen = await OBR.action.isOpen();
      if (isOpen) sendOpen();

      unsubs.push(OBR.action.onOpenChange((open) => {
        if (open) sendOpen(); else sendClosed();
      }));

      unsubs.push(
        OBR.broadcast.onMessage(STATUS_REQUEST_CHANNEL, async () => {
          if (await OBR.action.isOpen()) sendOpen();
        })
      );

      playerIdRef.current = await OBR.player.getId();
      const playerNameSnapshot = await OBR.player.getName();
      const playerColorSnapshot = await OBR.player.getColor();

      // Load history from metadata for cold-start scrollback
      const meta = await OBR.room.getMetadata();
      const history = Array.isArray(meta[HISTORY_KEY]) ? (meta[HISTORY_KEY] as ChatMessage[]) : [];
      addMessages(history);

      // Determine initial host (player with lexicographically lowest ID)
      const party = await OBR.party.getPlayers();
      const allIds = [playerIdRef.current, ...party.map((p) => p.id)];
      isHostRef.current = playerIdRef.current === [...allIds].sort()[0];


      // Receive messages from other clients (and echoed own messages)
      unsubs.push(OBR.broadcast.onMessage(MSG_BROADCAST_CHANNEL, (event) => {
        if (event.data) addMessages([event.data as ChatMessage]);
      }));

      unsubs.push(
        OBR.party.onChange((party) => {
          const allIds = [playerIdRef.current, ...party.map((p) => p.id)];
          isHostRef.current = playerIdRef.current === [...allIds].sort()[0];
          for (const p of party) updatePlayerInfo(p.id, p.name, p.color);
        })
      );

      let lastName = playerNameSnapshot;
      let lastColor = playerColorSnapshot;
      unsubs.push(
        OBR.player.onChange((player) => {
          if (player.name === lastName && player.color === lastColor) return;
          lastName = player.name;
          lastColor = player.color;
          updatePlayerInfo(playerIdRef.current, player.name, player.color);
        })
      );

      unsubs.push(
        OBR.player.onChange((player) => {
          const rawValues = player.metadata[DICE_PREFIX + "rollValues"] as
            | Record<string, number | null>
            | undefined;
          if (!rawValues) {
            lastRollFingerprintRef.current = null;
            return;
          }

          const entries = Object.entries(rawValues);
          if (entries.length === 0) return;

          if (entries.some(([, v]) => v === null)) {
            lastRollFingerprintRef.current = null;
            return;
          }

          const values = rawValues as Record<string, number>;

          type RawDie = { id: string; type: string } | { dice: Array<{ id: string; type: string }> };
          const rawRoll = player.metadata[DICE_PREFIX + "roll"] as
            | {
                dice: Array<RawDie>;
                bonus: number;
                hidden: boolean;
                specialRollData?: { type: string; bonus: number; netEdges: number; hasSkill?: boolean };
              }
            | undefined;
          if (!rawRoll || rawRoll.hidden) return;

          const fingerprint = entries
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([id, v]) => `${id}:${v}`)
            .join(",");
          if (fingerprint === lastRollFingerprintRef.current) return;
          lastRollFingerprintRef.current = fingerprint;

          const dice: RollDie[] = rawRoll.dice.flatMap((d) => {
            if ("dice" in d) {
              // Grouped die (d100): inner D100 gives tens (0,10,…,90), inner D10 gives ones (0–9).
              // Sum to 0 is the conventional 100.
              const sum = d.dice.reduce((acc, inner) => acc + (values[inner.id] ?? 0), 0);
              return [{ type: "D100", value: sum === 0 ? 100 : sum }];
            }
            const flat = d as { id: string; type: string };
            const raw = values[flat.id];
            // D10 encodes a result of 10 as 0
            const value = flat.type === "D10" && raw === 0 ? 10 : raw;
            return [{ type: flat.type, value }];
          });
          const netEdges = rawRoll.specialRollData?.type === "POWER_ROLL"
            ? rawRoll.specialRollData.netEdges
            : undefined;
          // For power rolls use specialRollData.bonus (character attribute bonus
          // only), not rawRoll.bonus which folds in the edge/bane adjustment.
          const bonus = netEdges !== undefined
            ? (rawRoll.specialRollData?.bonus ?? 0)
            : rawRoll.bonus;
          const hasSkill = rawRoll.specialRollData?.hasSkill ?? false;
          sendRoll(dice, bonus, netEdges, hasSkill).catch(console.error);
        })
      );

      setReady(true);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [ready]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [allMessages[allMessages.length - 1]?.id]);

  useEffect(() => {
    if (helpEntries.length > 0) bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [helpEntries.length]);

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;

    if (text === "/help" || text === "/h") {
      setHelpEntries((prev) => [...prev, { anchorId: allMessagesRef.current[allMessagesRef.current.length - 1]?.id ?? "", key: Date.now() }]);
      setInput("");
      return;
    }

    const normalized = text.replace(/^\/r\b/, "/roll").replace(/^\/p\b/, "/power");

    if (normalized.startsWith("/roll")) {
      const result = parseAndRoll(normalized.slice(5).trim());
      if (!result) return;
      setInput("");
      sendRoll(result.dice, result.bonus).catch(console.error);
      return;
    }

    if (normalized.startsWith("/power")) {
      const result = parsePowerRoll(normalized.slice(6).trim());
      if (!result) return;
      setInput("");
      sendRoll(result.dice, result.bonus, result.netEdges, result.hasSkill).catch(console.error);
      return;
    }

    setInput("");

    const msg: ChatMessage = {
      id: newId(),
      playerId: playerIdRef.current,
      playerName: await OBR.player.getName(),
      playerColor: await OBR.player.getColor(),
      type: "text",
      text,
      timestamp: Date.now(),
    };

    addMessages([msg]);
    OBR.broadcast.sendMessage(MSG_BROADCAST_CHANNEL, msg).catch(console.error);
  }

  async function sendRoll(dice: RollDie[], bonus: number, netEdges?: number, hasSkill?: boolean) {
    const msg: ChatMessage = {
      id: newId(),
      playerId: playerIdRef.current,
      playerName: await OBR.player.getName(),
      playerColor: await OBR.player.getColor(),
      type: "roll",
      dice,
      bonus,
      ...(netEdges !== undefined && { netEdges }),
      ...(hasSkill && { hasSkill }),
      timestamp: Date.now(),
    };

    addMessages([msg]);
    OBR.broadcast.sendMessage(MSG_BROADCAST_CHANNEL, msg).catch(console.error);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!ready) {
    return <div style={styles.loading}>Connecting…</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.messageList}>
        {allMessages.length === 0 && helpEntries.length === 0 && (
          <div style={styles.empty}>No messages yet. Say hello!</div>
        )}
        {(() => {
          // Build a map from anchorId -> help keys to insert after that message.
          // anchorId "" means insert before all messages.
          const helpAfter = new Map<string, number[]>();
          for (const { anchorId, key } of helpEntries) {
            const list = helpAfter.get(anchorId) ?? [];
            list.push(key);
            helpAfter.set(anchorId, list);
          }
          const helpCard = (key: number) => (
            <div key={`help-${key}`} style={styles.helpCard}>
              <div style={styles.helpHeader}>
                <span style={styles.helpTitle}>Commands</span>
              </div>
              <div style={styles.helpSection}>
                <div><code style={styles.helpCmd}>/roll</code> <span style={styles.helpAlias}>(or /r)</span></div>
                <div style={styles.helpIndent}>
                  <div style={styles.helpExample}>/roll 2d6+3 &nbsp;·&nbsp; /r 1d20 &nbsp;·&nbsp; /r 3d8 + 1d4</div>
                  Roll dice
                </div>
              </div>
              <div style={styles.helpSection}>
                <div><code style={styles.helpCmd}>/power</code> <span style={styles.helpAlias}>(or /p)</span></div>
                <div style={styles.helpIndent}>
                  <div style={styles.helpExample}>/power +3 edge &nbsp;·&nbsp; /p 2 db &nbsp;·&nbsp; /p 2 skill</div>
                  Power roll (2d10)
                  <div style={styles.helpOptions}>
                    <span><code style={styles.helpCmd}>+[x]</code> or <code style={styles.helpCmd}>[x]</code> &nbsp; add characteristic bonus</span>
                    <span><code style={styles.helpCmd}>edge</code> or <code style={styles.helpCmd}>e</code> &nbsp; | &nbsp; <code style={styles.helpCmd}>double edge</code> or <code style={styles.helpCmd}>de</code></span>
                    <span><code style={styles.helpCmd}>bane</code> or <code style={styles.helpCmd}>b</code> &nbsp; | &nbsp; <code style={styles.helpCmd}>double bane</code> or <code style={styles.helpCmd}>db</code></span>
                    <span><code style={styles.helpCmd}>skill</code> or <code style={styles.helpCmd}>s</code> &nbsp; adds +2 bonus for relevant skill</span>
                  </div>
                </div>
              </div>
            </div>
          );
          const items: React.ReactNode[] = [];
          for (const key of helpAfter.get("") ?? []) items.push(helpCard(key));
          for (const msg of allMessages) {
            items.push(
              <div key={msg.id} style={styles.message}>
                <span style={{ ...styles.name, ...nameStyle(msg.playerColor) }}>
                  {msg.playerName}
                </span>
                <span style={styles.time}>{formatTime(msg.timestamp)}</span>
                <div style={styles.text}>
                  {msg.type === "roll" ? <RollDisplay msg={msg} /> : msg.text}
                </div>
              </div>
            );
            for (const key of helpAfter.get(msg.id) ?? []) items.push(helpCard(key));
          }
          return items;
        })()}
        <div ref={bottomRef} />
      </div>
      <div style={styles.inputRow}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          maxLength={500}
          autoFocus
        />
        <button style={styles.button} onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  },
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    color: "#888",
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  empty: {
    color: "#666",
    textAlign: "center",
    marginTop: "40px",
  },
  helpCard: {
    background: "rgba(91, 91, 214, 0.12)",
    border: "1px solid rgba(91, 91, 214, 0.35)",
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "13px",
    color: "#aaa",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  helpHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  helpTitle: {
    color: "#c4b5fd",
    fontWeight: 700,
    fontSize: "14px",
  },
  helpSection: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  helpCmd: {
    color: "#c4b5fd",
    fontFamily: "monospace",
    background: "rgba(196,181,253,0.1)",
    borderRadius: "3px",
    padding: "0 3px",
  },
  helpAlias: {
    color: "#666",
    fontSize: "12px",
  },
  helpIndent: {
    paddingLeft: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  helpExample: {
    color: "#666",
    fontFamily: "monospace",
    fontSize: "12px",
  },
  helpOptions: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    fontSize: "12px",
    color: "#666",
  },
  message: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gridTemplateRows: "auto auto",
    gap: "2px 8px",
  },
  name: {
    fontWeight: 800,
    fontSize: "12px",
    justifySelf: "start",
  },
  time: {
    color: "#666",
    fontSize: "11px",
    alignSelf: "center",
  },
  text: {
    gridColumn: "1 / -1",
    color: "#d0d0d0",
    lineHeight: 1.4,
    wordBreak: "break-word",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    padding: "10px",
    borderTop: "1px solid #2a2a4a",
    background: "#12121e",
  },
  input: {
    flex: 1,
    background: "#2a2a4a",
    border: "1px solid #3a3a5a",
    borderRadius: "6px",
    padding: "8px 10px",
    color: "#e0e0e0",
    fontSize: "14px",
    outline: "none",
  },
  button: {
    background: "#5b5bd6",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
  },
};
