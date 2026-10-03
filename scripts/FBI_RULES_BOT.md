# FBI Rules Discord bot

The `/fbi-rules` slash command posts a public Components V2 panel in the channel with an FBI-sector overview, the section select menu, and the supplied image. Choosing a section sends only that section's explanation as a private Components V2 reply visible to the person who selected it. The public panel stays unchanged.

## Run

1. Add the bot to the Discord server with the `bot` and `applications.commands` scopes. Grant it **Send Messages** and **Attach Files** in the channel where the command will be used.
2. Save the bot token in Replit Secrets as `DISCORD_BOT_TOKEN`. Do not put it in source code or chat.
3. Start the `FBI Rules Bot` workflow, or run:

   ```sh
   pnpm --filter @workspace/scripts run fbi-rules-bot
   ```

4. In a server where the bot is installed, run `/fbi-rules`. Global slash-command registration may take a short time to appear after the first startup.

The bot needs no privileged gateway intents. Keep it running while people use the menu; each selection is answered privately without changing the public panel.

## Change the image

The image provided in chat was a time-limited Discord CDN URL, so the bot uses a saved copy at `scripts/assets/fbi-rules-cover.jpg`. Replace that file with another image and keep the same filename to change the message image.