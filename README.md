# Bomberman DOM

Bomberman DOM is a multiplayer browser game inspired by the classic Bomberman formula. Two to four players join a shared lobby, start in different corners of a fixed map, place bombs, collect power-ups, and fight until only one player still has lives remaining.

The project is built without Canvas, WebGL, or external frontend frameworks. The game interface is rendered with the custom mini-framework in `fw/`, while the multiplayer layer uses a Node.js WebSocket server.

## Features

- Multiplayer rooms for 2 to 4 players.
- Nickname-based login screen.
- Waiting lobby with player counter and countdown timers.
- WebSocket chat in both lobby and game screens.
- Fixed-size DOM-rendered map visible to every player.
- Static indestructible walls and randomized destructible blocks.
- Safe corner spawn areas for all players.
- Three lives per player, with temporary respawn while lives remain.
- Bomb placement, timed explosions, destructible blocks, and player damage.
- Power-ups dropped from destroyed blocks:
  - Bombs: increases simultaneous bomb capacity.
  - Flames: increases explosion range.
  - Speed: increases movement speed.
- RequestAnimationFrame game loop with FPS display.
- Local test links for opening player slots quickly.

## How The Game Works

When a player opens the game, they first enter a nickname. After joining, they are moved into a lobby. The lobby accepts up to four players.

Once at least two players have joined, a 20 second join window begins. If the room reaches four players before that window ends, the game moves immediately to the ready countdown. Otherwise, after the join window expires, a 10 second countdown starts and then the match begins.

Each player spawns in one of the four map corners. Players move with the arrow keys and place bombs with the space bar. Bombs explode after a short fuse and spread flames in four directions. Explosions stop at walls and destroy the first destructible block they hit. Destroyed blocks may reveal a random power-up.

Every player starts with three lives. When a player is hit by an explosion, they lose one life. If they still have lives remaining, they respawn after a short delay. When only one connected player has lives left, the match ends and the winner is announced.

## Controls

| Key | Action |
| --- | --- |
| Arrow keys | Move |
| Space | Place bomb |
| Chat input + Send | Send a chat message |

## Project Structure

```text
.
+-- backend/
|   +-- app.js          # HTTP static server, WebSocket server, game rooms, match rules
|   +-- src.js          # Map generation and small level helpers
|   +-- moving.js       # Movement helper code from earlier game work
|   +-- package.json    # Backend scripts and dependencies
+-- bomberman-dom/
|   +-- index.html      # Browser entry point
|   +-- src/
|   |   +-- components/ # Reusable DOM view helpers
|   |   +-- game/       # Board building, rendering, input, frame loop
|   |   +-- network/    # WebSocket connection and message sending
|   |   +-- state/      # Client-side shared state
|   |   +-- ui/         # Incremental UI updates
|   |   +-- views/      # Login, lobby, game shell views
|   +-- styles/
|       +-- index.css   # Layout, board, HUD, chat, and responsive styling
+-- fw/
    +-- create-element.mjs
    +-- diffing.mjs
    +-- patching.mjs
    +-- render-elemnt.mjs
    +-- routing.mjs
    +-- state-managment.mjs
```

## Architecture

The application is split into three main layers.

### Custom DOM Framework

The `fw/` folder contains the mini-framework used by the frontend. Views create virtual elements, and `render-elemnt.mjs` applies updates to the real DOM. This keeps the project aligned with the no-framework requirement while still allowing component-style UI code.

### Frontend Client

The browser client lives in `bomberman-dom/src/`.

- `main.js` starts the WebSocket connection, renders the first shell, registers keyboard input, and starts lobby UI updates.
- `views/` contains the main screens: login, lobby, and game.
- `network/connect.js` receives server messages and updates `appState`.
- `game/frame.js` runs the game loop with `requestAnimationFrame`.
- `game/render-board.js` updates the DOM board cells from the latest server state.
- `ui/update-game-ui.js` and `ui/update-lobby-ui.js` keep frequently changing text and HUD values current.

The board is made from normal DOM elements. Each tile is a `.cell`, and players, bombs, explosions, blocks, walls, and power-ups are represented with CSS classes and child elements.

### Backend Server

The backend is a Node.js server in `backend/app.js`.

It has two jobs:

1. Serve the frontend and framework files over HTTP.
2. Manage multiplayer state over WebSockets.

The server owns the authoritative game state: rooms, players, positions, map cells, bombs, explosions, lives, power-ups, countdowns, and winner detection. Clients send intent messages such as `join`, `move`, `bomb`, and `chat`; the server validates them, updates state, and broadcasts the public state back to every player in the room.

## WebSocket Messages

Client to server:

- `join`: joins a room with a nickname.
- `chat`: sends a chat message.
- `move`: requests movement in one direction.
- `bomb`: places a bomb on the player's current tile.

Server to client:

- `joined`: confirms the player's assigned id.
- `joinRejected`: reports invalid nickname or join failure.
- `chat`: broadcasts lobby, game, and system messages.
- `state`: sends the latest public room state.

## Performance Notes

The project follows the performance goals from the Bomberman DOM assignment:

- The game loop uses `requestAnimationFrame`.
- The FPS counter is measured in the client and shown in the HUD.
- The game uses a fixed-size DOM board instead of recreating the whole page for every frame.
- The backend sends compact state snapshots, and the frontend updates visible cells from that state.
- The map is small and fixed, so all players can see the whole arena without camera work.

## Running Locally

Install backend dependencies:

```bash
cd backend
npm install
```

Start the server:

```bash
npm run dev
```

Open the game in your browser:

```text
http://localhost:8000/
```

For local multiplayer testing, use the player slot links on the login screen or open these URLs in separate tabs:

```text
http://localhost:8000/?testPlayer=1
http://localhost:8000/?testPlayer=2
http://localhost:8000/?testPlayer=3
http://localhost:8000/?testPlayer=4
```

To reset local rooms during testing:

```text
http://localhost:8000/reset
```

## Authors

- [Yassin Elhamdi - yelhamdi](https://learn.zone01oujda.ma/intra/oujda/users/5943)
- [Ilyas Mohammed Abid - iabid](https://learn.zone01oujda.ma/intra/oujda/users/3877)
- [Walid Khlifi - wkhlifi](https://learn.zone01oujda.ma/intra/oujda/users/7751)
