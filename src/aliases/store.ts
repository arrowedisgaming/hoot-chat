import OBR from "@owlbear-rodeo/sdk";
import { validateAliasName, MAX_ALIASES, MAX_VALUE_LENGTH, MAX_PAYLOAD_BYTES } from "./validation";
export { validateAliasName, aliasErrorMessage } from "./validation";
export type { AliasError } from "./validation";

const ALIASES_KEY = "com.hootchat/aliases";
const LOCAL_ALIASES_KEY = `${ALIASES_KEY}/local`;

function isAliasMap(raw: unknown): raw is Record<string, string> {
  return (
    raw !== null
    && typeof raw === "object"
    && !Array.isArray(raw)
    && Object.values(raw).every((value) => typeof value === "string")
  );
}

function readLocalAliases(): Record<string, string> | undefined {
  try {
    const raw = window.localStorage.getItem(LOCAL_ALIASES_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return isAliasMap(parsed) ? parsed : undefined;
  } catch {
    // localStorage can be unavailable in restricted iframe contexts.
  }
  return undefined;
}

function writeLocalAliases(aliases: Record<string, string>): void {
  try {
    window.localStorage.setItem(LOCAL_ALIASES_KEY, JSON.stringify(aliases));
  } catch {
    // Owlbear metadata remains the fallback when localStorage is unavailable.
  }
}

export async function getAliases(): Promise<Record<string, string>> {
  const localAliases = readLocalAliases();
  if (localAliases) return localAliases;

  const meta = await OBR.player.getMetadata();
  const raw = meta[ALIASES_KEY];
  if (!isAliasMap(raw)) return {};

  writeLocalAliases(raw);
  return raw;
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

  writeLocalAliases(next);
  await OBR.player.setMetadata({ [ALIASES_KEY]: next });
  return null;
}

export async function removeAlias(name: string): Promise<import("./validation").AliasError | null> {
  const aliases = await getAliases();
  if (!(name in aliases)) return { type: "not_found", name };
  const { [name]: _, ...rest } = aliases;
  writeLocalAliases(rest);
  await OBR.player.setMetadata({ [ALIASES_KEY]: rest });
  return null;
}

export async function removeAllAliases(): Promise<void> {
  writeLocalAliases({});
  await OBR.player.setMetadata({ [ALIASES_KEY]: {} });
}
