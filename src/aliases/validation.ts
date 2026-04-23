export const MAX_ALIASES = 50;
export const MAX_VALUE_LENGTH = 400;
export const MAX_PAYLOAD_BYTES = 8 * 1024;

export const RESERVED_COMMANDS = new Set([
  "help", "h", "roll", "r", "power", "p",
  "duality", "dh", "hope", "fear",
  "alias", "aliases", "unalias",
  "diceplus",
]);

export const NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{0,30}$/;

export type AliasError =
  | { type: "invalid_name" }
  | { type: "reserved"; name: string }
  | { type: "limit_reached" }
  | { type: "value_too_long" }
  | { type: "payload_too_large" }
  | { type: "empty_value" }
  | { type: "not_found"; name: string };

export function validateAliasName(name: string): AliasError | null {
  if (!NAME_REGEX.test(name)) return { type: "invalid_name" };
  if (RESERVED_COMMANDS.has(name.toLowerCase())) return { type: "reserved", name };
  return null;
}

export function aliasErrorMessage(err: AliasError): string {
  switch (err.type) {
    case "invalid_name":
      return "Invalid alias name. Must start with a letter, use only letters/numbers/dashes/underscores, max 31 characters.";
    case "reserved":
      return `Cannot alias reserved command: ${err.name}`;
    case "limit_reached":
      return `Alias limit reached (${MAX_ALIASES}). Use /unalias to remove one first.`;
    case "value_too_long":
      return `Alias command too long (max ${MAX_VALUE_LENGTH} characters).`;
    case "payload_too_large":
      return "Alias storage full. Remove some aliases first.";
    case "empty_value":
      return "Alias command cannot be empty.";
    case "not_found":
      return `Alias not found: ${err.name}`;
  }
}
