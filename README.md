# 🛰️ Sector Zero

> A multiplayer sci-fi tower defense game built with vanilla HTML, CSS, and JavaScript — powered by Supabase, Socket.IO, and Upstash Redis.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Game Systems](#game-systems)
  - [Towers](#towers)
  - [Enemies](#enemies)
  - [Maps / Levels](#maps--levels)
  - [Wave System](#wave-system)
  - [Adaptation System](#adaptation-system)
  - [Daily Modifiers](#daily-modifiers)
  - [Mid-Wave Events](#mid-wave-events)
  - [Synergy System](#synergy-system)
  - [Challenge System](#challenge-system)
  - [Skins & Cosmetics](#skins--cosmetics)
- [Multiplayer](#multiplayer)
- [Progression & Economy](#progression--economy)
- [Backend & Database](#backend--database)
- [Setup & Running Locally](#setup--running-locally)
- [Configuration](#configuration)
- [Architecture Overview](#architecture-overview)

---

## Overview

**Sector Zero** is a browser-based, real-time tower defense game set in space. Players build and upgrade a variety of specialized towers across five increasingly difficult sectors, defend their base HQ from waves of alien enemies, and can team up with friends in cooperative multiplayer.

The game features a rich progression system with XP, levels, unlockable cosmetic skins, an in-game economy powered by **Neon Tokens**, global leaderboards, match history, daily challenges, and an adaptive AI that changes enemy composition based on your playstyle.

---

## Features

| Feature | Description |
|---|---|
| 🗼 **7 Tower Types** | Each with 2 unique upgrade paths (5 levels each) |
| 👾 **13 Enemy Types** | Including air units, bosses, shielded, splitting, and teleporting enemies |
| 🗺️ **5 Sectors (Maps)** | From Easy to OMEGA difficulty, each with a unique path layout |
| 🤝 **Multiplayer Co-op** | Real-time co-op via Socket.IO room codes |
| 🧠 **Adaptive AI** | Enemies evolve based on your strategy |
| 📅 **Daily Modifiers** | A new gameplay twist every day |
| ⚡ **Mid-Wave Events** | Random disruptions like EMP pulses and speed boosts |
| 🔗 **Tower Synergies** | Combo effects for applying burn + slow + railgun |
| 🏆 **Hidden Challenges** | Bonus XP/token multipliers for special playstyles |
| 🎨 **Cosmetic Skins** | Purchasable skins per tower type with rarity tiers |
| 📊 **Leaderboards** | Global rankings stored in Supabase |
| 📜 **Match History** | Full history of completed games per player |
| 🔐 **Auth System** | Email/password sign-up and login via Supabase Auth |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES Modules) |
| **Rendering** | HTML5 Canvas API |
| **Auth & Database** | [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS) |
| **Real-time Multiplayer** | [Socket.IO](https://socket.io) (v4.7.2) |
| **Session Cache** | [Upstash Redis](https://upstash.com) (REST API) |
| **Fonts** | Google Fonts — Orbitron |
| **Backend Server** | Node.js hosted on Render (`sector-zero-server`) |

---

## Project Structure

```
new_tower_defense/
├── index.html              # Single-page app entry point
├── assets/
│   ├── audio/              # Sound effects and music
│   └── base_hq.png         # Base HQ sprite
├── css/
│   ├── main.css            # Global styles, variables, animations
│   ├── base/               # Typography, resets
│   ├── components/         # auth.css, lobby.css, leaderboard.css,
│   │                         notifications.css, tasks.css, tab_overlay.css
│   ├── entities/           # Tower, enemy, troop visual styles
│   ├── layout/             # Grid and layout helpers
│   └── screens/            # Specific screen styles
├── js/
│   ├── config.js           # API URLs and keys
│   ├── main.js             # App boot, auth gate, navigation
│   ├── core/
│   │   ├── Game.js         # Main game loop and state machine (1800 lines)
│   │   ├── Loop.js         # requestAnimationFrame game loop
│   │   ├── Renderer.js     # Canvas setup and rendering orchestrator
│   │   └── AudioManager.js # Web Audio API sound management
│   ├── entities/
│   │   ├── Tower.js        # Tower class: firing, effects, upgrades
│   │   ├── Enemy.js        # Enemy class: pathfinding, status effects
│   │   ├── Projectile.js   # Projectile data class
│   │   └── Troop.js        # Friendly troop class (spawner units)
│   ├── data/
│   │   ├── towers.js       # All tower definitions and upgrade trees
│   │   ├── enemies.js      # All enemy types and stats
│   │   ├── levels.js       # Map sector definitions (paths, difficulty)
│   │   ├── waves.js        # Per-sector wave compositions
│   │   └── SkinsData.js    # Cosmetic skin definitions per tower type
│   ├── managers/
│   │   ├── AdaptationManager.js    # Adaptive enemy AI
│   │   ├── ChallengeManager.js     # Hidden objectives system
│   │   ├── DailyModifier.js        # Daily gameplay twist
│   │   ├── EventManager.js         # Mid-wave random events
│   │   ├── HistoryManager.js       # Match history read/write
│   │   ├── InputHandler.js         # Mouse input
│   │   ├── MapModifier.js          # Dynamic map rule changes
│   │   ├── NotificationManager.js  # In-game toast notifications
│   │   ├── RedisManager.js         # Upstash Redis session helpers
│   │   ├── SecurityManager.js      # Anti-cheat validation
│   │   ├── SynergyManager.js       # Tower combo/synergy logic
│   │   ├── TaskManager.js          # Daily tasks tracking
│   │   └── WaveManager.js          # Wave countdown and spawn control
│   ├── modules/
│   │   ├── PlayerService.js        # Supabase auth + profile CRUD
│   │   ├── ProgressionManager.js   # XP, level-up, token rewards
│   │   ├── RoomService.js          # Multiplayer room creation/join
│   │   ├── StoreService.js         # Skin purchase/equip logic
│   │   └── SupabaseChatModule.js   # Real-time lobby chat
│   ├── render/
│   │   ├── MapRenderer.js          # Draws the tile grid and path
│   │   ├── ProjectileRenderer.js   # Draws bullets and beams
│   │   ├── SkinPreviewRenderer.js  # Renders tower skin previews
│   │   ├── TroopRenderer.js        # Draws friendly troop units
│   │   ├── UIOverlayRenderer.js    # Health bars, status icons on canvas
│   │   ├── towers/                 # Per-tower-type canvas renderers
│   │   └── enemies/                # Per-enemy-type canvas renderers
│   ├── scenes/
│   │   └── SpaceScene.js           # Animated star-field background
│   ├── ui/
│   │   ├── AuthUI.js               # Login, register, password reset
│   │   ├── BuildMenu.js            # Tower placement side panel
│   │   ├── HistoryUI.js            # Match history display
│   │   ├── InventoryUI.js          # Owned skins browser
│   │   ├── LeaderboardUI.js        # Global rankings table
│   │   ├── LobbyUI.js              # Multiplayer lobby panel
│   │   ├── Navigation.js           # Main menu navigation controller
│   │   ├── StoreUI.js              # Skin shop UI
│   │   ├── TaskUI.js               # Daily task progress display
│   │   ├── UIManager.js            # Centralized UI state management
│   │   └── Interface.js            # In-game HUD and overlay control
│   └── utils/
│       └── MathUtils.js            # Shared math helpers
└── database/
    ├── supabase_schema.sql         # Main schema, RLS policies, triggers
    ├── fix_match_history_schema.sql
    ├── harden_history_rls.sql
    └── security_fixes.sql
```

---

## Game Systems

### Towers

There are **7 tower types**, each with two diverging upgrade **Paths (A/B)**, each containing **4 upgrade levels** (levels 2–5). Towers cannot mix paths — once you pick Path A, you cannot upgrade Path B.

| Tower | Cost | Type | Targets | Description |
|---|---|---|---|---|
| **Laser Cannon** | 100 | Combat | Air + Ground | Single-target energy beam. Path A: Solar Overdrive (burn/pierce). Path B: Prism Tech (split/slow/chain) |
| **Gatling Turret** | 250 | Combat | Air + Ground | Rapid-fire kinetic weapon. Path A: Shredder Protocol (damage + fire rate). Path B: Missile Pods (splash/tracking) |
| **Railgun** | 500 | Combat | Ground only | Long-range precision sniper. Path A: Void Assassin (crit/execute). Path B: Arc Caster (stun/chain lightning) |
| **Energy Core** | 300 | Economy | — | Generates credits per interval. Path A: Industrialist (income multiplier). Path B: Command Beacon (buffs nearby towers) |
| **Barracks** | 400 | Spawner | — | Deploys friendly troops to block enemies. Path A: Mech Foundry (tankier mechs). Path B: Drone Swarm (faster/air drones) |
| **Orbital Link** | 800 | Manual | Infinite Range | Player-clicked airstrike. Path A: Precision Strike (orbital cannon beam). Path B: Area Denial (cluster bomb/napalm/nuke) |
| **Flak Turret** | 400 | Combat | Air only | Dedicated anti-air battery. Path A: High Altitude (range/damage). Path B: Rapid Barrage (fire rate/barrage) |

**Key tower effects include:** `burn`, `slow`, `stun`, `split`, `chain`, `splash`, `pierce`, `crit`, `execute`, `buff_range`, `buff_speed`, `buff_damage`, `double_spawn`, `orbital_beam`, `nuke`, `napalm`.

---

### Enemies

There are **13 enemy types** across two categories: standard and adaptive.

**Standard Enemies:**

| Enemy | HP | Speed | Reward | Notes |
|---|---|---|---|---|
| Scout | 5 | Fast (3) | 15 | Weak but speedy |
| Soldier | 12 | Medium (2) | 25 | Balanced |
| Tank | 40 | Slow (1) | 50 | Tough |
| Heavy Mech | 80 | Very slow (0.8) | 100 | High HP |
| Sector Boss | 250 | Crawl (0.5) | 500 | Mini boss |
| Omega Class | 1000 | Crawl (0.3) | 2000 | Mega boss |
| Drone | 8 | Medium (2.5) | 20 | Standard filler |
| Runner | 6 | Very fast (4) | 25 | Speed attacker |

**Adaptive Enemies** (spawned by the Adaptation System):

| Enemy | Special |
|---|---|
| Shielded Drone | Takes 50% less laser damage |
| Teleporter | Immune to slow effects; very fast |
| Splitter | Spawns 2 mini-enemies on death |

**Air Units** (require anti-air towers: Gatling, Laser, Flak):

| Enemy | HP | Speed |
|---|---|---|
| Air Scout | 10 | 3.5 |
| Air Tanker | 60 | 1.2 |

---

### Maps / Levels

There are **5 sectors** with distinct path layouts and difficulty multipliers.

| Sector | Name | Difficulty | Score Multiplier | Notes |
|---|---|---|---|---|
| 1 | Solar Point | EASY | x1.00 | Simple L-shaped path, tutorial area |
| 2 | Deep Space | NORMAL | x1.50 | Multi-turn path |
| 3 | Orbital Lights | HARD | x2.25 | Complex winding path with backtrack |
| 4 | Event Horizon | INSANE | x3.50 | Challenging cross-shaped route |
| 5 | Singularity | OMEGA | x5.00 | One straight deadly line — hardest |

Each sector has a lore **briefing text** shown before the match.

---

### Wave System

- Each sector has a custom wave list defined in `js/data/waves.js`.
- Waves consist of **spawn queues** — ordered lists of enemy type IDs with timed delays between spawns.
- The `WaveManager` handles the countdown timer between waves, and `Game.js` processes the spawn queue tick-by-tick.
- Between waves, players can spend credits to place or upgrade towers.

---

### Adaptation System

The `AdaptationManager` tracks player behavior and dynamically adjusts enemy composition **starting from wave 4**:

| Trigger | Condition | Response |
|---|---|---|
| **Laser Resistance** | >5000 laser damage OR >50% of total damage from laser | Begins spawning **Shielded Drones** (20% of queue) |
| **Slow Immunity** | >3000 slow applications | Begins spawning **Teleporters** (15% of queue) |
| **Heavy Reinforcements** | >20,000 total session damage | Upgrades some **Drones** to **Tanks** (30% chance) |

Additionally, if one tower type deals >40% of total damage, it suffers a **damage penalty** of up to 35%, incentivizing diverse strategies.

---

### Daily Modifiers

Each day a different modifier is active (seeded by the current date), applying a global gameplay twist for all players:

| Modifier | Icon | Effect |
|---|---|---|
| Speed Surge | ⚡ | Enemies move 20% faster |
| Armor Plating | 🛡️ | Enemies have 25% more HP |
| Overcharge | 🔥 | Towers deal 30% more damage |
| Eagle Eye | 👁️ | Towers have 25% more range |
| Credit Crunch | 💸 | Start with 25% fewer credits |
| Swarm Mode | 🐝 | 50% more enemies, each with 30% less HP |
| Double Rewards | 💰 | Enemies drop 2x credits |

---

### Mid-Wave Events

The `EventManager` rolls random events every 30 seconds during active waves:

| Event | Chance | Wave Req. | Effect |
|---|---|---|---|
| **EMP Pulse** | 15% | Wave 3+ | Disables ALL towers for 3 seconds |
| **Shield Generator** | 20% | Wave 2+ | A random enemy gains 50% damage reduction for 10s |
| **Resource Drain** | 10% | Wave 5+ | Instantly drains 10% of current credits |
| **Speed Boost** | 15% | Wave 4+ | All enemies gain +30% speed for 5 seconds |

---

### Synergy System

The `SynergyManager` enables cross-tower combo effects when enemies have stacked status effects:

| Synergy | Condition | Bonus |
|---|---|---|
| **Burn + Rail (Burn Crit)** | Target is burning | Railgun deals +50% crit damage |
| **Slow + Rail (Slow Crit)** | Target is slowed | Railgun guaranteed crit (+25% damage) |
| **Shatter** | Target is burning AND slowed | Any tower deals +75% damage |
| **Ignite Chain** | Target has 5+ burn stacks | Laser deals +20% damage; enemy explodes on death |

---

### Challenge System

The `ChallengeManager` tracks hidden objectives throughout the match. Completing them awards **XP and Neon Token multipliers** on victory:

| Challenge | Icon | Condition | Reward |
|---|---|---|---|
| **Minimalist** | 🎯 | Win using 3 or fewer tower types | +50% XP |
| **Commitment** | 💎 | Never sell a tower | +25% Tokens |
| **Speed Demon** | ⚡ | Win in under 5 minutes | +25% XP & Tokens |
| **Efficient** | 🏆 | Win with 5 or fewer towers placed | +75% XP |
| **Flawless** | ⭐ | Win without losing any lives | +100% XP, +50% Tokens |

Challenges stack — completing multiple grants combined multipliers.

---

### Skins & Cosmetics

Tower skins are **purely cosmetic** and are purchased with **Neon Tokens** earned in-game. Each tower type has skins across 4 rarity tiers:

| Rarity | Cost | Example |
|---|---|---|
| Common | Free | Standard Issue (Gatling), Prism Core (Laser) |
| Rare | 500–1000 | Neon Striker (Gatling), Ghost Ops (Barracks) |
| Epic | 1200–2000 | Crimson Fury (Gatling), Void Ray (Laser) |
| Legendary | 5000 | Golden State (Gatling) |

The skin **store rotation** refreshes every 3 hours (deterministic seed). Owned skins are stored in the player's Supabase profile. Equipping a skin changes the tower's colors and glow effects in the canvas renderer.

---

## Multiplayer

Real-time co-op is powered by **Socket.IO** connected to a Node.js server hosted on Render.

### How it works:
1. A player **creates a room** and gets a 6-character join code.
2. Other players **join the room** by entering the code.
3. The room **host** controls wave start timing.
4. All players build towers on the **shared map** simultaneously.
5. The in-game tab overlay (`Tab` key) shows live stats: damage, kills, base HP, and all connected players.
6. A real-time **lobby chat** (powered by Supabase Realtime) lets players communicate before and during the match.

### Room Lifecycle:
- Rooms are created in the `rooms` table in Supabase.
- Players are linked via the `room_members` table.
- `RoomService.js` handles all room CRUD and join logic.
- `RedisManager.js` uses Upstash Redis to cache session state for low-latency coordination.

---

## Progression & Economy

### In-Match Currency: Credits
- Start with **600 credits** per game.
- Earned by killing enemies (varies by type: 15–2000 per kill).
- Spent on placing and upgrading towers.
- Some upgrades cost up to **6000 credits** (Nuke on Orbital Link).
- Towers can be sold for a **partial refund**.

### Meta Currency: Neon Tokens
- Earned at the end of a match based on performance.
- Multiplied by completed challenges and difficulty modifiers.
- Used to purchase cosmetic skins in the Store.

### XP & Levels
- XP is earned on match completion.
- `ProgressionManager` calculates rewards and levels.
- Level and XP are stored persistently in the player's Supabase profile.

---

## Backend & Database

### Supabase (PostgreSQL)
All persistent data is stored in Supabase. Key tables:

| Table | Purpose |
|---|---|
| `profiles` | Player data: username, XP, level, neon_tokens, unlocked_skins, equipped_skins |
| `rooms` | Active multiplayer game rooms |
| `room_members` | Which players are in which rooms |
| `match_history` | Records of completed games (score, kills, duration, sector, etc.) |

**Row Level Security (RLS)** is enforced on all tables via Supabase policies (see the `database/` folder). Players can only read/write their own data.

### Supabase Auth
- Email/password registration and login.
- Password reset via email link.
- Sessions are persisted in localStorage under the key `sector-zero-session`.
- `PlayerService.js` wraps all Supabase Auth and profile operations.

### Upstash Redis
- Used for lightweight session coordination in multiplayer rooms.
- Accessed via the Upstash REST API.
- Managed by `RedisManager.js`.

### Socket.IO Server
- Hosted separately on Render (`https://sector-zero-server.onrender.com`).
- Handles real-time events: player join/leave, wave sync, tower placement broadcast.

---

## Setup & Running Locally

This is a **pure static frontend** — no build step is needed.

### Prerequisites
- A modern web browser (Chrome/Edge recommended for canvas performance)
- A local HTTP server (to support ES Modules — you cannot open `index.html` directly from the filesystem)

### Quick Start

**Option 1: VS Code Live Server**
1. Install the "Live Server" extension in VS Code.
2. Right-click `index.html` → **Open with Live Server**.

**Option 2: Python HTTP server**
```bash
cd new_tower_defense
python -m http.server 8080
# Open http://localhost:8080
```

**Option 3: Node.js http-server**
```bash
npx http-server . -p 8080 -c-1
# Open http://localhost:8080
```

> **Note:** The game connects to live Supabase and Socket.IO endpoints. You need an active internet connection and a Supabase account to use auth and multiplayer features.

---

## Configuration

All external service endpoints are defined in `js/config.js`:

```js
export const CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key',
    SOCKET_URL: 'https://your-server.onrender.com',
    UPSTASH_REDIS_REST_URL: 'https://your-redis.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'your-redis-token'
};
```

To set up your own backend:
1. Create a [Supabase](https://supabase.com) project and run `database/supabase_schema.sql` in the SQL editor.
2. Deploy a Socket.IO Node.js server on [Render](https://render.com) or similar.
3. Create an [Upstash](https://upstash.com) Redis database.
4. Update `config.js` with your own URLs and keys.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   index.html                     │
│  (Single page app – all screens in one file)    │
└─────────────────┬───────────────────────────────┘
                  │ ES Modules
         ┌────────▼────────┐
         │    main.js      │  Boot, auth gate, screen routing
         └────────┬────────┘
                  │
    ┌─────────────▼────────────────────┐
    │           core/Game.js           │
    │  Central state machine + logic   │
    │  (towers, enemies, waves, etc.)  │
    └──┬──────┬──────┬────────┬────────┘
       │      │      │        │
  Managers  Entities Modules  Render
  (AI, events, (Tower, Enemy, (Supabase, (Canvas
  challenges)  Projectile)  Sockets)  Renderers)
```

Key design decisions:
- **No framework, no bundler.** Pure ES Modules loaded directly by the browser.
- **Single HTML file** with all screens shown/hidden via CSS classes.
- **Canvas rendering** for the gameplay layer; DOM HTML for all menus and HUD.
- **Supabase as backend-as-a-service** — no custom API server needed for persistence.
- **Separation of concerns:** data files (`js/data/`) are pure config objects with no logic, keeping them easy to edit.
