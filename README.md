# Hoot Chat

A simple chat extension for [Owlbear Rodeo](https://www.owlbear.rodeo/).

Player colors. Dice rolls. Notifications. All the basics!

[Screenshot of a chat window showing player messages, dice rolls, and help output from /help.](/public/example.png)

## Installation

1. In Owlbear Rodeo, open the **Extensions** menu and select **Add Extension**.
2. Enter the manifest URL:
   ```
   https://hoot-chat.pages.dev/manifest.json
   ```
3. The **Hoot Chat** button will appear in the toolbar.

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
