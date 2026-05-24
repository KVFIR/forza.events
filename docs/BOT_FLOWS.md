# FORZA.EVENTS Bot — Interaction Flows

All Discord interactions the bot handles, with exact UI copy and navigation targets.

---

## Glossary

| Term | Meaning |
|---|---|
| Embed | Rich Discord message card with title, fields, color, buttons |
| Ephemeral | Reply visible only to the user who triggered the command |
| Modal | Discord native popup form (up to 5 text inputs) |
| Component row | Row of up to 5 buttons or 1 select menu |
| Thread | Auto-created sub-channel attached to the event embed message |
| Event role | Temporary role `event: <name>` given to registered participants |
| Deep link | `discord://channels/{guildId}/{channelId}/{messageId}` — opens Discord desktop to exact location |

---

## 0. Launcher Embed (entry point for all player flows)

The bot posts a persistent **Launcher Embed** in the server's designated `#forza-events` channel.  
This is the **only** UI element players ever see unprompted. Everything branches from here.

Server admins trigger the initial post with `/setup channel #forza-events`.  
To refresh or re-post: `/forza`.

```
🏁  FORZA.EVENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Find and join Forza Horizon 6 community events
right here in Discord — no hunting through channels.

[ 🔍 Browse Events ]  [ ➕ Create Event ]  [ 👤 My Profile ]
```

- `[🔍 Browse Events]` → custom_id `launcher:browse` → opens the event list embed
- `[➕ Create Event]` → custom_id `launcher:create` → opens the Create Event modal
- `[👤 My Profile]` → custom_id `launcher:profile` → ephemeral profile card

If the interacting user has hosted at least one event, the bot also shows:
`[ 📋 My Events ]` → `launcher:my-events`

> **No slash commands are visible to players.** The Launcher is the only entry point.

---

## 1. Create Event

### Trigger
Player clicks `[➕ Create Event]` on the Launcher Embed.

### Step 1 — Modal opens

Discord shows a native modal with these fields:

```
┌─────────────────────────────────────────────┐
│           Create Forza Event                │
│                                             │
│  Event name *                               │
│  ┌─────────────────────────────────────┐   │
│  │ A-Class Street Racing Cup           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Type * (Race / Tournament / Cruise /       │
│           Drift / Meet / Convoy)            │
│  ┌─────────────────────────────────────┐   │
│  │ Race                                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Date & time * (YYYY-MM-DD HH:MM, UTC)     │
│  ┌─────────────────────────────────────┐   │
│  │ 2026-05-10 21:00                    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Car class (D/C/B/A/S1/S2/X/Open)         │
│  ┌─────────────────────────────────────┐   │
│  │ A800                                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Max players & rules (free text)           │
│  ┌─────────────────────────────────────┐   │
│  │ 16 players. No ramming. Collisions  │   │
│  │ on. Street tires allowed.           │   │
│  └─────────────────────────────────────┘   │
│                                             │
│              [Submit]    [Cancel]           │
└─────────────────────────────────────────────┘
```

> **Note:** Discord modals support max 5 fields and text inputs only.  
> Region, platform, voice-required are set via follow-up select menus after submit.

### Step 2 — Follow-up selects (ephemeral, shown to host only)

After modal submit, bot sends an ephemeral message with two select menus:

```
Select region:
[ EU  ▼ ]   options: EU / NA / SA / APAC / Global

Platform:
[ Crossplay  ▼ ]   options: Xbox / PC / Crossplay

Voice channel required?
[ Required  ▼ ]   options: Required / Optional / None

[Confirm & Publish]
```

### Step 3 — Event embed posted in channel

Bot posts embed, creates thread, creates event role.

```
🏁  A-Class Street Racing Cup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅  10 May · 21:00 EEST
🌍  EU · Crossplay
🏎️  Class: A800 · Type: Race
👥  0 / 16 players
🎙️  Voice: Required

📋  Rules
No ramming. Collisions on. Street tires allowed.

🎖️  Host: KVFIR  ·  forza.events/e/a-class-street-racing-cup

─────────────────────────────────
[  Join  ]  [  Rules  ]  [  ⏰ Remind me  ]
```

- Color: `#22d3ee` (cyan — upcoming)
- Thread `#a-class-street-racing-cup` created below the message
- Role `event: A-Class Street Racing Cup` created in guild
- Bot DMs host: *"Your event was created. Manage it with `/host dashboard`."*

---

## 2. Browse Events

### Trigger
Player clicks `[🔍 Browse Events]` on the Launcher Embed.

### Response (ephemeral — visible only to the player who clicked)

