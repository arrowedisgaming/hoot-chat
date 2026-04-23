import OBR from "@owlbear-rodeo/sdk";
import { validateAliasName, MAX_ALIASES, MAX_VALUE_LENGTH, MAX_PAYLOAD_BYTES } from "./validation";
export { validateAliasName, aliasErrorMessage } from "./validation";
export type { AliasError } from "./validation";

const ALIASES_KEY = "com.hootchat/aliases";

export async function getAliases(): Promise<Record<string, string>> {
  const meta = await OBR.player.getMetadata();
  const raw = meta[ALIASES_KEY];
  return (raw && typeof raw === "object" && !Array.isArray(raw))
    ? raw as Record<string, string>
    : {};
}

export async function setAlias(
  name: string,
  value: string,
): Promise<import("./validation").AliasError | null> {
  const nameErr = validateAliasName(name);
  if (nameErr) return nameErr;

  if (!value.trim()) return { type: "empty_value" };
  if (value.length > MAX_VALUE_LENGTH) return { type: "value_too_long" };

  const aliases = await getAliases();
  if (!(name in aliases) && Object.keys(aliases).length >= MAX_ALIASES) {
    return { type: "limit_reached" };
  }

  const next = { ...aliases, [name]: value };
  if (new TextEncoder().encode(JSON.stringify(next)).length > MAX_PAYLOAD_BYTES) {
    return { type: "payload_too_large" };
  }

  await OBR.player.setMetadata({ [ALIASES_KEY]: next });
  return null;
}

export async function removeAlias(name: string): Promise<import("./validation").AliasError | null> {
  const aliases = await getAliases();
  if (!(name in aliases)) return { type: "not_found", name };
  const { [name]: _, ...rest } = aliases;
  await OBR.player.setMetadata({ [ALIASES_KEY]: rest });
  return null;
}

export async function removeAllAliases(): Promise<void> {
  await OBR.player.setMetadata({ [ALIASES_KEY]: {} });
}
