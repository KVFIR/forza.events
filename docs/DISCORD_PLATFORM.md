# Discord Platform — Research Notes

Last updated: May 2026  
Sources: docs.discord.com, discord.com/blog, github.com/discord/embedded-app-sdk

---

## What a Discord Activity is

A Discord Activity is a **web application (HTML/JS/CSS) that runs inside Discord as an iframe**.  
It works on desktop, mobile, and the web version of Discord.  
Communication with the Discord client happens through a `postMessage` protocol wrapped by `@discord/embedded-app-sdk`.

**It is not a bot.** A bot is a separate runtime that can complement an Activity, but it is not the Activity itself.

---

## Where an Activity can launch (2024–2026)

Before September 2024, Activities were **voice-channel only**.

After the “Apps — Now Anywhere on Discord” update (September 2024):

| Location | Status |
|---|---|
| Voice channel | Yes |
| Server text channel | Yes |
| DM | Yes |
| Group DM | Yes |
| App Launcher from anywhere | Yes |

The App Launcher is the shapes button near the chat input in text channels, and in the lower part of the voice-channel UI. It is available on desktop and mobile.

---

## How an Activity launches

There are two primary launch paths.

### 1. Entry Point Command from the App Launcher

When Activities are enabled in the Discord Developer Portal, Discord automatically creates a launch entry point for the app.  
A user opens the App Launcher, finds the app, clicks Launch, and the Activity opens as an iframe.

### 2. Interaction response with `LAUNCH_ACTIVITY`

Any interaction, such as a button click, slash command, or modal submit, can return a `LAUNCH_ACTIVITY` response (type `12`).  
That means a bot or interaction endpoint can post an embed with a button, the user clicks it, and the Activity opens directly inside Discord.

This is the key launch pattern for FORZA.EVENTS: a button on an event embed opens the full Activity experience for that specific event.

---

## User-installed apps

Since 2024, an app can be installed **to a user account**, not only to a server.  
After installation, the user can see the Activity in the App Launcher in **any server and DM**, even where the bot is not installed.  
After the first launch, the app is also added to the user’s recent apps list.

---

## SDK — `@discord/embedded-app-sdk`

GitHub: <https://github.com/discord/embedded-app-sdk>  
npm: `@discord/embedded-app-sdk`

### Version history snapshot

| Version | Date | Notes |
|---|---|---|
| **2.4.1** | March 2026 | Documentation URL fixes |
| **2.4.0** | September 2025 | Internal updates |
| **2.3.1** | September 2025 | Quest command export fix |
| **2.3.0** | September 2025 | Quests commands and events |
| **2.2.0** | August 2025 | Added `ACTIVITY_JOIN` event |
| **2.1.0** | July 2025 | Added `state`, `details`, `large_url`, `small_url` |
| **2.0.0** | March 2025 | Breaking changes; added activity invite, `GetRelationships`, `GetUser`, `RELATIONSHIP_UPDATE` |

### Key SDK commands

- `authorize` / `authenticate` — OAuth flow inside the iframe
- `getInstanceConnectedParticipants` — list participants currently connected to the Activity
- `setActivity` — update Rich Presence
- `openInviteDialog` — invite other users
- `shareLink` — share a link
- `GetUser` — fetch the current Discord user
- `GetRelationships` — fetch the user’s relationships
- `activityInvite` — send an Activity invite

### Key SDK events

- `READY` — Activity is loaded and connected
- `ACTIVITY_JOIN` — a user joined the Activity
- `RELATIONSHIP_UPDATE` — relationship state changed

---

## Activity lifecycle

```text
1. The iframe loads inside Discord
   The URL contains Discord-specific query params

2. The SDK initializes and starts a postMessage handshake

3. A READY payload is received
   -> sdk.ready() resolves

4. Authorization begins with authorize()
   -> Discord OAuth modal
   -> code returned to the Activity

5. The server exchanges the code for an access token

6. authenticate(access_token)
   -> full SDK access is granted

7. The app runs normally
   -> subscribe to events
   -> issue commands
   -> render UI

8. The session ends when the Activity is closed or disconnected
```

---

## Monetization

Discord supports native in-app monetization in supported regions, including:

- **In-App Purchases (IAP)** — one-time purchases and subscriptions
- **Premium Apps** — durable and consumable SKUs

For FORZA.EVENTS, that means a future Pro Host offering could be monetized through Discord directly instead of relying on an external checkout flow.

---

## What this means for FORZA.EVENTS architecture

### Old assumption

A bot-only product built around slash commands, embeds, and buttons.

### Correct model

**Activity-first** — the main product surface is a React application running inside Discord as an iframe.

```text
User in Discord
    ↓
[App Launcher] or [button on event embed]
    ↓
Activity opens inside Discord
    ↓
Full React UI:
  - browse events
  - create events
  - join events
  - manage profile
    ↓
Companion server-side automation handles what the Activity cannot:
  - DM reminders
  - thread creation / archival
  - role management
  - channel embeds
```

### Practical consequence

The Vite + React project is the Activity application.  
It needs `@discord/embedded-app-sdk` on the client and a secure server-side token exchange flow.

The companion bot or server-side Discord automation remains useful, but only for capabilities the Activity cannot perform directly:

- sending DMs
- creating channels or threads
- managing server roles
- running scheduled jobs
- posting or updating channel embeds

---

## Distribution

1. Register the application in the Discord Developer Portal
2. Enable Activities for the application
3. Complete Discord review / verification if discoverability is required
4. Users find the app through search in the App Launcher
5. Rich Presence and user installs help viral discovery across communities