```
📋  Upcoming Forza Events
─────────────────────────────────────────────
Filter: [ All types ▼ ]  [ All regions ▼ ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁  A-Class Street Racing Cup
Today 21:00 · EU · 6/16 · A800
[Join]  [Info]

🚗  JDM Night Cruise
Tomorrow 20:00 · EU · 12/20
[Join]  [Info]

🏆  Season 3 Tournament — Round 1
Sat 18:00 · NA · 4/8 · S1
[Join]  [Info]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Page 1/3    [◀ Prev]  [Next ▶]
```

- Filter select menus update the embed in-place (component interaction, no new message)
- Pagination buttons update embed in-place
- [Join] and [Info] on each card are buttons

---

## 3. Join event

### Entry point
Button `[Join]` on any event embed (in Browse list or in the channel).

### Flow

```
User clicks [Join] on the embed
    │
    ├── Already joined?
    │     └── Ephemeral: "You're already registered. [Leave instead?]"
    │
    ├── Event full?
    │     └── Ephemeral: "This event is full. [Join Waitlist]"
    │
    └── OK
          │
          ├── INSERT event_participants
          ├── Assign role: @event: A-Class Street Racing Cup
          ├── Update embed: player count 6/16 → 7/16
          ├── Post in event thread: "**KVFIR** joined the event. (7/16)"
          └── DM user:
                ┌────────────────────────────────────────┐
                │ ✅  You joined A-Class Street Racing Cup│
                │                                        │
                │ 📅  10 May · 21:00 EEST                │
                │ 📍  #a-class-street-racing-cup          │
                │     discord://channels/{g}/{c}         │
                │                                        │
                │ Set a reminder?                        │
                │ [1h before]  [10min before]  [Both]   │
                └────────────────────────────────────────┘
```

---

## 4. Reminder flow

