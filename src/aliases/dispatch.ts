/**
 * Expand an alias from user input. Returns the expanded command string
 * (with leading `/`) or null if no alias matched.
 *
 * Expands exactly once — no recursive alias resolution.
 */
export function expandAlias(
  input: string,
  aliases: Record<string, string>,
): string | null {
  if (!input.startsWith("/")) return null;

  const withoutSlash = input.slice(1);
  const spaceIdx = withoutSlash.indexOf(" ");
  const name = spaceIdx === -1 ? withoutSlash : withoutSlash.slice(0, spaceIdx);
  const trailing = spaceIdx === -1 ? "" : withoutSlash.slice(spaceIdx);

  const value = aliases[name];
  if (value === undefined) return null;

  // Ensure the expanded value starts with `/`
  const expanded = value.startsWith("/") ? value : `/${value}`;
  return expanded + trailing;
}
