# Hoot Chat

A simple chat extension for [Owlbear Rodeo](https://www.owlbear.rodeo/).

Player colors. Dice rolls. Notifications. All the basics!

![Screenshot of a chat window showing player messages, dice rolls, and help output from /help.](/public/example.png)

## Installation

1. In Owlbear Rodeo, open the **Extensions** menu and select **Add Extension**.
2. Enter the manifest URL:
   ```
   https://hoot-chat.pages.dev/manifest.json
   ```
3. The **Hoot Chat** button will appear in the toolbar.

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `/roll <notation>` | `/r` | Roll dice (e.g. `2d6+3`, `1d20`, `3d8 + 1d4`) |
| `/power [+N] [edge\|bane] [skill]` | `/p` | Draw Steel power roll (2d10) |
| `/duality [+N] [adv\|dis] [+d6] [# label]` | `/dh` | Daggerheart action roll (2d12 Hope/Fear) |
| `/hope [+N] [# label]` | | Roll a single Hope die (1d12) |
| `/fear [+N] [# label]` | | Roll a single Fear die (1d12) |
| `/alias <name> <command>` | | Save a command alias |
| `/aliases` | | List your saved commands |
| `/unalias <name>` | | Remove a saved command |
| `/dicePlus on\|off\|status` | | Toggle Dice+ 3D dice integration |
| `/help` | `/h` | Show all commands |

### Daggerheart Duality Roll

The `/duality` command rolls 2d12 (Hope + Fear) and determines the outcome:

- **Hope** (Hope die > Fear die) -- amber badge
- **Fear** (Fear die > Hope die) -- red badge
- **CRITICAL** (Hope die = Fear die) -- violet badge with a Stress/Hope reminder

Options: `adv`/`dis` for advantage/disadvantage (adds/subtracts 1d6), `+d6` for Experience dice, `# label` for a roll label.

### Saved Commands (Aliases)

Save frequently used rolls as short aliases:

```
/alias atk /roll 1d20+5
/alias rage /duality +4 adv # Rage attack
/atk                         --> expands to /roll 1d20+5
```

Aliases are per-player (max 50, stored in player metadata). Use `/unalias * confirm` to clear all.

### Dice+ Integration

When the [Dice+](https://extensions.owlbear.rodeo/dice-plus) extension is installed, enable 3D physics dice for `/roll` and `/duality` commands:

```
/dicePlus on       Enable 3D dice
/dicePlus off      Disable (use internal roller)
/dicePlus status   Check current state
```

The setting is per-player. `/power` always uses the internal roller. If Dice+ is not detected, rolls silently fall back to the internal roller.

## Development

```bash
npm install
npm run dev
```

To build for production:

```bash
npm run build
```

Deploy the contents of `dist/` anywhere that can serve static files over HTTPS.

## Tests

```bash
npx tsx test/parseDualityRoll.test.ts
npx tsx test/aliases.test.ts
npx tsx test/dicePlusConvert.test.ts
```

See `test/README.md` for details.
