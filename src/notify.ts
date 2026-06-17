import { ChatMessage } from "./types";

/**
 * Decide whether an incoming chat message should raise a closed-panel
 * notification popover.
 *
 * Pure (all inputs are parameters, no closure or globals) so it can be
 * unit-tested without the OBR runtime.
 */
export function shouldNotify(msg: ChatMessage, myId: string, chatIsOpen: boolean): boolean {
  // Never notify about our own messages, or anything while the chat panel is open.
  if (msg.playerId === myId || chatIsOpen) return false;
  // Dice+ renders its own 3D dice for everyone, so a chat popover is redundant.
  if (msg.type === "roll" && msg.source === "dicePlus") return false;
  return true;
}

/**
 * Build the absolute notification.html URL, honoring the Vite base path
 * (e.g. "/hoot-chat/" on GitHub Pages) so the popover resolves off the
 * deployed base rather than the bare site root.
 *
 * Environment values (origin, base) are passed in rather than read from
 * `window`/`import.meta.env` so this stays a pure, testable function.
 */
export function buildNotificationUrl(origin: string, baseUrl: string): string {
  return new URL("notification.html", origin + baseUrl).href;
}