### Entry points
- Buttons in the join confirmation DM (see above)
- Button `[⏰ Remind me]` on event embed (for players who haven't joined yet — join + remind in one step)
- Command `/event join <id> --remind` (shorthand)

### DM choice (if joining without reminder yet)

Bot DMs:

```
⏰  When should I remind you about A-Class Street Racing Cup?

[1 hour before]   [10 min before]   [Both]   [No thanks]
```

User picks → `reminder_offsets` updated in DB → confirmation:

```
✅  Reminder set. I'll DM you before the event starts.
```

### Reminder DM at scheduled time

```
🏎️  FORZA.EVENTS Reminder

A-Class Street Racing Cup starts in 10 minutes.

📍  Check in now:
    [ Check in ]  (links to /event checkin command)

🔊  Join voice:
    discord://channels/{guildId}/{voiceChannelId}

📜  #a-class-street-racing-cup:
    discord://channels/{guildId}/{threadId}
```

Both links open Discord desktop and navigate directly to the target.

---

## 5. Check-in

### Trigger
Bot automatically opens check-in 30 minutes before event start.

Bot posts in event thread:

```
🟢  Check-in is now open for A-Class Street Racing Cup

The event starts in 30 minutes.
Registered players — check in below.
If you don't check in, your spot may be given to a waitlist player.

[ ✅ Check In ]
```

Players click the button. No command needed.

### On check-in

- `checked_in = true` recorded in DB
- Bot replies ephemeral: *"Checked in. See you on track!"*
- Post in thread: *"**KVFIR** checked in. (5/16 checked in)"*

### At event start time

Bot posts in thread:

```
🏁  A-Class Street Racing Cup is starting now!

Checked in: 12 / 16
No-shows recorded: 4

🔊  Join voice now:
    discord://channels/{guildId}/{voiceChannelId}

Good luck and race clean. 🤝
```

No-shows (registered but not checked in) have their `no_shows` counter incremented.

---

## 6. Submit Results

### Trigger
Host clicks `[Submit Results]` button in the event thread (appears automatically after event start time).  
No slash command — host must be in the thread to see the button.

### Modal

```
┌──────────────────────────────────────┐
│        Submit Event Results          │
│                                      │
│  1st place (Discord username)        │
│  ┌──────────────────────────────┐   │
│  │ KVFIR                        │   │
│  └──────────────────────────────┘   │
│                                      │
│  2nd place                           │
│  ┌──────────────────────────────┐   │
│  │ NightDriver                  │   │
│  └──────────────────────────────┘   │
│                                      │
│  3rd place                           │
│  ┌──────────────────────────────┐   │
│  │ HorizonLV                    │   │
│  └──────────────────────────────┘   │
│                                      │
│  Notes (optional)                    │
│  ┌──────────────────────────────┐   │
│  │ Great event, clean racing    │   │
│  └──────────────────────────────┘   │
│                                      │
│          [Submit]   [Cancel]         │
└──────────────────────────────────────┘
```

> MVP: top 3 manually entered. Future: full standings via repeated command or web form.

### Result embed posted in thread

```
🏆  A-Class Street Racing Cup — Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🥇  KVFIR
🥈  NightDriver
🥉  HorizonLV

Great event, clean racing.

Hosted by: KVFIR
Participants: 12 / 16 checked in

forza.events/e/a-class-street-racing-cup
```

Color: `#a855f7` (purple — completed)

Thread archived, event role removed from all members.

---

## 7. Profile

### Entry points
- Button `[👤 My Profile]` on the Launcher Embed → own profile (ephemeral)
- Right-click any user → **Apps** → **View Forza Profile** → their profile (ephemeral)

### Response (ephemeral, shown only to the player who clicked)

```
👤  KVFIR
━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮  Xbox GT: KVFIR
🌍  Region: EU
⏰  Timezone: UTC+3

📊  Stats
Events joined:     63
Events hosted:     14
Attendance rate:   92%
No-shows:           2
Avg rating by hosts: 4.7 / 5.0

🏎️  Preferred types: Street · Cruise · Drift
📅  Member since: March 2026

[ Edit profile ]   (ephemeral select menu)
```

### Viewing another user's profile

Right-click user → **Apps** → **View Forza Profile** — same card without "Edit profile" button.

### Editing profile

Button `[Edit profile]` on own profile card → select menu:

```
What would you like to update?
[ Xbox Gamertag ]  [ Region ]  [ Timezone ]  [ Preferred types ]
```

Each option opens a modal or a short select menu. No slash commands.

---

## 8. Event thread lifecycle

```
Event created
    └─► Thread created: #a-class-street-racing-cup
        └─► Bot intro post:
              "This is the event thread for A-Class Street Racing Cup.
               📅 10 May · 21:00 EEST
               Host will use this thread for updates and coordination."

-30 min → Check-in message posted
At start → Go-live message + voice deep link
After end → Host submits results → result embed
+2h after end → Thread archived (or locked with banner: "Event ended")
```

---

## 9. Cancel event

Host only. Triggered by button `[Cancel Event]` in the event thread or host dashboard.

```
Bot (ephemeral): ⚠️ This will cancel A-Class Street Racing Cup
and notify all 12 registered participants. Continue?

[Yes, cancel]  [No]
```

On confirm:

- Event status → `cancelled`
- DM all participants: *"A-Class Street Racing Cup has been cancelled by the host."*
- Edit original embed: color `#ef4444` (red), title prepended with `[CANCELLED]`
- Post in thread: *"Event cancelled."*
- Thread locked, role removed

---

## 10. Deep links reference

Whenever the bot needs to direct a user to a specific Discord location:

| Target | Link format |
|---|---|
| Specific channel | `discord://channels/{guildId}/{channelId}` |
| Specific thread | `discord://channels/{guildId}/{threadId}` |
| Specific voice channel | `discord://channels/{guildId}/{voiceChannelId}` |
| Specific message | `discord://channels/{guildId}/{channelId}/{messageId}` |

In embeds, these are rendered as hyperlinks (Discord renders `discord://` links as clickable on desktop). On mobile, they fall back to web URL `https://discord.com/channels/...`.

Bot always includes both the `discord://` deep link and the human-readable channel name (`#a-class-street-racing-cup`) so mobile users can navigate manually.

---

## 11. Error states

| Situation | Bot response |
|---|---|
| User not in guild | Ephemeral: "You must be in the server to join this event." |
| Event not found | Ephemeral: "Event not found or has ended." |
| Not the host | Ephemeral: "Only the event host can do this." |
| Event already started | Ephemeral: "This event has already started." |
| Event cancelled | Ephemeral: "This event was cancelled." |
| DMs disabled by user | Bot posts ephemeral in-channel instead |
| Bot missing permissions | Bot posts in channel: "I need Manage Roles permission to assign event roles." |
| DB error | Ephemeral: "Something went wrong. Try again in a moment." |

---

## 12. Multi-server behaviour

The bot can be added to multiple Discord guilds independently.

- Each guild has its own row in `discord_guilds`
- Server admins run `/setup channel #forza-events` — bot posts the Launcher Embed there
- Events are guild-scoped — Browse Events shows only events from the current guild
- A future "global search" (button on Launcher: `[🌐 All Servers]`) is planned for post-MVP

### Admin slash commands (not visible to regular players)

```
/setup channel #channel     Post Launcher Embed in channel, save as default
/setup role-prefix "evt:"   Change event role prefix (default: "event: ")
/setup cleanup 2h           Auto-archive threads N hours after event ends
/forza                      Re-post or refresh the Launcher Embed
/ping                       Health check
```

---

## Embed color legend

| Color | Hex | Meaning |
|---|---|---|
| Cyan | `#22d3ee` | Upcoming / open for registration |
| Yellow | `#eab308` | Check-in open / event starting soon |
| Green | `#22c55e` | Event live |
| Purple | `#a855f7` | Completed / results posted |
| Red | `#ef4444` | Cancelled |
| Gray | `#6b7280` | Archived |
